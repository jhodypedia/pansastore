"use server";

import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";

export async function processCheckout(formData: FormData) {
  try {
    // 1. Ekstrak data dari FormData
    const productId = formData.get("productId") as string;
    const variantId = formData.get("variantId") as string | null;
    const targetId = formData.get("targetId") as string; // Email atau WA tergantung tipe produk
    const whatsapp = formData.get("whatsapp") as string;
    const method = (formData.get("method") as string) || "qris";

    // 2. Validasi input dasar
    if (!productId || !whatsapp || !targetId) {
      return {
        success: false,
        message: "Data checkout tidak lengkap. Harap isi semua field wajib.",
      };
    }

    // 3. Tarik data pengaturan aplikasi & produk dari Database secara paralel
    const [settings, product] = await Promise.all([
      prisma.appSetting.findFirst(),
      prisma.product.findUnique({
        where: { id: productId },
      }),
    ]);

    // 4. Validasi Kesiapan Sistem dan Produk
    if (!product) {
      return {
        success: false,
        message: "Produk tidak ditemukan atau tidak tersedia.",
      };
    }

    if (!settings?.pakasirProjectSlug || !settings?.pakasirApiKey) {
      console.error("[Checkout Error]: Kredensial Pakasir belum diatur di database.");
      return {
        success: false,
        message: "Sistem pembayaran sedang dalam gangguan. Hubungi admin.",
      };
    }

    // 5. Siapkan Variabel Transaksi
    const finalPrice = product.sellPrice; 
    
    // Format Invoice: INV-PS-YYMMDD-XXXX (Hex Random)
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, ''); 
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const invoiceId = `INV-PS-${datePrefix}-${randomHex}`;
    
    const premifySkuCode = variantId || product.id;

    // 6. Buat Record Transaksi Pending di Database PansaStore
    await prisma.transaction.create({
      data: {
        invoiceId,
        productCode: premifySkuCode,
        customerPhone: whatsapp,
        amount: finalPrice,
        paymentStatus: "PENDING",
        premifyStatus: "PENDING",
        // Menggunakan productDetails dengan format JSON untuk menghindari error TypeScript
        productDetails: JSON.stringify({
          name: product.name,
          targetId: targetId,
          variant: variantId || "Reguler"
        }),
      },
    });

    // 7. Request QRIS ke Payment Gateway (Pakasir)
    let paymentResult;
    
    if (method.toLowerCase() === "qris") {
      paymentResult = await pakasirSDK.createQris({
        project: settings.pakasirProjectSlug,
        api_key: settings.pakasirApiKey,
        order_id: invoiceId,
        amount: finalPrice,
      });
    } else {
      return {
        success: false,
        message: `Metode pembayaran ${method} belum didukung sistem ini.`,
      };
    }

    // 8. Handle Respons dari Pakasir
    if (paymentResult.ok && paymentResult.data?.payment) {
      
      // Siapkan URL Invoice lokal untuk dikirim ke WhatsApp
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      const invoiceUrl = `${appUrl}/cek-pesanan?invoice=${invoiceId}`;
      
      // Kirim notifikasi pembuatan invoice via Bot WhatsApp Baileys
      try {
        const waMessage = WATemplates.invoiceCreated(
          invoiceId, 
          product.name, 
          targetId, 
          finalPrice.toLocaleString('id-ID'), 
          invoiceUrl
        );
        
        // Asynchronous call agar user tidak menunggu WA terkirim
        sendWhatsAppMessage(whatsapp, waMessage).catch((err) => 
          console.error("Gagal mengirim notifikasi awal WhatsApp Baileys:", err)
        );
      } catch (waError) {
        console.error("Kesalahan template/sistem WhatsApp:", waError);
      }

      return {
        success: true,
        message: "Berhasil menyiapkan pembayaran.",
        payment: paymentResult.data.payment, // Objek ini ditangkap oleh CheckoutClient untuk render QRISInvoice
      };
    } else {
      // Log detail error dari Pakasir ke console server untuk debugging
      console.error("[Checkout Error] Pakasir membalas:", paymentResult.data);
      
      // Update status transaksi di database menjadi FAILED karena gateway menolak
      await prisma.transaction.update({
        where: { invoiceId },
        data: { paymentStatus: "FAILED" },
      });

      return {
        success: false,
        message: paymentResult.data?.message || "Gagal membuat invoice di payment gateway.",
      };
    }

  } catch (error: any) {
    console.error("[Checkout Server Exception]:", error.message || error);
    return {
      success: false,
      message: "Terjadi kesalahan internal saat memproses transaksi.",
    };
  }
}
