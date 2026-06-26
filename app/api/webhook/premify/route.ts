import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    // 1. Ambil Raw Body (Teks murni) untuk Validasi Keamanan Signature
    const rawBody = await req.text();
    
    // Di Next.js App Router, header HTTP otomatis menjadi lowercase
    const signatureHeader = req.headers.get("x-premify-signature");

    if (!signatureHeader) {
      console.warn("[Premify Webhook] Ditolak: Header Signature tidak ditemukan.");
      return NextResponse.json({ message: "Missing Signature" }, { status: 401 });
    }

    // 2. Ambil API Key dari Database untuk mencocokkan HMAC
    const settings = await prisma.appSetting.findFirst();
    const apiKey = settings?.premifyApiKey;

    if (!apiKey) {
      console.error("[Premify Webhook] API Key belum dikonfigurasi di database.");
      return NextResponse.json({ message: "System not ready" }, { status: 500 });
    }

    // 3. Validasi Keamanan Signature HMAC-SHA256
    const expectedSignature = crypto
      .createHmac("sha256", apiKey)
      .update(rawBody)
      .digest("hex");

    if (signatureHeader !== expectedSignature) {
      console.error("[Premify Webhook] 🚨 Signature HMAC tidak cocok! Potensi serangan.");
      return NextResponse.json({ message: "Invalid Signature" }, { status: 401 });
    }

    // 4. Parsing Payload JSON dari Premify
    const body = JSON.parse(rawBody);
    const { event, data } = body;

    // Pastikan payload memiliki order_number dari Premify
    if (!data || !data.order_number) {
      return NextResponse.json({ message: "Invalid payload: Missing order_number" }, { status: 400 });
    }

    const orderNumber = data.order_number;

    // 5. Cari Data Transaksi berdasarkan premifyOrderId (Bukan invoiceId lokal kita)
    const transaction = await prisma.transaction.findFirst({
      where: { premifyOrderId: orderNumber }
    });

    if (!transaction) {
      console.error(`[Premify Webhook] Transaksi vendor ${orderNumber} tidak ditemukan di database PansaStore.`);
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
    }

    // Abaikan jika transaksi sudah Final di sistem kita untuk mencegah spam WA
    if (transaction.premifyStatus === "COMPLETED" || transaction.premifyStatus === "FAILED") {
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    const productDetails = JSON.parse(transaction.productDetails || "{}");
    const customerWA = transaction.customerPhone;

    // 6. Eksekusi Berdasarkan Event dari Server Premify
    if (event === "order.completed") {
      
      // Ekstrak detail akun kredensial (Email/Pass/Serial) dari array items
      let accountDetailsStr = "";
      if (data.items && data.items.length > 0 && data.items[0].account_details) {
        accountDetailsStr = data.items[0].account_details;
      }

      // Simpan kredensial ke productDetails (kita simpan di key "sn" agar UI Cek Pesanan membacanya)
      const updatedDetails = { ...productDetails, sn: accountDetailsStr || "Akses otomatis aktif/cek panduan." };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          premifyStatus: "COMPLETED",
          productDetails: JSON.stringify(updatedDetails)
        }
      });

      // Kirim WA Pesanan Selesai dengan template Pansa Group
      let msg = WATemplates.orderCompleted(transaction.invoiceId, productDetails.name, productDetails.targetId);
      
      if (accountDetailsStr) {
         msg += `\n\n📌 *Detail Akun / Kredensial Premium:*\n${accountDetailsStr}`;
      }

      await sendWhatsAppMessage(customerWA, msg).catch(console.error);
      console.log(`[Premify Webhook] ✅ Pesanan ${transaction.invoiceId} sukses dikirim ke pelanggan!`);

    } else if (event === "order.failed" || event === "order.cancelled") {
      
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          premifyStatus: "FAILED",
          productDetails: JSON.stringify({ ...productDetails, error: "Pesanan digagalkan/dibatalkan oleh penyedia (Premify)." })
        }
      });

      // Kirim WA Kendala / Gagal
      await sendWhatsAppMessage(customerWA, WATemplates.orderFailed(transaction.invoiceId)).catch(console.error);
      console.warn(`[Premify Webhook] ⚠️ Pesanan ${transaction.invoiceId} dibatalkan oleh server pusat.`);
    }

    // Selalu balas 200 OK agar server Premify berhenti mengirim ulang Webhook
    return NextResponse.json({ success: true, message: "Webhook processed" }, { status: 200 });

  } catch (error: any) {
    console.error("[Premify Webhook] Internal Error:", error.message);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
