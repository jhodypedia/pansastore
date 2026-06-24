"use server";

import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir"; // Pastikan path import sesuai dengan lokasi file SDK Anda

export async function processCheckout(formData: FormData) {
  try {
    // 1. Ekstrak data dari FormData
    const productId = formData.get("productId") as string;
    const variantId = formData.get("variantId") as string | null;
    const targetId = formData.get("targetId") as string; // Bisa berupa email atau whatsapp tergantung jenis produk
    const whatsapp = formData.get("whatsapp") as string;
    const method = (formData.get("method") as string) || "qris";

    // Validasi input dasar
    if (!productId || !whatsapp || !targetId) {
      return {
        success: false,
        message: "Data checkout tidak lengkap. Harap isi semua field wajib.",
      };
    }

    // 2. Tarik data pengaturan aplikasi & produk dari Database secara paralel
    const [settings, product] = await Promise.all([
      prisma.appSetting.findFirst(),
      prisma.product.findUnique({
        where: { id: productId },
      }),
    ]);

    // 3. Validasi Kesiapan Sistem dan Produk
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

    // 4. Siapkan Variabel Transaksi
    // Gunakan variant price jika logika toko Anda mengharuskannya, atau sellPrice produk utama
    const amount = product.sellPrice; 
    const invoiceId = `PANSA-${Date.now()}${Math.floor(Math.random() * 100)}`; // Randomizer mencegah duplikasi order_id

    // 5. Buat Record Transaksi Pending di Database PansaStore
    await prisma.transaction.create({
      data: {
        invoiceId,
        productCode: variantId ? variantId : product.id,
        customerPhone: whatsapp,
        amount,
        paymentStatus: "PENDING",
        premifyStatus: "PENDING",
        // Simpan targetId di tempat yang sesuai, misalnya di kolom deskripsi, notes, atau field khusus email/tujuan
        notes: `Target ID: ${targetId}`, 
      },
    });

    // 6. Request QRIS ke Payment Gateway (Pakasir)
    // Pastikan metode memanggil createQris jika method="qris"
    let paymentResult;
    
    if (method.toLowerCase() === "qris") {
      paymentResult = await pakasirSDK.createQris({
        project: settings.pakasirProjectSlug,
        api_key: settings.pakasirApiKey,
        order_id: invoiceId,
        amount: amount,
      });
    } else {
      return {
        success: false,
        message: `Metode pembayaran ${method} belum didukung sistem ini.`,
      };
    }

    // 7. Handle Respons dari Pakasir
    if (paymentResult.ok && paymentResult.data?.payment) {
      return {
        success: true,
        message: "Berhasil menyiapkan pembayaran.",
        payment: paymentResult.data.payment, // Objek ini ditangkap oleh CheckoutClient untuk render QRISInvoice
      };
    } else {
      // Log detail error dari Pakasir ke console server untuk debugging
      console.error("[Checkout Error] Pakasir membalas:", paymentResult.data);
      
      // Update status transaksi di database menjadi FAILED karena gateway menolak
      await prisma.transaction.updateMany({
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
