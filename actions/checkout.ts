"use server";

import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";
import { pakasirSDK } from "@/lib/pakasir"; // Pastikan path file SDK Pakasir ini sesuai

export async function processCheckout(formData: FormData) {
  try {
    const productId = formData.get("productId") as string;
    const variantId = formData.get("variantId") as string;
    const targetId = formData.get("targetId") as string;
    const whatsapp = formData.get("whatsapp") as string;
    const method = (formData.get("method") as string) || "qris";

    // 1. Validasi Input Dasar Lengkap
    if (!targetId || !whatsapp || !productId) {
      return { success: false, message: "Data tidak lengkap. Harap isi ID Tujuan dan WhatsApp." };
    }

    // 2. Ambil Kredensial API Pakasir dari Database AppSetting
    const settings = await prisma.appSetting.findFirst();
    if (!settings || !settings.pakasirApiKey || !settings.pakasirProjectSlug) {
      return { success: false, message: "Sistem pembayaran sedang dalam pemeliharaan (API Key belum diatur)." };
    }

    // 3. Tarik Data Katalog Produk Asli dari Database (Mencegah Manipulasi Harga dari Client)
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return { success: false, message: "Produk tidak ditemukan atau katalog telah diperbarui oleh Admin." };
    }

    // Gunakan harga dasar aman dari database
    const finalPrice = product.sellPrice; 

    // 4. Buat Nomor Invoice dengan Struktur Unik Berpola Waktu
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // Format: YYMMDD
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const invoiceId = `INV-PS-${datePrefix}-${randomHex}`;
    
    // Pasang SKU Layanan yang tepat untuk diteruskan ke Webhook Premify
    const premifySkuCode = variantId || product.id;

    // 5. Rekam Struktur Transaksi Awal ke Database dengan Status PENDING
    await prisma.transaction.create({
      data: {
        invoiceId,
        productCode: premifySkuCode, 
        customerPhone: whatsapp,
        amount: finalPrice,
        productDetails: JSON.stringify({
          name: product.name,
          targetId: targetId,
          variant: variantId || "Reguler"
        }),
        paymentStatus: "PENDING",
        premifyStatus: "PENDING"
      }
    });

    // 6. Request QRIS ke Gateway Pakasir via SDK
    const paymentResult = await pakasirSDK.createQris({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id: invoiceId,
      amount: finalPrice,
    });

    // 7. Evaluasi Kebenaran Hasil Handshake Gateway
    if (paymentResult.ok && paymentResult.data?.payment) {
      
      // Karena Pakasir QRIS dirender di halaman yang sama, link URL diarahkan ke halaman pelacakan pesanan Anda
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const invoiceUrl = `${appUrl}/cek-pesanan?invoice=${invoiceId}`;
      
      // KIRIM NOTIFIKASI INVOICE PEMBAYARAN VIA BOT WHATSAPP BAILEYS INTERNAL
      const waMessage = WATemplates.invoiceCreated(
        invoiceId, 
        product.name, 
        targetId, 
        finalPrice.toLocaleString('id-ID'), 
        invoiceUrl 
      );
      
      // Kirim asinkron (background process) agar eksekusi halaman tidak tertunda lama
      sendWhatsAppMessage(whatsapp, waMessage).catch((err) => 
        console.error("Gagal mengirim notifikasi awal WhatsApp Baileys:", err)
      );

      return { 
        success: true, 
        payment: paymentResult.data.payment, // Kirim objek payment untuk QRISInvoice
        message: "Invoice berhasil dibuat! Menyiapkan QRIS aman..." 
      };
    } else {
      // Jika API Key tidak sah atau server Pakasir menolak
      console.error("[PAKASIR API GATEWAY REJECTION]:", paymentResult.data);
      
      await prisma.transaction.update({
        where: { invoiceId },
        data: { paymentStatus: "FAILED" }
      });
      
      return { 
        success: false, 
        message: paymentResult.data?.message || "Gerbang pembayaran Pakasir sedang sibuk. Silakan coba sesaat lagi." 
      };
    }
  } catch (error) {
    console.error("[CRITICAL CHECKOUT SYSTEM FAILURE]:", error);
    return { 
      success: false, 
      message: "Terjadi gangguan sistem internal pada server checkout PansaStore." 
    };
  }
}
