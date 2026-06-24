import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await prisma.appSetting.findFirst();
    if (!settings?.premifyApiKey) return NextResponse.json({ success: false, message: "API Key Premify belum diatur" }, { status: 400 });

    const res = await fetch('https://premify.store/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: settings.premifyApiKey })
    });
    
    const data = await res.json();
    if (!data.success) return NextResponse.json(data);

    const globalMarkup = settings.globalMarkup;

    for (const prod of data.data) {
      for (const variant of prod.variants) {
        const basePrice = variant.price;
        const sellPrice = basePrice + globalMarkup; 

        await prisma.product.upsert({
          where: { id: variant.id },
          update: { basePrice, sellPrice, stock: variant.stock, name: `${prod.name} - ${variant.name}` },
          create: {
            id: variant.id,
            name: `${prod.name} - ${variant.name}`,
            category: prod.category,
            basePrice,
            markupValue: globalMarkup,
            sellPrice,
            stock: variant.stock,
            type: variant.type
          }
        });
      }
    }
    return NextResponse.json({ success: true, message: "Produk tersinkronisasi!" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Sync Error" }, { status: 500 });
  }
}