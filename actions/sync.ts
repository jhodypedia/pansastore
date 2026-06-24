"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function syncPremifyProducts() {
  try {
    // 1. Ambil pengaturan API Key & Markup
    const settings = await prisma.appSetting.findFirst();
    if (!settings?.premifyApiKey) {
      return { success: false, message: "API Key Premify belum diatur di Pengaturan." };
    }

    // 2. Tembak API Premify
    const res = await fetch('https://premify.store/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: settings.premifyApiKey })
    });

    const data = await res.json();
    if (!data.success || !data.data) {
      return { success: false, message: "Gagal mengambil data dari server Premify." };
    }

    const globalMarkup = settings.globalMarkup || 0;
    let syncCount = 0;

    // 3. Looping dan simpan ke Database MySQL (Upsert: Update jika ada, Create jika baru)
    for (const prod of data.data) {
      for (const variant of prod.variants) {
        const basePrice = variant.price;
        const sellPrice = basePrice + globalMarkup;

        // Cek struktur key gambar (biasanya image_url atau imageUrl dari Premify)
        const productImage = prod.image_url || prod.imageUrl || null;
        const productDesc = prod.description || null;

        await prisma.product.upsert({
          where: { id: variant.id },
          update: { 
            basePrice, 
            sellPrice, 
            stock: variant.stock, 
            name: `${prod.name} - ${variant.name}`,
            markupValue: globalMarkup,
            // TAMBAHKAN INI AGAR DATABASE UPDATE GAMBAR & DESKRIPSI
            imageUrl: productImage,
            description: productDesc
          },
          create: {
            id: variant.id,
            name: `${prod.name} - ${variant.name}`,
            category: prod.category,
            basePrice,
            markupValue: globalMarkup,
            sellPrice,
            stock: variant.stock,
            type: variant.type,
            // TAMBAHKAN INI AGAR DATABASE SIMPAN GAMBAR & DESKRIPSI SAAT CREATE
            imageUrl: productImage,
            description: productDesc
          }
        });
        syncCount++;
      }
    }

    // 4. Refresh semua halaman yang menampilkan produk
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/");

    return { success: true, message: `Sinkronisasi selesai! ${syncCount} produk diperbarui.` };
  } catch (error) {
    console.error("Sync Error:", error);
    return { success: false, message: "Terjadi kesalahan server saat sinkronisasi." };
  }
}