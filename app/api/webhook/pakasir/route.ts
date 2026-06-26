import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";
// IMPORT FUNGSI PREMIFY KAMU DI SINI (Sesuaikan path-nya)
// import { processPremifyOrder } from "@/lib/premify"; 

export async function POST(request: Request) {
  try {
    // 1. Ambil payload JSON dari Pakasir
    const body = await request.json();
    const { order_id, status, project, is_sandbox } = body;

    // Validasi dasar payload
    if (!order_id || !status || !project) {
      console.warn("[Webhook Pakasir] Payload tidak lengkap:", body);
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    // Jika status bukan completed, kita abaikan saja
    if (status !== "completed") {
      return NextResponse.json({ received: true, message: "Bukan status completed, diabaikan." });
    }

    // 2. Tarik data Transaksi dan Pengaturan dari Database
    const [transaction, settings] = await Promise.all([
      prisma.transaction.findUnique({
        where: { invoiceId: order_id },
      }),
      prisma.appSetting.findFirst(),
    ]);

    // Validasi keberadaan data
    if (!transaction) {
      console.error(`[Webhook Pakasir] Transaksi ${order_id} tidak ditemukan di database.`);
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (!settings?.pakasirApiKey || !settings?.pakasirProjectSlug) {
      console.error("[Webhook Pakasir] Kredensial API Pakasir belum dikonfigurasi.");
      return NextResponse.json({ error: "Sistem belum siap" }, { status: 500 });
    }

    // Pastikan webhook ini memang ditujukan untuk project Pakasir kita
    if (project !== settings.pakasirProjectSlug) {
      console.warn(
        `[Webhook Pakasir] 🚨 Project tidak cocok. Diterima: "${project}", Diharapkan: "${settings.pakasirProjectSlug}"`
      );
      return NextResponse.json({ error: "Project tidak valid" }, { status: 400 });
    }

    // Hindari pemrosesan ganda
    if (transaction.paymentStatus === "COMPLETED") {
      return NextResponse.json({ received: true, message: "Transaksi sudah pernah diproses sebelumnya." });
    }

    // 3. KEAMANAN: Double-Check Status Asli ke Server Pakasir
    const dbAmount = Number(transaction.amount);

    const verification = await pakasirSDK.checkTransaction({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id: order_id,
      amount: dbAmount,
    });

    const apiAmount = Number(verification.data?.transaction?.amount);

    console.log(`\n=== DEBUG VERIFIKASI PAKASIR [${order_id}] ===`);
    console.log("1. Verification OK?  :", verification.ok);
    console.log("2. Status API        :", verification.data?.transaction?.status);
    console.log("3. Is Sandbox?       :", is_sandbox);
    console.log("4. Amount API        :", apiAmount);
    console.log("5. Amount DB         :", dbAmount);
    console.log("==================================================\n");

    // 4. Proses Jika Verifikasi Valid
    if (
      verification.ok &&
      verification.data?.transaction?.status === "completed" &&
      apiAmount === dbAmount
    ) {

      // Update status di database secara atomik
      const updateResult = await prisma.transaction.updateMany({
        where: {
          id: transaction.id,
          paymentStatus: { not: "COMPLETED" },
        },
        data: {
          paymentStatus: "COMPLETED",
          premifyStatus: "PROCESSING" // <--- INI SUDAH DIBUKA
        },
      });

      if (updateResult.count === 0) {
        console.log(`[Webhook Pakasir] ⚠️ Transaksi ${order_id} sudah diproses request lain (race-safe).`);
        return NextResponse.json({ received: true, message: "Sudah diproses sebelumnya (race-safe)." });
      }

      // 5. TEMBAK API PREMIFY DI SINI
      // Karena database sudah di-update menjadi PROCESSING, sekarang saatnya order ke Premify
      try {
        console.log(`[Webhook Pakasir] ⏳ Meneruskan order ${order_id} ke sistem Premify...`);
        
        // CONTOH PEMANGGILAN FUNGSI PREMIFY:
        // await processPremifyOrder(transaction.id, transaction.productCode);
        
        console.log(`[Webhook Pakasir] ✅ Order ${order_id} berhasil diteruskan ke Premify.`);
      } catch (premifyError) {
        console.error(`[Webhook Pakasir] 🚨 Gagal memproses Premify untuk ${order_id}:`, premifyError);
        // Tergantung flow bisnis, kamu bisa update DB premifyStatus menjadi "FAILED" di sini
      }

      // 6. Eksekusi Pengiriman Otomatis Notifikasi via WhatsApp menggunakan baileys
      try {
        let productName = "Produk Digital";
        let targetId = "Pelanggan";

        if (transaction.productDetails) {
          const details = transaction.productDetails;
          const parsed = typeof details === "string" ? JSON.parse(details) : details;
          productName = parsed.name || productName;
          targetId = parsed.targetId || targetId;
        }

        const successMessage = WATemplates.orderCompleted(
          order_id,
          productName,
          targetId
        );

        await sendWhatsAppMessage(transaction.customerPhone, successMessage);
        console.log(`[Webhook Pakasir] ✅ Pembayaran ${order_id} sukses. Pesan WA terkirim.`);

      } catch (waError) {
        console.error(`[Webhook Pakasir] ⚠️ Pembayaran sukses tapi gagal kirim WA untuk ${order_id}:`, waError);
      }

      return NextResponse.json({ success: true, message: "Webhook berhasil diproses." });

    } else {
      console.warn(`[Webhook Pakasir] 🚨 Verifikasi gagal untuk order_id: ${order_id}`);
      return NextResponse.json({ error: "Verifikasi transaksi gagal" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("[Webhook Pakasir] Terjadi kesalahan internal:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
