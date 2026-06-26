import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    // 1. Ambil Raw Body untuk Validasi Signature
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-premify-signature");

    if (!signatureHeader) {
      console.warn("[Premify Webhook] Ditolak: Header Signature tidak ditemukan.");
      return NextResponse.json({ message: "Missing Signature" }, { status: 401 });
    }

    // 2. Ambil API Key dari ENV (prioritas) atau Database (fallback)
    const apiKey = process.env.PREMIFY_API_KEY || (await prisma.appSetting.findFirst())?.premifyApiKey;

    if (!apiKey) {
      console.error("[Premify Webhook] API Key belum dikonfigurasi.");
      return NextResponse.json({ message: "System not ready" }, { status: 500 });
    }

    // 3. Validasi HMAC-SHA256
    const expectedSignature = crypto
      .createHmac("sha256", apiKey)
      .update(rawBody)
      .digest("hex");

    if (signatureHeader !== expectedSignature) {
      console.error("[Premify Webhook] 🚨 Signature HMAC tidak cocok! Potensi serangan.");
      return NextResponse.json({ message: "Invalid Signature" }, { status: 401 });
    }

    // 4. Parsing Payload
    const body = JSON.parse(rawBody);
    const { event, data } = body;

    console.log("[Premify Webhook] Event diterima:", event);

    if (!data || !data.order_number) {
      console.error("[Premify Webhook] Payload tidak valid: field order_number tidak ditemukan.", data);
      return NextResponse.json({ message: "Invalid payload: Missing order_number" }, { status: 400 });
    }

    const orderNumber = data.order_number;

    // 5. Skip transaksi sandbox (kecuali di mode development)
    const isDevelopment = process.env.NODE_ENV === "development";
    const isTest = data.is_test === true || data.metadata?.is_test === true;

    if (isTest && !isDevelopment) {
      console.log(`[Premify Webhook] ℹ️ Transaksi SANDBOX diabaikan: ${orderNumber}`);
      return NextResponse.json({ message: "Test event ignored" }, { status: 200 });
    }

    if (isTest && isDevelopment) {
      console.log(`[Premify Webhook] 🧪 Mode DEV: Transaksi SANDBOX tetap diproses: ${orderNumber}`);
    }

    // 6. Cari Transaksi di Database
    const transaction = await prisma.transaction.findFirst({
      where: { premifyOrderId: orderNumber },
    });

    if (!transaction) {
      console.warn(`[Premify Webhook] Transaksi ${orderNumber} tidak ditemukan di database.`);
      return NextResponse.json({ message: "Transaction not found" }, { status: 200 });
    }

    // Cegah duplikasi proses
    if (
      transaction.premifyStatus === "COMPLETED" ||
      transaction.premifyStatus === "FAILED"
    ) {
      console.log(`[Premify Webhook] Transaksi ${orderNumber} sudah diproses sebelumnya, diabaikan.`);
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    const productDetails = JSON.parse(transaction.productDetails || "{}");
    const customerWA = transaction.customerPhone;

    // 7. Handle Event
    if (event === "order.completed") {

      const accountDetailsStr =
        data.items?.[0]?.account_details || "Akses otomatis aktif.";

      const updatedDetails = {
        ...productDetails,
        sn: accountDetailsStr,
      };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyStatus: "COMPLETED",
          paymentStatus: "COMPLETED",
          productDetails: JSON.stringify(updatedDetails),
        },
      });

      const msg = WATemplates.orderCompleted(
        transaction.invoiceId,
        productDetails.name,
        productDetails.targetId,
        accountDetailsStr !== "Akses otomatis aktif." ? accountDetailsStr : undefined
      );

      await sendWhatsAppMessage(customerWA, msg).catch(console.error);
      console.log(`[Premify Webhook] ✅ Pesanan ${transaction.invoiceId} selesai, notif WA terkirim.`);

    } else if (event === "order.failed" || event === "order.cancelled") {

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyStatus: "FAILED",
          paymentStatus: "FAILED",
          productDetails: JSON.stringify({
            ...productDetails,
            error: "Pesanan digagalkan/dibatalkan oleh penyedia (Premify).",
          }),
        },
      });

      await sendWhatsAppMessage(
        customerWA,
        WATemplates.orderFailed(transaction.invoiceId)
      ).catch(console.error);

      console.warn(`[Premify Webhook] ⚠️ Pesanan ${transaction.invoiceId} dibatalkan oleh server pusat.`);

    } else {
      console.log(`[Premify Webhook] Event '${event}' untuk ${orderNumber} tidak memerlukan aksi.`);
    }

    return NextResponse.json({ success: true, message: "Webhook processed" }, { status: 200 });

  } catch (error: any) {
    console.error("[Premify Webhook] Internal Error:", error.message);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
