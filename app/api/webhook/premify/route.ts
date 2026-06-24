import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Ambil payload dari Callback Premify
    // Asumsi standar API H2H: ref_id (Invoice kita), status, sn (Serial Number/Bukti), message
    const { ref_id, status, sn, message } = body;

    if (!ref_id) {
      return NextResponse.json({ message: "Invalid payload: Missing ref_id" }, { status: 400 });
    }

    // 2. Cari Data Transaksi berdasarkan ref_id (invoiceId kita)
    const transaction = await prisma.transaction.findUnique({
      where: { invoiceId: ref_id }
    });

    if (!transaction) {
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
    }

    // Abaikan jika transaksi sudah Final di sistem kita
    if (transaction.premifyStatus === "SUCCESS" || transaction.premifyStatus === "FAILED") {
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    const productDetails = JSON.parse(transaction.productDetails || "{}");
    const customerWA = transaction.customerPhone;

    // 3. Eksekusi Berdasarkan Status dari Premify
    if (status === "success" || status === "Success") {
      
      // Simpan SN / Keterangan ke productDetails
      const updatedDetails = { ...productDetails, sn: sn || "-" };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          premifyStatus: "SUCCESS",
          productDetails: JSON.stringify(updatedDetails)
        }
      });

      // Kirim WA Pesanan Selesai (Tambahkan SN jika ada)
      let msg = WATemplates.orderCompleted(transaction.invoiceId, productDetails.name, productDetails.targetId);
      if (sn && sn.trim() !== "" && sn !== "-") {
        msg += `\n📌 *SN/Voucher:* ${sn}`;
      }

      await sendWhatsAppMessage(customerWA, msg).catch(console.error);

    } else if (status === "error" || status === "failed" || status === "Failed") {
      
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          premifyStatus: "FAILED",
          productDetails: JSON.stringify({ ...productDetails, error: message || "Failed from provider callback" })
        }
      });

      // Kirim WA Kendala / Gagal
      await sendWhatsAppMessage(customerWA, WATemplates.orderFailed(transaction.invoiceId)).catch(console.error);
    }

    // Balas 200 OK agar server Premify berhenti mengirim ulang Webhook
    return NextResponse.json({ success: true, message: "Premify webhook processed" }, { status: 200 });

  } catch (error) {
    console.error("Premify Webhook Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}