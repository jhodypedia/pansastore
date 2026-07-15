import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import pLimit from 'p-limit';

type PremifyVariant = {
  id: string | number;
  name: string;
  duration?: string | null;
  type?: string | null;
  warranty?: string | null;
  price: number | string;
  stock: number | string;
};

type PremifyProduct = {
  id?: string | number;
  name: string;
  category?: string | null;
  description?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  variants?: PremifyVariant[];
};

type PremifyResponse = {
  success: boolean;
  message?: string;
  data?: PremifyProduct[];
};

export async function POST() {
  try {
    const session = await auth();

    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.appSetting.findFirst();

    if (!settings?.premifyApiKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'API Key Premify belum diatur di pengaturan',
        },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let res: Response;

    try {
      res = await fetch('https://premifystore.id/api/v1/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          api_key: settings.premifyApiKey,
        }),
        signal: controller.signal,
        cache: 'no-store',
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const raw = await res.text();
      console.error('[Premify HTTP Error]', {
        status: res.status,
        statusText: res.statusText,
        body: raw.slice(0, 1000),
      });

      return NextResponse.json(
        {
          success: false,
          message: `Premify merespons HTTP ${res.status}`,
        },
        { status: 502 }
      );
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      const raw = await res.text();
      console.error('[Premify Invalid Content-Type]', {
        contentType,
        body: raw.slice(0, 1000),
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Premify mengembalikan response non-JSON',
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as PremifyResponse;

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'Gagal mengambil data dari Premify',
        },
        { status: 400 }
      );
    }

    const products = Array.isArray(data.data) ? data.data : [];
    const globalMarkup = Number(settings.globalMarkup || 0);

    const limit = pLimit(10);
    let totalProducts = 0;
    let totalVariants = 0;

    await Promise.all(
      products.map((prod, index) =>
        limit(async () => {
          const productId =
            prod.id !== undefined && prod.id !== null
              ? String(prod.id)
              : `premify-product-${index}-${prod.name}`;

          await prisma.product.upsert({
            where: { id: productId },
            update: {
              name: prod.name,
              category: prod.category || null,
              description: prod.description || null,
              imageUrl: prod.image || prod.imageUrl || null,
            },
            create: {
              id: productId,
              name: prod.name,
              category: prod.category || null,
              description: prod.description || null,
              imageUrl: prod.image || prod.imageUrl || null,
              basePrice: 0,
              markupValue: globalMarkup,
              sellPrice: 0,
              type: null,
              stock: 0,
            },
          });

          totalProducts++;

          const variants = Array.isArray(prod.variants) ? prod.variants : [];

          await Promise.all(
            variants.map((variant) =>
              limit(async () => {
                const variantId = String(variant.id);
                const basePrice = Number(variant.price || 0);
                const stock = Number(variant.stock || 0);

                await prisma.variant.upsert({
                  where: { id: variantId },
                  update: {
                    productId,
                    name: variant.name,
                    duration: variant.duration || '-',
                    type: variant.type || '-',
                    warranty: variant.warranty || '-',
                    price: basePrice + globalMarkup,
                    stock,
                  },
                  create: {
                    id: variantId,
                    productId,
                    name: variant.name,
                    duration: variant.duration || '-',
                    type: variant.type || '-',
                    warranty: variant.warranty || '-',
                    price: basePrice + globalMarkup,
                    stock,
                  },
                });

                totalVariants++;
              })
            )
          );

          const firstVariant = variants[0];
          const firstBasePrice = Number(firstVariant?.price || 0);
          const totalStock = variants.reduce(
            (sum, v) => sum + Number(v.stock || 0),
            0
          );

          await prisma.product.update({
            where: { id: productId },
            data: {
              basePrice: firstBasePrice,
              markupValue: globalMarkup,
              sellPrice: firstBasePrice + globalMarkup,
              type: firstVariant?.type || null,
              stock: totalStock,
            },
          });
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `${totalProducts} produk dan ${totalVariants} varian berhasil disinkronisasi`,
    });
  } catch (error: any) {
    console.error('[Sync Products Error]', {
      name: error?.name,
      message: error?.message,
      cause: error?.cause,
      stack: error?.stack,
    });

    if (error?.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Request ke Premify timeout',
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan saat sinkronisasi produk',
      },
      { status: 500 }
    );
  }
}
