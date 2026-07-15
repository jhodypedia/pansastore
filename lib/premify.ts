import prisma from "@/lib/prisma";
import axios from "axios";

const PREMIFY_BASE_URL = "https://premifystore.id/api/v1";

type PremifyOrderResponse = {
  success: boolean;
  message?: string;
  data?: {
    order_id?: string;
    [key: string]: any;
  };
};

export async function processPremifyOrder(transactionId: number, variantId: string) {
  console.log(
    `\n[PREMIFY ENTRY] Memulai proses order untuk Transaction ID: ${transactionId} | Variant: ${variantId}`
  );

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
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { premifyStatus: "FAILED" },
      }).catch(() => {});
      return { success: false, message: "API Key belum diatur." };
    }

    let emailInvite: string | undefined;

    if (transaction.productDetails) {
      try {
        const details =
          typeof transaction.productDetails === "string"
            ? JSON.parse(transaction.productDetails)
            : transaction.productDetails;

        emailInvite = details.targetId || details.emailInvite || details.customerEmail;
      } catch (e) {
        console.warn("[PREMIFY WARN] Gagal parsing productDetails:", e);
      }
    }

    const payload: Record<string, any> = {
      api_key: apiKey,
      variant_id: String(variantId),
      quantity: 1,
      is_test: false,
    };

    if (emailInvite) {
      payload.email_invite = emailInvite;
    }

    console.log("[PREMIFY HTTP] Menembak endpoint /order...", payload);

    const response = await axios.post<PremifyOrderResponse>(
      `${PREMIFY_BASE_URL}/order`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        timeout: 30000,
        validateStatus: () => true,
      }
    );

    console.log(
      `[PREMIFY RESPONSE] Status HTTP: ${response.status}`,
      response.data
    );

    if (response.status >= 200 && response.status < 300 && response.data?.success) {
      console.log(`[PREMIFY SUKSES] Order ID Premify: ${response.data?.data?.order_id}`);

      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          premifyStatus: "PROCESSING",
          premifyOrderId: response.data?.data?.order_id || null,
        },
      });

      return { success: true, data: response.data?.data };
    }

    console.error("[PREMIFY DITOLAK] Pesan dari Premify:", response.data?.message);

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { premifyStatus: "FAILED" },
    });

    return {
      success: false,
      message:
        response.data?.message ||
        `Premify merespons HTTP ${response.status}`,
    };
  } catch (error: any) {
    console.error("[PREMIFY EXCEPTION] Terjadi crash di fungsi:", {
      message: error?.message,
      code: error?.code,
      responseStatus: error?.response?.status,
      responseData: error?.response?.data,
      stack: error?.stack,
    });

    await prisma.transaction
      .update({
        where: { id: transactionId },
        data: { premifyStatus: "FAILED" },
      })
      .catch(() => {});

    return {
      success: false,
      message: error?.message || "Terjadi kesalahan saat order ke Premify",
    };
  }
}
