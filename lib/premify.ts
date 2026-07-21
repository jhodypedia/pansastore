import prisma from "@/lib/prisma";
import axios from "axios";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";

const PREMIFY_BASE_URL = "https://premifystore.id/api/v1";

type TransactionProductDetails = {
  productId?: string;
  productName?: string;
  variantId?: string;
  variantName?: string;
  targetId?: string;
  customerPhone?: string;
  name?: string;
  sn?: string;
  error?: string;
  premifyCompletedAt?: string;
  premifyFailedAt?: string;
  premifyReconciledAt?: string;
  [key: string]: unknown;
};

type PremifyOrderResponse = {
  success: boolean;
  message?: string;
  data?: {
    order_id?: string;
    status?: string;
    payment_status?: string;
    total_amount?: number;
    current_balance?: number;
    is_test?: boolean;
    [key: string]: any;
  };
};

type PremifyTransactionItem = {
  order_id?: string;
  total_amount?: number;
  status?: string;
  payment_status?: string;
  products?: Array<{
    product_name?: string;
    variant_name?: string;
    type?: string;
    duration?: string;
    warranty?: string;
    price?: number;
    quantity?: number;
  }>;
  account_details?: Array<{
    product?: string;
    details?: Array<{
      title?: string;
      credentials?: Array<{
        label?: string;
        value?: string;
      }>;
    }>;
  }>;
  created_at?: string;
  [key: string]: any;
};

type PremifyTransactionsResponse = {
  success: boolean;
  message?: string;
  data?: PremifyTransactionItem[];
};

function safeParseProductDetails(value: unknown): TransactionProductDetails {
  try {
    if (!value) return {};
    if (typeof value === "string") {
      return JSON.parse(value);
    }
    if (typeof value === "object") {
      return value as TransactionProductDetails;
    }
    return {};
  } catch {
    return {};
  }
}

function normalizePremifyStatus(status?: string | null) {
  switch (String(status || "").trim().toLowerCase()) {
    case "completed":
    case "success":
      return "COMPLETED";
    case "processing":
      return "PROCESSING";
    case "failed":
      return "FAILED";
    case "cancelled":
    case "canceled":
      return "CANCELLED";
    case "pending":
      return "PENDING";
    default:
      return null;
  }
}

function normalizePaymentStatus(status?: string | null) {
  switch (String(status || "").trim().toLowerCase()) {
    case "paid":
      return "COMPLETED";
    case "completed":
      return "COMPLETED";
    case "pending":
      return "PENDING";
    case "failed":
      return "FAILED";
    case "cancelled":
    case "canceled":
      return "CANCELLED";
    case "expired":
      return "EXPIRED";
    default:
      return null;
  }
}

function extractAccountDetailsText(item?: PremifyTransactionItem | null) {
  const lines =
    item?.account_details?.flatMap((group) =>
      (group.details || []).flatMap((detail) =>
        (detail.credentials || [])
          .filter((cred) => cred?.label && cred?.value)
          .map((cred) => `${cred.label}: ${cred.value}`)
      )
    ) || [];

  return lines.length > 0 ? lines.join(" | ") : undefined;
}

async function getPremifyApiKey() {
  const settings = await prisma.appSetting.findFirst();
  const apiKey = process.env.PREMIFY_API_KEY || settings?.premifyApiKey || "";
  return apiKey;
}

export async function processPremifyOrder(transactionId: number, variantId: string) {
  console.log(
    `\n[PREMIFY ENTRY] Memulai proses order untuk Transaction ID: ${transactionId} | Variant: ${variantId}`
  );

  try {
    const [transaction, apiKey] = await Promise.all([
      prisma.transaction.findUnique({
        where: { id: transactionId },
      }),
      getPremifyApiKey(),
    ]);

    if (!transaction) {
      console.error("[PREMIFY ERROR] Transaksi tidak ditemukan di DB.");
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    if (!apiKey) {
      console.error("[PREMIFY ERROR] API Key Premify kosong di tabel AppSetting.");
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { premifyStatus: "FAILED" },
      }).catch(() => {});
      return { success: false, message: "API Key belum diatur." };
    }

    const details = safeParseProductDetails(transaction.productDetails);
    const emailInvite =
      String(
        details.targetId ||
          details.emailInvite ||
          details.customerEmail ||
          ""
      ).trim() || undefined;

    const payload: Record<string, any> = {
      api_key: apiKey,
      variant_id: String(variantId),
      quantity: 1,
      is_test: false,
    };

    if (emailInvite) {
      payload.email_invite = emailInvite;
    }

    console.log("[PREMIFY HTTP] Menembak endpoint /order...", {
      transactionId,
      invoiceId: transaction.invoiceId,
      payload,
    });

    const response = await axios.post<PremifyOrderResponse>(
      `${PREMIFY_BASE_URL}/order`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
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
      const premifyOrderId = String(response.data?.data?.order_id || "").trim();
      const nextPremifyStatus =
        normalizePremifyStatus(response.data?.data?.status) || "PROCESSING";

      console.log("[PREMIFY SUKSES]", {
        transactionId,
        invoiceId: transaction.invoiceId,
        premifyOrderId,
      });

      if (!premifyOrderId) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { premifyStatus: "FAILED" },
        });

        return {
          success: false,
          message: "Premify sukses tetapi order_id kosong.",
        };
      }

      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          premifyStatus: nextPremifyStatus,
          premifyOrderId,
        },
      });

      console.log("[PREMIFY MAP TERSIMPAN]", {
        transactionId,
        invoiceId: transaction.invoiceId,
        premifyOrderId,
        premifyStatus: nextPremifyStatus,
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

export async function reconcilePremifyTransaction(transactionId: number) {
  try {
    const [transaction, apiKey] = await Promise.all([
      prisma.transaction.findUnique({
        where: { id: transactionId },
      }),
      getPremifyApiKey(),
    ]);

    if (!transaction) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    if (!apiKey) {
      return { success: false, message: "API Key Premify belum diatur." };
    }

    const premifyOrderId = String(transaction.premifyOrderId || "").trim();

    if (!premifyOrderId) {
      return {
        success: false,
        message: "premifyOrderId belum tersedia pada transaksi ini.",
      };
    }

    const response = await axios.post<PremifyTransactionsResponse>(
      `${PREMIFY_BASE_URL}/transactions`,
      { api_key: apiKey },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
        validateStatus: () => true,
      }
    );

    console.log("[PREMIFY TRANSACTIONS RESPONSE]", {
      status: response.status,
      success: response.data?.success,
      message: response.data?.message,
      count: Array.isArray(response.data?.data) ? response.data.data.length : 0,
      transactionId,
      premifyOrderId,
    });

    if (!(response.status >= 200 && response.status < 300 && response.data?.success)) {
      return {
        success: false,
        message:
          response.data?.message ||
          `Premify /transactions merespons HTTP ${response.status}`,
      };
    }

    const providerItem = (response.data?.data || []).find(
      (item) => String(item?.order_id || "").trim() === premifyOrderId
    );

    if (!providerItem) {
      return {
        success: false,
        message: `Order ${premifyOrderId} tidak ditemukan di riwayat Premify.`,
      };
    }

    const currentDetails = safeParseProductDetails(transaction.productDetails);
    const nextPremifyStatus =
      normalizePremifyStatus(providerItem.status) || transaction.premifyStatus;
    const nextPaymentStatus =
      normalizePaymentStatus(providerItem.payment_status) || transaction.paymentStatus;

    const accountDetailsText = extractAccountDetailsText(providerItem);

    const nextDetails: TransactionProductDetails = {
      ...currentDetails,
      premifyReconciledAt: new Date().toISOString(),
    };

    if (nextPremifyStatus === "COMPLETED") {
      nextDetails.premifyCompletedAt =
        currentDetails.premifyCompletedAt || new Date().toISOString();
      if (accountDetailsText) {
        nextDetails.sn = accountDetailsText;
      }
      delete nextDetails.error;
    }

    if (nextPremifyStatus === "FAILED" || nextPremifyStatus === "CANCELLED") {
      nextDetails.premifyFailedAt =
        currentDetails.premifyFailedAt || new Date().toISOString();
      nextDetails.error =
        currentDetails.error ||
        "Pesanan digagalkan/dibatalkan oleh penyedia (Premify).";
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        premifyStatus: nextPremifyStatus,
        paymentStatus: nextPaymentStatus,
        productDetails: JSON.stringify(nextDetails),
      },
    });

    const productName =
      [currentDetails.productName, currentDetails.variantName]
        .filter(Boolean)
        .join(" - ") ||
      currentDetails.name ||
      "Produk Digital";

    const targetId = currentDetails.targetId || "-";
    const customerWA = updatedTransaction.customerPhone;

    if (
      nextPremifyStatus === "COMPLETED" &&
      transaction.premifyStatus !== "COMPLETED"
    ) {
      const msg = WATemplates.orderCompleted({
        invoiceId: updatedTransaction.invoiceId,
        productName,
        targetId,
        accountDetails: accountDetailsText || currentDetails.sn || undefined,
      });

      await sendWhatsAppMessage(customerWA, msg).catch((err) => {
        console.error(
          `[PREMIFY RECONCILE] Gagal kirim WA completed ${updatedTransaction.invoiceId}:`,
          err
        );
      });
    }

    if (
      (nextPremifyStatus === "FAILED" || nextPremifyStatus === "CANCELLED") &&
      transaction.premifyStatus !== "FAILED" &&
      transaction.premifyStatus !== "CANCELLED"
    ) {
      const msg = WATemplates.orderFailed({
        invoiceId: updatedTransaction.invoiceId,
        productName,
      });

      await sendWhatsAppMessage(customerWA, msg).catch((err) => {
        console.error(
          `[PREMIFY RECONCILE] Gagal kirim WA failed ${updatedTransaction.invoiceId}:`,
          err
        );
      });
    }

    return {
      success: true,
      message: "Sinkronisasi Premify berhasil.",
      transaction: updatedTransaction,
      provider: providerItem,
    };
  } catch (error: any) {
    console.error("[PREMIFY RECONCILE ERROR]", {
      message: error?.message,
      code: error?.code,
      responseStatus: error?.response?.status,
      responseData: error?.response?.data,
      stack: error?.stack,
    });

    return {
      success: false,
      message: error?.message || "Gagal sinkronisasi status Premify.",
    };
  }
}
