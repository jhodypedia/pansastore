import prisma from "@/lib/prisma";

const PREMIFY_BASE_URL = "https://premify.store/api/v1";

export async function processPremifyOrder(transactionId: number, variantId: string) {
  // LOG ENTRY POINT: Jika log ini tidak muncul, berarti route.ts tidak memanggil fungsi ini!
  console.log(`\n[PREMIFY ENTRY] Memulai proses order untuk Transaction ID: ${transactionId} | Variant: ${variantId}`);

  try {
    const [transaction, settings] = await Promise.all([
      prisma.transaction.findUnique({
        where: { id: transactionId },
      }),
      prisma.appSetting.findFirst(),
    ]);

    if (!transaction) {
      console.error("[PREMIFY ERROR] Transaksi tidak ditemukan di DB.");
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    const apiKey = settings?.premifyApiKey;
    if (!apiKey) {
      console.error("[PREMIFY ERROR] API Key Premify kosong di tabel AppSetting.");
      return { success: false, message: "API Key belum diatur." };
    }

    let emailInvite = undefined;
    if (transaction.productDetails) {
      try {
        const details = typeof transaction.productDetails === "string" 
          ? JSON.parse(transaction.productDetails) 
          : transaction.productDetails;
        
        emailInvite = details.targetId;
      } catch (e) {
        console.warn("[PREMIFY WARN] Gagal parsing productDetails:", e);
      }
    }

    // PAYLOAD PREMIFY
    const payload: any = {
      api_key: apiKey,
      variant_id: variantId,
      quantity: 1,
      // SEMENTARA KITA SET TRUE UNTUK TESTING AGAR SALDO ASLIMU TIDAK TERPOTONG
      is_test: false, 
    };

    if (emailInvite) {
      payload.email_invite = emailInvite;
    }

    console.log(`[PREMIFY HTTP] Menembak endpoint /order...`, payload);

    // FIX NEXT.JS CACHING: Tambahkan cache: 'no-store'
    const response = await fetch(`${PREMIFY_BASE_URL}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store", // Wajib agar request selalu baru (tidak di-cache)
    });

    const result = await response.json();
    console.log(`[PREMIFY RESPONSE] Status HTTP: ${response.status}`, result);

    if (response.ok && result.success) {
      console.log(`[PREMIFY SUKSES] Order ID Premify: ${result.data?.order_id}`);

      await prisma.transaction.update({
        where: { id: transactionId },
        data: { 
          premifyStatus: "COMPLETED",
          premifyOrderId: result.data?.order_id 
        },
      });

      return { success: true, data: result.data };
    } else {
      console.error(`[PREMIFY DITOLAK] Pesan dari Premify:`, result.message);
      
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { premifyStatus: "FAILED" },
      });

      return { success: false, message: result.message };
    }
  } catch (error: any) {
    console.error("[PREMIFY EXCEPTION] Terjadi crash di fungsi:", error.message);
    
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { premifyStatus: "FAILED" },
    }).catch(() => {}); // Silent catch

    return { success: false, message: error.message };
  }
}
