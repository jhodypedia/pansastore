import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Ambil payload dari DompetX
    // Asumsi properti sesuai standar DompetX: merchant_order_id, status
    const { merchant_order_id, status } = body;

    // Abaikan jika status bukan sukses/lunas
    if (status !== "SUCCESS" && status !== "PAID") {
      return NextResponse.json({ message: "Ignored: Status not paid" }, { status: 200 });
    }

    // 2. Cari Data Transaksi di Database PansaStore
    const transaction = await prisma.transaction.findUnique({
      where: { invoiceId: merchant_order_id }
    });

    if (!transaction) {
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
    }

    // Cegah proses berulang jika transaksi sudah ditandai LUNAS
    if (transaction.paymentStatus === "PAID") {
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    // 3. Update Status Pembayaran menjadi LUNAS (PAID)
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { paymentStatus: "PAID" }
    });

    const productDetails = JSON.parse(transaction.productDetails || "{}");
    const customerWA = transaction.customerPhone;

    // 4. KIRIM WA (PROSES) KE PELANGGAN
    await sendWhatsAppMessage(
      customerWA, 
      WATemplates.orderProcessing(transaction.invoiceId, productDetails.name)
    ).catch(console.error);

    // ========================================================
    // 5. TEMBAK API ORDER PREMIFY
    // ========================================================
    const settings = await prisma.appSetting.findFirst();
    if (!settings?.premifyApiKey) {
       console.error("[CRITICAL] Premify API Key missing!");
       return NextResponse.json({ message: "Success but Premify API missing" }, { status: 200 }); 
    }

    const PREMIFY_URL = "https://api.premify.com/v1/order"; 
    
    // Payload Order Premify 
    const premifyPayload = {
      api_key: settings.premifyApiKey,
      service: transaction.productCode, // Kode SKU (Variant / Product ID)
      data_no: productDetails.targetId, // ID Tujuan / Player ID
      ref_id: transaction.invoiceId     // Nomor Invoice PansaStore
    };

    const premifyResponse = await fetch(PREMIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(premifyPayload)
    });

    const premifyData = await premifyResponse.json();

    // 6. Evaluasi Respons API Premify
    if (premifyData.status === true || premifyData.status === "success") {
      // Jika Premify merespons sukses / langsung sukses
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          premifyStatus: "SUCCESS",
          premifyOrderId: premifyData.data?.trx_id || "TRX-UNKNOWN"
        }
      });

      // Kirim WA Selesai
      await sendWhatsAppMessage(
        customerWA, 
        WATemplates.orderCompleted(transaction.invoiceId, productDetails.name, productDetails.targetId)
      ).catch(console.error);

    } else if (premifyData.status === "processing" || premifyData.status === "pending") {
      // Jika Premify butuh waktu proses (Biarkan Webhook Premify yang menyelesaikannya nanti)
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          premifyStatus: "PENDING",
          premifyOrderId: premifyData.data?.trx_id || "TRX-UNKNOWN"
        }
      });
    } else {
      // Jika order ditolak Premify (Saldo habis, SKU salah, dsb)
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          premifyStatus: "FAILED", 
          productDetails: JSON.stringify({ ...productDetails, error: premifyData.message || "Provider Error" }) 
        }
      });
      
      // Kirim WA Gagal
      await sendWhatsAppMessage(customerWA, WATemplates.orderFailed(transaction.invoiceId)).catch(console.error);
    }

    return NextResponse.json({ success: true, message: "Webhook processed" }, { status: 200 });

  } catch (error) {
    console.error("DompetX Webhook Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}