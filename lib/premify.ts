import prisma from "@/lib/prisma";

// Base URL sesuai dokumentasi API Premify
const PREMIFY_BASE_URL = "https://premify.store/api/v1";

/**
 * Fungsi utama untuk meneruskan pesanan ke Premify setelah pembayaran QRIS sukses.
 * @param transactionId ID (Integer) dari tabel Transaction
 * @param variantId Kode varian atau ID produk (productCode dari DB)
 */
export async function processPremifyOrder(transactionId: number, variantId: string) {
  try {
    // 1. Tarik data transaksi dan pengaturan aplikasi
    const [transaction, settings] = await Promise.all([
      prisma.transaction.findUnique({
        where: { id: transactionId },
      }),
      prisma.appSetting.findFirst(),
    ]);

    if (!transaction) {
      throw new Error(`Transaksi dengan ID ${transactionId} tidak ditemukan.`);
    }

    // Mengambil API Key dari tabel AppSetting sesuai skema Prisma kamu
    const apiKey = settings?.premifyApiKey;
    if (!apiKey) {
      throw new Error("API Key Premify belum dikonfigurasi di pengaturan aplikasi.");
    }

    // 2. Ekstrak targetId (Email/WA) dari productDetails untuk produk tipe "Invite"
    let emailInvite = undefined;
    if (transaction.productDetails) {
      try {
        const details = typeof transaction.productDetails === "string" 
          ? JSON.parse(transaction.productDetails) 
          : transaction.productDetails;
        
        // Dokumentasi Premify mewajibkan email_invite untuk produk tipe Invite (Canva, dll)
        emailInvite = details.targetId;
      } catch (e) {
        console.warn("[Premify SDK] Gagal parsing productDetails:", e);
      }
    }

    // 3. Siapkan Payload untuk endpoint /order
    // Parameter is_test diset false untuk production. Jika ingin Sandbox, ganti menjadi true.
    const payload: any = {
      api_key: apiKey,
      variant_id: variantId,
      quantity: 1,
      is_test: false, // Ubah ke true jika ingin testing tanpa memotong saldo asli
    };

    if (emailInvite) {
      payload.email_invite = emailInvite;
    }

    console.log(`[Premify SDK] Mengirim request order untuk varian: ${variantId}...`);

    // 4. Eksekusi HTTP POST Request ke Premify
    const response = await fetch(`${PREMIFY_BASE_URL}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // 5. Evaluasi Hasil dari Premify
    if (response.ok && result.success) {
      console.log(`[Premify SDK] ✅ Order sukses! Order ID Premify: ${result.data?.order_id}`);

      // Update status di database kita menjadi COMPLETED dan simpan ID Order Premify
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { 
          premifyStatus: "COMPLETED",
          premifyOrderId: result.data?.order_id 
        },
      });

      return { success: true, data: result.data };
    } else {
      // Jika Premify menolak (misal: saldo tidak cukup atau variant tidak valid)
      console.error(`[Premify SDK] 🚨 Order gagal. Pesan: ${result.message}`);
      
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { premifyStatus: "FAILED" },
      });

      return { success: false, message: result.message };
    }
  } catch (error: any) {
    console.error("[Premify SDK] Exception saat memproses order:", error.message);
    
    // Fallback status gagal jika terjadi exception jaringan/server
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { premifyStatus: "FAILED" },
    }).catch(e => console.error("Gagal update DB status fallback:", e));

    return { success: false, message: error.message };
  }
}
