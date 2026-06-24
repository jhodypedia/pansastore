// lib/pakasir.ts

interface PakasirQrisPayload {
  project: string;
  api_key: string;
  order_id: string;
  amount: number;
}

interface PakasirCheckPayload {
  project: string;
  api_key: string;
  order_id: string;
}

const PAKASIR_BASE_URL = "https://app.pakasir.com/api";

export const pakasirSDK = {
  /**
   * Membuat transaksi QRIS baru
   */
  createQris: async (payload: PakasirQrisPayload) => {
    try {
      const response = await fetch(`${PAKASIR_BASE_URL}/transactioncreate/qris`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      console.error("[Pakasir SDK] Create QRIS Error:", error);
      throw error;
    }
  },

  /**
   * Mengecek detail transaksi (Bisa digunakan untuk Webhook Validation atau Polling)
   */
  checkTransaction: async (payload: PakasirCheckPayload) => {
    try {
      // API Transaction Detail di Pakasir menggunakan method GET dengan query params
      const queryParams = new URLSearchParams({
        project: payload.project,
        api_key: payload.api_key,
        order_id: payload.order_id,
      }).toString();

      const response = await fetch(`${PAKASIR_BASE_URL}/transactiondetail?${queryParams}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      console.error("[Pakasir SDK] Check Transaction Error:", error);
      throw error;
    }
  },
};
