import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const DOMPETX_API_KEY = process.env.DOMPETX_API_KEY!;
const DOMPETX_BASE_URL = 'https://api.dompetx.com/v1';

export async function POST(request: Request) {
  // Ambil query parameter dari URL (contoh: /api/dompetx?action=checkout)
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // =====================================================================
  // 1. BLOK LOGIKA UNTUK CHECKOUT (Dipanggil oleh Frontend PansaStore)
  // =====================================================================
  if (action === 'checkout') {
    try {
      const body = await request.json();
      const { method = "QRIS", amount, productCode, customerPhone } = body; 
      
      const referenceId = `PANSA-INV-${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Simpan transaksi awal
      await prisma.transaction.create({
        data: {
          invoiceId: referenceId,
          productCode,
          customerPhone,
          amount,
          paymentStatus: "PENDING",
        }
      });

      // Siapkan Payload API DompetX
      const payload = {
        method,
        amount,
        currency: "IDR",
        reference: referenceId,
        metadata: { customer_phone: customerPhone, product_code: productCode }
      };
      const payloadString = JSON.stringify(payload);

      // Generate Signature
      const signatureData = `${timestamp}.${payloadString}`;
      const signature = crypto.createHmac('sha256', DOMPETX_API_KEY)
                              .update(signatureData)
                              .digest('hex');

      // Tembak API DompetX
      const response = await fetch(`${DOMPETX_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DOMPAY-API-Key': DOMPETX_API_KEY,
          'X-DOMPAY-Signature': signature,
          'X-DOMPAY-Timestamp': timestamp,
          'Idempotency-Key': `idemp-${referenceId}`
        },
        body: payloadString
      });

      const paymentData = await response.json();

      if (!response.ok) {
        return NextResponse.json({ success: false, message: "Gagal memproses ke payment gateway", error: paymentData }, { status: response.status });
      }

      return NextResponse.json({ success: true, payment: paymentData });

    } catch (error) {
      console.error("Checkout Error:", error);
      return NextResponse.json({ success: false, message: "Terjadi kesalahan sistem saat checkout" }, { status: 500 });
    }
  }

  // =====================================================================
  // 2. BLOK LOGIKA UNTUK WEBHOOK (Dipanggil otomatis oleh server DompetX)
  // =====================================================================
  else if (action === 'webhook') {
    try {
      // Ambil body mentah untuk validasi jika diperlukan nanti
      const rawBody = await request.text(); 
      const payload = JSON.parse(rawBody);
      
      const { reference, status } = payload;

      // Update status di database berdasarkan reference/invoiceId
      if (reference && status) {
        await prisma.transaction.update({
          where: { invoiceId: reference },
          data: { paymentStatus: status.toUpperCase() }
        });

        // TODO: Eksekusi API Premify di sini jika status === 'PAID'
      }

      // Selalu kembalikan 200 OK agar DompetX tahu webhook sudah diterima
      return new NextResponse('OK', { status: 200 });

    } catch (error) {
      console.error("Webhook Error:", error);
      return new NextResponse('Webhook Error', { status: 500 });
    }
  }

  // =====================================================================
  // 3. JIKA ACTION TIDAK DIKENALI
  // =====================================================================
  else {
    return NextResponse.json({ success: false, message: "Invalid action parameter" }, { status: 400 });
  }
}