import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { pakasirSDK } from '@/lib/pakasir';
import { sendWhatsAppMessage, WATemplates } from '@/lib/whatsapp';
import { processPremifyOrder } from '@/lib/premify';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Payload bukan JSON valid' },
        { status: 400 }
      );
    }

    const { order_id, status, project, is_sandbox } = body;

    if (!order_id || !status || !project) {
      console.warn('[Webhook Pakasir] Payload tidak lengkap:', body);
      return NextResponse.json(
        { error: 'Payload tidak valid' },
        { status: 400 }
      );
    }

    if (status !== 'completed') {
      return NextResponse.json({
        received: true,
        message: 'Bukan status completed, diabaikan.',
      });
    }

    const [transaction, settings] = await Promise.all([
      prisma.transaction.findUnique({
        where: { invoiceId: order_id },
      }),
      prisma.appSetting.findFirst(),
    ]);

    if (!transaction) {
      console.error(
        `[Webhook Pakasir] Transaksi ${order_id} tidak ditemukan.`
      );
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!settings?.pakasirApiKey || !settings?.pakasirProjectSlug) {
      console.error(
        '[Webhook Pakasir] Kredensial API Pakasir belum dikonfigurasi.'
      );
      return NextResponse.json(
        { error: 'Sistem belum siap' },
        { status: 500 }
      );
    }

    if (project !== settings.pakasirProjectSlug) {
      console.warn(
        `[Webhook Pakasir] Project tidak cocok. Diterima: "${project}", Diharapkan: "${settings.pakasirProjectSlug}"`
      );
      return NextResponse.json(
        { error: 'Project tidak valid' },
        { status: 400 }
      );
    }

    if (transaction.paymentStatus === 'COMPLETED') {
      return NextResponse.json({
        received: true,
        message: 'Transaksi sudah pernah diproses sebelumnya.',
      });
    }

    const dbAmount = Number(transaction.amount);

    const verification = await pakasirSDK.checkTransaction({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id,
      amount: dbAmount,
    });

    const apiTransaction = verification?.data?.transaction;
    const apiAmount = Number(apiTransaction?.amount);

    console.log(`\n=== DEBUG VERIFIKASI PAKASIR [${order_id}] ===`);
    console.log('1. Verification OK?  :', verification?.ok);
    console.log('2. Status API        :', apiTransaction?.status);
    console.log('3. Is Sandbox?       :', is_sandbox);
    console.log('4. Amount API        :', apiAmount);
    console.log('5. Amount DB         :', dbAmount);
    console.log('==================================================\n');

    if (
      !verification?.ok ||
      apiTransaction?.status !== 'completed' ||
      apiAmount !== dbAmount
    ) {
      console.warn(
        `[Webhook Pakasir] Verifikasi gagal untuk order_id: ${order_id}`
      );
      return NextResponse.json(
        { error: 'Verifikasi transaksi gagal' },
        { status: 400 }
      );
    }

    const updateResult = await prisma.transaction.updateMany({
      where: {
        id: transaction.id,
        paymentStatus: { not: 'COMPLETED' },
      },
      data: {
        paymentStatus: 'COMPLETED',
        premifyStatus: 'PROCESSING',
      },
    });

    if (updateResult.count === 0) {
      console.log(
        `[Webhook Pakasir] Transaksi ${order_id} sudah diproses request lain.`
      );
      return NextResponse.json({
        received: true,
        message: 'Sudah diproses sebelumnya (race-safe).',
      });
    }

    try {
      console.log(
        `[Webhook Pakasir] Meneruskan order ${order_id} ke sistem Premify...`
      );

      const premifyResult = await processPremifyOrder(
        transaction.id,
        transaction.productCode
      );

      if (!premifyResult?.success) {
        console.error(
          `[Webhook Pakasir] Premify gagal untuk ${order_id}:`,
          premifyResult
        );

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { premifyStatus: 'FAILED' },
        });
      } else {
        console.log(
          `[Webhook Pakasir] Order ${order_id} berhasil diteruskan ke Premify.`
        );
      }
    } catch (premifyError: any) {
      console.error(
        `[Webhook Pakasir] Gagal memproses Premify untuk ${order_id}:`,
        premifyError
      );

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { premifyStatus: 'FAILED' },
      });
    }

    try {
      let productName = 'Produk Digital';

      if (transaction.productDetails) {
        try {
          const parsed =
            typeof transaction.productDetails === 'string'
              ? JSON.parse(transaction.productDetails)
              : transaction.productDetails;

          productName =
            [parsed.productName, parsed.variantName]
              .filter(Boolean)
              .join(' - ') || parsed.name || productName;
        } catch (parseError) {
          console.warn(
            `[Webhook Pakasir] Gagal parse productDetails untuk ${order_id}:`,
            parseError
          );
        }
      }

      const processingMessage = WATemplates.orderProcessing({
        invoiceId: order_id,
        productName,
      });

      await sendWhatsAppMessage(transaction.customerPhone, processingMessage);

      console.log(
        `[Webhook Pakasir] Pembayaran ${order_id} sukses. WA processing terkirim.`
      );
    } catch (waError) {
      console.error(
        `[Webhook Pakasir] Pembayaran sukses tapi gagal kirim WA ${order_id}:`,
        waError
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook berhasil diproses.',
    });
  } catch (error: any) {
    console.error('[Webhook Pakasir] Terjadi kesalahan internal:', {
      name: error?.name,
      message: error?.message,
      cause: error?.cause,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
