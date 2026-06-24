import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    // 1. Ambil payload JSON dari Pakasir
    const body = await request.json();
    const { order_id, amount, status, project } = body;

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
    const verification = await pakasirSDK.checkTransaction({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id: order_id,
    });

    // 4. Proses Jika Verifikasi Valid
    if (
      verification.ok && 
      verification.data?.transaction?.status === "completed" &&
      verification.data?.transaction?.amount === transaction.amount // Pastikan nominal tidak dimanipulasi
    ) {
      
      // Update status di database menjadi SUKSES
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          paymentStatus: "COMPLETED",
          // Jika sistem Pansa Group Anda memiliki status webhook lain untuk proses ke Premify
          // premifyStatus: "PROCESSING" 
        },
      });

      // 5. Eksekusi Pengiriman Otomatis (Aset Digital / Notifikasi) via WhatsApp
      try {
        let productName = "Produk Digital";
        let targetId = "Pelanggan";
        
        // Ekstrak detail produk jika Anda menyimpannya sebagai JSON string
        if (transaction.productDetails) {
          const details = JSON.stringify(transaction.productDetails); // Sesuaikan jika Anda mem-parsing JSON
          const parsed = JSON.parse(details as string);
          productName = parsed.name || productName;
          targetId = parsed.targetId || targetId;
        }

        // Susun pesan sukses. (Pastikan WATemplates.paymentSuccess sudah ada di lib/whatsapp Anda)
        const successMessage = WATemplates.paymentSuccess(
          order_id,
          productName,
          targetId
        );

        // Kirim via bot Baileys Anda
        await sendWhatsAppMessage(transaction.customerPhone, successMessage);
        console.log(`[Webhook Pakasir] ✅ Pembayaran ${order_id} sukses. Pesan WA terkirim.`);

      } catch (waError) {
        // Jika WA gagal, transaksi tetap dicatat sukses, tapi kita log error-nya
        console.error(`[Webhook Pakasir] ⚠️ Pembayaran sukses tapi gagal kirim WA untuk ${order_id}:`, waError);
      }

      // Berikan respons 200 OK agar server Pakasir tahu webhook berhasil diterima
      return NextResponse.json({ success: true, message: "Webhook berhasil diproses." });
      
    } else {
      // Jika verifikasi gagal (kemungkinan manipulasi data)
      console.warn(`[Webhook Pakasir] 🚨 Verifikasi gagal untuk order_id: ${order_id}`);
      return NextResponse.json({ error: "Verifikasi transaksi gagal" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("[Webhook Pakasir] Terjadi kesalahan internal:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
