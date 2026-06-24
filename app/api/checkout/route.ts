import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { variant_id, customerPhone, method = "QRIS" } = await request.json();

    // Ambil setting dan produk
    const settings = await prisma.appSetting.findFirst();
    const product = await prisma.product.findUnique({
      where: { id: variant_id },
    });

    if (!settings?.dompetxApiKey || !product) {
      return NextResponse.json({
        success: false,
        message: "Sistem belum siap atau produk tidak ditemukan",
      }, { status: 400 });
    }

    const referenceId = `PANSA-${Date.now()}`;
    const amount = product.sellPrice;

    // Buat transaksi di database
    await prisma.transaction.create({
      data: {
        invoiceId: referenceId,
        productCode: product.id,
        customerPhone,
        amount,
        paymentStatus: "PENDING",
        premifyStatus: "PENDING",
      },
    });

    // Buat signature untuk DompetX
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = JSON.stringify({
      method,
      amount,
      currency: "IDR",
      reference: referenceId,
    });

    const signature = crypto
      .createHmac("sha256", settings.dompetxApiKey)
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    // Panggil API DompetX
    const dompetxRes = await fetch("https://api.dompetx.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DOMPAY-API-Key": settings.dompetxApiKey,
        "X-DOMPAY-Signature": signature,
        "X-DOMPAY-Timestamp": timestamp,
      },
      body: payload,
    });

    const paymentData = await dompetxRes.json();

    return NextResponse.json({
      success: true,
      payment: paymentData,
      referenceId,
    });

  } catch (error) {
    console.error("[Checkout Error]:", error);
    return NextResponse.json({
      success: false,
      message: "Checkout Error",
    }, { status: 500 });
  }
}
