import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { pakasirSDK } from '@/lib/pakasir'; // Menggunakan SDK yang sudah kita buat

export async function POST(request: Request) {
  try {
    // Memastikan default method adalah 'qris'
    const { variant_id, customerPhone, method = "qris" } = await request.json();

    // 1. Ambil setting dan produk dari database
    const settings = await prisma.appSetting.findFirst();
    const product = await prisma.product.findUnique({
      where: { id: variant_id },
    });

    // Validasi kesiapan sistem
    if (!settings?.pakasirApiKey || !settings?.pakasirProjectSlug || !product) {
      return NextResponse.json({
        success: false,
        message: "Sistem belum siap atau produk tidak ditemukan",
      }, { status: 400 });
    }

    const referenceId = `PANSA-${Date.now()}`;
    const amount = product.sellPrice;

    // 2. Buat transaksi di database
    await prisma.transaction.create({
      data: {
        invoiceId: referenceId,
        productCode: product.id,
        customerPhone,
        amount,
        paymentStatus: "PENDING",
        premifyStatus: "PENDING",
        // Menggunakan format JSON productDetails sesuai dengan schema terbaru Anda
        productDetails: JSON.stringify({
          name: product.name,
          targetId: customerPhone, // Asumsi default targetId adalah nomor HP
        }),
      },
    });

    // 3. Panggil API Pakasir menggunakan SDK
    let paymentResult;
    
    if (method.toLowerCase() === "qris") {
      paymentResult = await pakasirSDK.createQris({
        project: settings.pakasirProjectSlug,
        api_key: settings.pakasirApiKey,
        order_id: referenceId,
        amount: amount,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Metode pembayaran ${method} belum didukung`,
      }, { status: 400 });
    }

    // 4. Tangani respons dari Pakasir
    if (!paymentResult.ok || !paymentResult.data?.payment) {
       console.error("[Pakasir API Error]:", paymentResult.data);
       
       // Update status menjadi FAILED jika gateway menolak
       await prisma.transaction.update({
         where: { invoiceId: referenceId },
         data: { paymentStatus: "FAILED" },
       });

       return NextResponse.json({
         success: false,
         message: paymentResult.data?.message || "Gagal membuat transaksi di payment gateway",
       }, { status: 400 });
    }

    // 5. Kembalikan data payment ke client
    return NextResponse.json({
      success: true,
      payment: paymentResult.data.payment, 
      referenceId,
    });

  } catch (error: any) {
    console.error("[API Checkout Error]:", error.message || error);
    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan internal pada server checkout",
    }, { status: 500 });
  }
}
