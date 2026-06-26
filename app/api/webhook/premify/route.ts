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

    // [FIX] Log payload lengkap untuk debugging (bisa dihapus di production)
    console.log("[Premify Webhook] Event diterima:", event);
    console.log("[Premify Webhook] Data payload:", JSON.stringify(data, null, 2));

    // [FIX] Validasi menggunakan `order_id` sesuai dokumentasi resmi Premify
    // (bukan `order_number` yang tidak ada di payload Premify)
    if (!data || !data.order_id) {
      console.error("[Premify Webhook] Payload tidak valid: field order_id tidak ditemukan.", data);
      return NextResponse.json({ message: "Invalid payload: Missing order_id" }, { status: 400 });
    }

    const orderId = data.order_id;

    // [FIX] Skip transaksi test agar tidak mencemari log production
    if (data.is_test === true) {
      console.log(`[Premify Webhook] ℹ️ Transaksi test diabaikan: ${orderId}`);
      return NextResponse.json({ message: "Test event ignored" }, { status: 200 });
    }

    // 5. Cari Data Transaksi berdasarkan premifyOrderId
    const transaction = await prisma.transaction.findFirst({
      where: { premifyOrderId: orderId },
    });

    if (!transaction) {
      // [FIX] Return 200 (bukan 404) agar Premify tidak terus retry webhook ini
      console.warn(`[Premify Webhook] Transaksi vendor ${orderId} tidak ditemukan di database PansaStore.`);
      return NextResponse.json({ message: "Transaction not found" }, { status: 200 });
    }

    // Abaikan jika transaksi sudah Final untuk mencegah duplikasi notif WA
    if (transaction.premifyStatus === "COMPLETED" || transaction.premifyStatus === "FAILED") {
      console.log(`[Premify Webhook] Transaksi ${orderId} sudah diproses sebelumnya, diabaikan.`);
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

      // Simpan kredensial ke productDetails (key "sn" agar UI Cek Pesanan bisa membacanya)
      const updatedDetails = {
        ...productDetails,
        sn: accountDetailsStr || "Akses otomatis aktif/cek panduan.",
      };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyStatus: "COMPLETED",
          productDetails: JSON.stringify(updatedDetails),
        },
      });

      // Kirim WA Pesanan Selesai
      let msg = WATemplates.orderCompleted(
        transaction.invoiceId,
        productDetails.name,
        productDetails.targetId
      );

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
          productDetails: JSON.stringify({
            ...productDetails,
            error: "Pesanan digagalkan/dibatalkan oleh penyedia (Premify).",
          }),
        },
      });

      await sendWhatsAppMessage(customerWA, WATemplates.orderFailed(transaction.invoiceId)).catch(console.error);
      console.warn(`[Premify Webhook] ⚠️ Pesanan ${transaction.invoiceId} dibatalkan oleh server pusat.`);

    } else {
      // Event tidak dikenal (misal: order.processing), log saja tanpa action
      console.log(`[Premify Webhook] Event '${event}' diterima untuk ${orderId}, tidak ada aksi.`);
    }

    // Selalu balas 200 OK agar server Premify berhenti mengirim ulang Webhook
    return NextResponse.json({ success: true, message: "Webhook processed" }, { status: 200 });

  } catch (error: any) {
    console.error("[Premify Webhook] Internal Error:", error.message);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
