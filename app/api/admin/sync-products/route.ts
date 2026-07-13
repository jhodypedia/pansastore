import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    // 1. Cek autentikasi & role admin
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Ambil API Key Premify dari setting
    const settings = await prisma.appSetting.findFirst();
    
    if (!settings?.premifyApiKey) {
      return NextResponse.json({ 
        success: false, 
        message: "API Key Premify belum diatur di pengaturan" 
      }, { status: 400 });
    }

    // 3. Ambil data produk dari Premify
    const res = await fetch('https://premifystore.id/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: settings.premifyApiKey })
    });

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ 
        success: false, 
        message: data.message || "Gagal mengambil data dari Premify" 
      }, { status: 400 });
    }

    const globalMarkup = settings.globalMarkup || 0;

    // 4. Proses dan simpan produk + variant
    for (const prod of data.data) {
      for (const variant of prod.variants) {
        const basePrice = variant.price;
        const sellPrice = basePrice + globalMarkup;

        await prisma.product.upsert({
          where: { id: variant.id },
          update: {
            name: `${prod.name} - ${variant.name}`,
            basePrice,
            sellPrice,
            stock: variant.stock,
            type: variant.type,
            // Update image & description
            imageUrl: prod.image || prod.imageUrl || null,
            description: prod.description || null,
          },
          create: {
            id: variant.id,
            name: `${prod.name} - ${variant.name}`,
            category: prod.category || null,
            basePrice,
            markupValue: globalMarkup,
            sellPrice,
            stock: variant.stock,
            type: variant.type,
            // Simpan image & description
            imageUrl: prod.image || prod.imageUrl || null,
            description: prod.description || null,
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${data.data.length} produk berhasil disinkronisasi!` 
    });

  } catch (error) {
    console.error("[Sync Products Error]:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Terjadi kesalahan saat sinkronisasi produk" 
    }, { status: 500 });
  }
}
