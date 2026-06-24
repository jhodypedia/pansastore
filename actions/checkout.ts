"use server";

import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";

export async function processCheckout(formData: FormData) {
  try {
    const productId = formData.get("productId") as string;
    const variantId = formData.get("variantId") as string;
    const targetId = formData.get("targetId") as string;
    const whatsapp = formData.get("whatsapp") as string;

    // 1. Validasi Input Dasar Lengkap
    if (!targetId || !whatsapp || !productId) {
      return { success: false, message: "Data tidak lengkap. Harap isi ID Tujuan dan WhatsApp." };
    }

    // 2. Ambil Kredensial API DompetX dari Database AppSetting
    const settings = await prisma.appSetting.findFirst();
    if (!settings || !settings.dompetxApiKey) {
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

    // 6. Konfigurasi Endpoint Payload Resmi DompetX Pembayaran
    const DOMPETX_ENDPOINT = "https://api.dompetx.com/v1/create-payment"; 
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${appUrl}/cek-pesanan?invoice=${invoiceId}`;

    const dompetxPayload = {
      api_key: settings.dompetxApiKey,
      merchant_order_id: invoiceId,
      amount: finalPrice,
      customer_name: targetId,
      customer_phone: whatsapp,
      return_url: returnUrl
    };

    // 7. Tembak HTTP Request POST ke Gateway DompetX
    const response = await fetch(DOMPETX_ENDPOINT, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(dompetxPayload),
      cache: 'no-store'
    });

    const dompetxRes = await response.json();

    // 8. Evaluasi Kebenaran Hasil Handshake Gateway
    if (response.ok && dompetxRes.status === 'success' && dompetxRes.payment_url) {
      
      // KIRIM NOTIFIKASI INVOICE PEMBAYARAN VIA BOT WHATSAPP BAILEYS INTERNAL
      const waMessage = WATemplates.invoiceCreated(
        invoiceId, 
        product.name, 
        targetId, 
        finalPrice.toLocaleString('id-ID'), 
        dompetxRes.payment_url
      );
      
      // Kirim asinkron (background process) agar eksekusi halaman tidak tertunda lama
      sendWhatsAppMessage(whatsapp, waMessage).catch((err) => 
        console.error("Gagal mengirim notifikasi awal WhatsApp Baileys:", err)
      );

      return { 
        success: true, 
        paymentUrl: dompetxRes.payment_url, 
        message: "Invoice berhasil dibuat! Mengarahkan ke gerbang pembayaran aman..." 
      };
    } else {
      // Jika API Key tidak sah atau server DompetX menolak
      console.error("[DOMPETX API GATEWAY REJECTION]:", dompetxRes);
      
      await prisma.transaction.update({
        where: { invoiceId },
        data: { paymentStatus: "FAILED" }
      });
      
      return { 
        success: false, 
        message: dompetxRes.message || "Gerbang pembayaran DompetX sedang sibuk. Silakan coba sesaat lagi." 
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