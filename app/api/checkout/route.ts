import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { pakasirSDK } from '@/lib/pakasir';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      variant_id,
      customerPhone,
      method = 'qris',
    } = body ?? {};

    if (!variant_id || !customerPhone) {
      return NextResponse.json(
        {
          success: false,
          message: 'variant_id dan customerPhone wajib diisi',
        },
        { status: 400 }
      );
    }

    if (typeof customerPhone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'customerPhone tidak valid',
        },
        { status: 400 }
      );
    }

    const normalizedMethod = String(method).toLowerCase();

    const settings = await prisma.appSetting.findFirst();
    const variant = await prisma.variant.findUnique({
      where: { id: String(variant_id) },
      include: { product: true },
    });

    if (!settings?.pakasirApiKey || !settings?.pakasirProjectSlug) {
      return NextResponse.json(
        {
          success: false,
          message: 'Sistem payment belum siap',
        },
        { status: 400 }
      );
    }

    if (!variant || !variant.product) {
      return NextResponse.json(
        {
          success: false,
          message: 'Variant produk tidak ditemukan',
        },
        { status: 404 }
      );
    }

    if (variant.stock <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Stok produk habis',
        },
        { status: 400 }
      );
    }

    if (normalizedMethod !== 'qris') {
      return NextResponse.json(
        {
          success: false,
          message: `Metode pembayaran ${method} belum didukung`,
        },
        { status: 400 }
      );
    }

    const referenceId = `PANSA-${Date.now()}`;
    const amount = Number(variant.price);

    await prisma.transaction.create({
      data: {
        invoiceId: referenceId,
        productCode: variant.id,
        customerPhone,
        amount,
        paymentStatus: 'PENDING',
        premifyStatus: 'PENDING',
        productDetails: JSON.stringify({
          productId: variant.product.id,
          productName: variant.product.name,
          variantId: variant.id,
          variantName: variant.name,
          duration: variant.duration,
          type: variant.type,
          warranty: variant.warranty,
          targetId: customerPhone,
        }),
      },
    });

    const paymentResult = await pakasirSDK.createQris({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id: referenceId,
      amount,
    });

    if (!paymentResult?.ok || !paymentResult?.data?.payment) {
      console.error('[Pakasir API Error]:', paymentResult?.data);

      await prisma.transaction.update({
        where: { invoiceId: referenceId },
        data: { paymentStatus: 'FAILED' },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            paymentResult?.data?.message ||
            'Gagal membuat transaksi di payment gateway',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: paymentResult.data.payment,
      referenceId,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        imageUrl: variant.product.imageUrl,
      },
      variant: {
        id: variant.id,
        name: variant.name,
        duration: variant.duration,
        type: variant.type,
        warranty: variant.warranty,
        price: variant.price,
      },
    });
  } catch (error: any) {
    console.error('[API Checkout Error]:', {
      name: error?.name,
      message: error?.message,
      cause: error?.cause,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan internal pada server checkout',
      },
      { status: 500 }
    );
  }
}
