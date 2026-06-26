import prisma from "@/lib/prisma";

// Base URL sesuai dokumentasi Premify
const PREMIFY_BASE_URL = "https://premify.store/api/v1"; [span_4](start_span)//[span_4](end_span)

/**
 * Fungsi utama untuk meneruskan pesanan ke Premify setelah pembayaran sukses.
 * @param transactionId ID dari tabel Transaction di database kita
 * @param variantId Kode varian atau ID produk dari Premify (premifySkuCode)
 */
export async function processPremifyOrder(transactionId: string, variantId: string) {
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

    // Pastikan kamu memiliki kolom premifyApiKey di tabel AppSetting atau gunakan .env
    const apiKey = settings?.premifyApiKey || process.env.PREMIFY_API_KEY;
    if (!apiKey) {
      throw new Error("API Key Premify belum dikonfigurasi.");
    }

    // 2. Ekstrak targetId (Email/WA) dari productDetails untuk produk tipe "Invite"
    let emailInvite = undefined;
    if (transaction.productDetails) {
      try {
        const details = typeof transaction.productDetails === "string" 
          ? JSON.parse(transaction.productDetails) 
          : transaction.productDetails;
        
        // Dokumentasi Premify mewajibkan email_invite untuk produk tipe Invite
        emailInvite = details.targetId; [span_5](start_span)[span_6](start_span)//[span_5](end_span)[span_6](end_span)
      } catch (e) {
        console.warn("[Premify SDK] Gagal parsing productDetails:", e);
      }
    }

    // 3. Siapkan Payload untuk endpoint /order
    // Parameter is_test diset false untuk production. Jika ingin Sandbox, ganti menjadi true.
    const payload: any = {
      [span_7](start_span)api_key: apiKey, //[span_7](end_span)
      [span_8](start_span)variant_id: variantId, //[span_8](end_span)
      [span_9](start_span)quantity: 1, //[span_9](end_span)
      [span_10](start_span)[span_11](start_span)is_test: false, // Ubah ke true jika ingin testing tanpa memotong saldo asli[span_10](end_span)[span_11](end_span)
    };

    if (emailInvite) {
      payload.email_invite = emailInvite; [span_12](start_span)//[span_12](end_span)
    }

    console.log(`[Premify SDK] Mengirim request order untuk varian: ${variantId}...`);

    // 4. Eksekusi HTTP POST Request ke Premify
    [span_13](start_span)const response = await fetch(`${PREMIFY_BASE_URL}/order`, { //[span_13](end_span)
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // 5. Evaluasi Hasil dari Premify
    if (response.ok && result.success) {
      console.log(`[Premify SDK] ✅ Order sukses! Order ID Premify: ${result.data?.order_id}`); [span_14](start_span)//[span_14](end_span)

      // Update status di database kita menjadi SUCCESS
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { 
          premifyStatus: "COMPLETED",
          // Opsional: Simpan Order ID dari Premify ke catatan/detail untuk tracking
          // productDetails: JSON.stringify({ ...details, premifyOrderId: result.data.order_id })
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
