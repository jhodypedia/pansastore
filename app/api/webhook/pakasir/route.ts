import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    // 1. Ambil payload JSON dari Pakasir
    const body = await request.json();
    const { order_id, amount, status, project, is_sandbox } = body;

    // Jika status bukan completed, kita abaikan saja (misal: expired/canceled)
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

    // Hindari pemrosesan ganda jika transaksi sudah sukses sebelumnya
    if (transaction.paymentStatus === "COMPLETED") {
      return NextResponse.json({ received: true, message: "Transaksi sudah pernah diproses sebelumnya." });
    }

    // 3. KEAMANAN: Double-Check Status Asli ke Server Pakasir
    // (Jika SDK kamu butuh parameter is_sandbox untuk ngecek URL yang benar, tambahkan di sini jika didukung)
    const verification = await pakasirSDK.checkTransaction({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id: order_id,
    });

    // --- BLOK DEBUGGING (Cek di terminal setelah transaksi) ---
    const apiAmount = Number(verification.data?.transaction?.amount);
    const dbAmount = Number(transaction.amount);
    
    console.log(`\n=== DEBUG VERIFIKASI PAKASIR [${order_id}] ===`);
    console.log("1. Verification OK?  :", verification.ok);
    console.log("2. Status API        :", verification.data?.transaction?.status);
    console.log("3. Is Sandbox?       :", is_sandbox);
    console.log("4. Amount API        :", apiAmount, `(Asli: ${verification.data?.transaction?.amount})`);
    console.log("5. Amount DB         :", dbAmount, `(Asli: ${transaction.amount})`);
    console.log("==================================================\n");
    // ---------------------------------------------------------

    // 4. Proses Jika Verifikasi Valid
    // Perbaikan: Gunakan Number() agar tipe data decimal Prisma & integer Pakasir bisa dibandingkan nilainya
    if (
      verification.ok && 
      verification.data?.transaction?.status === "completed" &&
      apiAmount === dbAmount 
    ) {
      
      // Update status di database menjadi SUKSES
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          paymentStatus: "COMPLETED",
          // Anda bisa mengubah premifyStatus jika ada proses webhook lanjutan
          // premifyStatus: "PROCESSING" 
        },
      });

      // 5. Eksekusi Pengiriman Otomatis Notifikasi via WhatsApp
      try {
        let productName = "Produk Digital";
        let targetId = "Pelanggan";
        
        // Ekstrak detail produk jika tersimpan sebagai JSON string
        if (transaction.productDetails) {
          const details = transaction.productDetails;
          const parsed = typeof details === "string" ? JSON.parse(details) : details;
          productName = parsed.name || productName;
          targetId = parsed.targetId || targetId;
        }

        // MENGGUNAKAN TEMPLATE orderCompleted YANG ADA DI SISTEM ANDA
        const successMessage = WATemplates.orderCompleted(
          order_id,
          productName,
          targetId
        );

        // Kirim via bot Baileys
        await sendWhatsAppMessage(transaction.customerPhone, successMessage);
        console.log(`[Webhook Pakasir] ✅ Pembayaran ${order_id} sukses. Pesan WA terkirim.`);

      } catch (waError) {
        console.error(`[Webhook Pakasir] ⚠️ Pembayaran sukses tapi gagal kirim WA untuk ${order_id}:`, waError);
      }

      // Berikan respons 200 OK
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
