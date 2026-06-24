import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

const DOMPETX_API_KEY = process.env.DOMPETX_API_KEY!;
const DOMPETX_BASE_URL = 'https://api.dompetx.com/v1';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // ==================== CHECKOUT ====================
  if (action === 'checkout') {
    try {
      const body = await request.json();
      const { method = "QRIS", amount, productCode, customerPhone } = body;

      const referenceId = `PANSA-INV-${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Simpan transaksi
      await prisma.transaction.create({
        data: {
          invoiceId: referenceId,
          productCode,
          customerPhone,
          amount,
          paymentStatus: "PENDING",
        },
      });

      // Siapkan payload DompetX
      const payload = {
        method,
        amount,
        currency: "IDR",
        reference: referenceId,
        metadata: {
          customer_phone: customerPhone,
          product_code: productCode,
        },
      };
      const payloadString = JSON.stringify(payload);

      // Generate signature
      const signatureData = `${timestamp}.${payloadString}`;
      const signature = crypto
        .createHmac("sha256", DOMPETX_API_KEY)
        .update(signatureData)
        .digest("hex");

      // Panggil API DompetX
      const response = await fetch(`${DOMPETX_BASE_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DOMPAY-API-Key": DOMPETX_API_KEY,
          "X-DOMPAY-Signature": signature,
          "X-DOMPAY-Timestamp": timestamp,
          "Idempotency-Key": `idemp-${referenceId}`,
        },
        body: payloadString,
      });

      const paymentData = await response.json();

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          message: "Gagal memproses pembayaran",
          error: paymentData,
        }, { status: response.status });
      }

      return NextResponse.json({ success: true, payment: paymentData });

    } catch (error) {
      console.error("Checkout Error:", error);
      return NextResponse.json({
        success: false,
        message: "Terjadi kesalahan saat checkout",
      }, { status: 500 });
    }
  }

  // ==================== WEBHOOK ====================
  else if (action === 'webhook') {
    try {
      const rawBody = await request.text();
      const payload = JSON.parse(rawBody);

      const { reference, status } = payload;

      if (reference && status) {
        await prisma.transaction.update({
          where: { invoiceId: reference },
          data: { paymentStatus: status.toUpperCase() },
        });

        // TODO: Jika status PAID, panggil API Premify di sini
        if (status.toUpperCase() === "PAID") {
          // nanti kita isi logika eksekusi order ke Premify
        }
      }

      return new NextResponse("OK", { status: 200 });

    } catch (error) {
      console.error("Webhook Error:", error);
      return new NextResponse("Webhook Error", { status: 500 });
    }
  }

  // ==================== ACTION TIDAK VALID ====================
  else {
    return NextResponse.json({
      success: false,
      message: "Invalid action parameter",
    }, { status: 400 });
  }
}
