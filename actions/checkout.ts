"use server";

import "server-only";

import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import {
  sendInvoiceWithQris,
  sendWhatsAppMessage,
  WATemplates,
} from "@/lib/whatsapp";

type PaymentData = {
  order_id: string;
  amount: number;
  total_payment: number;
  fee: number;
  payment_number: string;
  expired_at: string;
  qris_image_url?: string | null;
  qr_string?: string | null;
};

type CheckoutResult =
  | {
      success: true;
      message: string;
      payment: PaymentData | null;
      invoiceId: string;
      invoiceUrl: string;
      amount: number;
      qrisImageUrl?: string | null;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

type ProductDetailsShape = {
  productId?: string | null;
  productName?: string | null;
  variantId?: string | null;
  variantName?: string | null;
  targetId?: string | null;
  customerPhone?: string | null;
  type?: string | null;
  duration?: string | null;
  warranty?: string | null;
  qrisImageUrl?: string | null;
  qris_image_url?: string | null;
  qr_string?: string | null;
  payment_number?: string | null;
  expired_at?: string | null;
  total_payment?: number | null;
  fee?: number | null;
  payment_provider?: string | null;
  payment_provider_status?: string | null;
  payment_created_at?: string | null;
  payment_order_id?: string | null;
  invoice_url?: string | null;
  payment_error?: string | null;
  [key: string]: unknown;
};

function normalizePhone(phone: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return null;
}

function normalizeUrl(value: unknown): string | null {
  const text = String(value || "").trim();
  if (!text) return null;

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  return null;
}

function generateInvoiceId(): string {
  const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `INV-PS-${datePrefix}-${rand}`;
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  try {
    if (!value) return fallback;
    if (typeof value === "string") return JSON.parse(value) as T;
    if (typeof value === "object") return value as T;
    return fallback;
  } catch {
    return fallback;
  }
}

function buildProductLabel(productName: string, variantName?: string | null) {
  const cleanProduct = String(productName || "").trim();
  const cleanVariant = String(variantName || "").trim();

  if (cleanProduct && cleanVariant && cleanVariant !== cleanProduct) {
    return `${cleanProduct} - ${cleanVariant}`;
  }

  return cleanProduct || cleanVariant || "Produk Digital";
}

async function resendPendingInvoiceToWhatsApp(params: {
  phone: string;
  invoiceId: string;
  invoiceUrl: string;
  amount: number;
  targetId: string;
  productName: string;
  variantName?: string | null;
  qrisImageUrl?: string | null;
}) {
  try {
    const waMessage = WATemplates.invoiceCreated({
      invoiceId: params.invoiceId,
      productName: buildProductLabel(params.productName, params.variantName),
      targetId: params.targetId,
      price: params.amount,
      paymentUrl: params.invoiceUrl,
    });

    console.log("[CHECKOUT WA RESEND PENDING]", {
      invoiceId: params.invoiceId,
      phone: params.phone,
      invoiceUrl: params.invoiceUrl,
      qrisImageUrl: params.qrisImageUrl || null,
    });

    if (params.qrisImageUrl) {
      void sendInvoiceWithQris({
        phone: params.phone,
        message: waMessage,
        qrisImageUrl: params.qrisImageUrl,
      }).catch((err) => {
        console.error(
          "[Checkout WA Error] Gagal kirim ulang invoice + QRIS:",
          err
        );
      });
      return;
    }

    void sendWhatsAppMessage(params.phone, waMessage).catch((err) => {
      console.error(
        "[Checkout WA Error] Gagal kirim ulang notifikasi invoice:",
        err
      );
    });
  } catch (error) {
    console.error("[Checkout WA Existing Pending Error]:", error);
  }
}

export async function processCheckout(formData: FormData): Promise<CheckoutResult> {
  try {
    const productId = String(formData.get("productId") || "").trim();
    const variantIdRaw = String(formData.get("variantId") || "").trim();
    const variantId = variantIdRaw || null;
    const targetId = String(formData.get("targetId") || "").trim();
    const whatsappRaw = String(formData.get("whatsapp") || "").trim();
    const method = String(formData.get("method") || "qris")
      .trim()
      .toLowerCase();

    if (!productId || !targetId || !whatsappRaw) {
      return {
        success: false,
        message: "Data checkout tidak lengkap. Harap isi semua field wajib.",
      };
    }

    const whatsapp = normalizePhone(whatsappRaw);

    if (!whatsapp) {
      return {
        success: false,
        message: "Nomor WhatsApp tidak valid.",
        fieldErrors: {
          whatsapp: ["Nomor WhatsApp tidak valid."],
        },
      };
    }

    if (method !== "qris") {
      return {
        success: false,
        message: `Metode pembayaran ${method} belum didukung sistem ini.`,
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!appUrl) {
      console.error("[Checkout Error] NEXT_PUBLIC_APP_URL belum diatur.");
      return {
        success: false,
        message: "Konfigurasi aplikasi belum lengkap. Hubungi admin.",
      };
    }

    const [settings, variant, product] = await Promise.all([
      prisma.appSetting.findFirst(),
      variantId
        ? prisma.variant.findUnique({
            where: { id: variantId },
            include: { product: true },
          })
        : Promise.resolve(null),
      prisma.product.findUnique({ where: { id: productId } }),
    ]);

    if (!settings?.pakasirProjectSlug || !settings?.pakasirApiKey) {
      console.error("[Checkout Error] Kredensial Pakasir belum diatur.");
      return {
        success: false,
        message: "Sistem pembayaran sedang dalam gangguan. Hubungi admin.",
      };
    }

    if (!product) {
      return {
        success: false,
        message: "Produk tidak ditemukan atau sudah tidak tersedia.",
      };
    }

    if (variantId) {
      if (!variant || !variant.product) {
        return {
          success: false,
          message: "Varian produk tidak ditemukan atau tidak tersedia.",
        };
      }

      if (variant.product.id !== productId) {
        return {
          success: false,
          message: "Varian tidak cocok dengan produk yang dipilih.",
        };
      }

      if ((variant.stock ?? 0) <= 0) {
        return {
          success: false,
          message: "Stok varian sedang habis.",
        };
      }
    } else {
      if ((product.stock ?? 0) <= 0) {
        return {
          success: false,
          message: "Stok produk sedang habis.",
        };
      }
    }

    const finalPrice = Number(variant ? variant.price : product.sellPrice);

    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      return {
        success: false,
        message: "Harga produk/varian tidak valid.",
      };
    }

    const productCode = variant ? variant.id : product.id;

    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        customerPhone: whatsapp,
        productCode,
        paymentStatus: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    const existingPending = pendingTransactions.find((tx) => {
      const details = safeJsonParse<ProductDetailsShape>(tx.productDetails, {});
      return String(details?.targetId || "").trim() === targetId;
    });

    if (existingPending) {
      const existingProductDetails = safeJsonParse<ProductDetailsShape>(
        existingPending.productDetails,
        {}
      );

      const existingInvoiceUrl =
        String(existingProductDetails?.invoice_url || "").trim() ||
        `${appUrl}/cek-pesanan?invoice=${encodeURIComponent(
          existingPending.invoiceId
        )}`;

      const existingQrisImageUrl =
        normalizeUrl(existingProductDetails?.qrisImageUrl) ||
        normalizeUrl(existingProductDetails?.qris_image_url) ||
        null;

      await resendPendingInvoiceToWhatsApp({
        phone: whatsapp,
        invoiceId: existingPending.invoiceId,
        invoiceUrl: existingInvoiceUrl,
        amount: Number(existingPending.amount),
        targetId,
        productName:
          String(existingProductDetails?.productName || "").trim() || product.name,
        variantName:
          String(existingProductDetails?.variantName || "").trim() ||
          variant?.name ||
          null,
        qrisImageUrl: existingQrisImageUrl,
      });

      return {
        success: true,
        message: "Invoice pending sebelumnya masih aktif.",
        payment: null,
        invoiceId: existingPending.invoiceId,
        invoiceUrl: existingInvoiceUrl,
        amount: Number(existingPending.amount),
        qrisImageUrl: existingQrisImageUrl,
      };
    }

    const invoiceId = generateInvoiceId();
    const invoiceUrl = `${appUrl}/cek-pesanan?invoice=${encodeURIComponent(invoiceId)}`;

    const productName = product.name;
    const variantName = variant?.name ?? product.name;
    const productType = variant?.type ?? product.type ?? null;
    const productDuration = variant?.duration ?? null;
    const productWarranty = variant?.warranty ?? null;

    await prisma.transaction.create({
      data: {
        invoiceId,
        productCode,
        customerPhone: whatsapp,
        amount: finalPrice,
        paymentStatus: "PENDING",
        premifyStatus: "PENDING",
        productDetails: JSON.stringify({
          productId: product.id,
          productName,
          variantId: variant?.id ?? null,
          variantName,
          targetId,
          customerPhone: whatsapp,
          type: productType,
          duration: productDuration,
          warranty: productWarranty,
          qrisImageUrl: null,
          qris_image_url: null,
          qr_string: null,
          payment_number: null,
          expired_at: null,
          total_payment: null,
          fee: null,
          payment_provider: "pakasir",
          payment_provider_status: "PENDING",
          payment_created_at: new Date().toISOString(),
          payment_order_id: null,
          invoice_url: invoiceUrl,
        } satisfies ProductDetailsShape),
      },
    });

    const paymentResult = await pakasirSDK.createQris({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id: invoiceId,
      amount: finalPrice,
    });

    if (!paymentResult?.ok || !paymentResult?.data?.payment) {
      console.error("[Checkout Error] Pakasir response:", paymentResult?.data);

      await prisma.transaction.update({
        where: { invoiceId },
        data: {
          paymentStatus: "FAILED",
          productDetails: JSON.stringify({
            productId: product.id,
            productName,
            variantId: variant?.id ?? null,
            variantName,
            targetId,
            customerPhone: whatsapp,
            type: productType,
            duration: productDuration,
            warranty: productWarranty,
            qrisImageUrl: null,
            qris_image_url: null,
            qr_string: null,
            payment_number: null,
            expired_at: null,
            total_payment: null,
            fee: null,
            payment_provider: "pakasir",
            payment_provider_status: "FAILED",
            payment_created_at: new Date().toISOString(),
            payment_order_id: invoiceId,
            invoice_url: invoiceUrl,
            payment_error:
              paymentResult?.data?.message ||
              "Gagal membuat invoice pembayaran.",
          } satisfies ProductDetailsShape),
        },
      });

      return {
        success: false,
        message:
          paymentResult?.data?.message || "Gagal membuat invoice pembayaran.",
      };
    }

    const paymentRaw = paymentResult.data.payment;

    const qrisImageUrl =
      normalizeUrl(paymentRaw?.qris_image_url) ||
      normalizeUrl(paymentRaw?.qrisImageUrl) ||
      normalizeUrl(paymentResult?.data?.qris_image_url) ||
      normalizeUrl(paymentResult?.data?.qrisImageUrl) ||
      null;

    const qrString =
      String(
        paymentRaw?.qr_string ||
          paymentRaw?.qr_string_value ||
          paymentRaw?.payment_number ||
          ""
      ).trim() || null;

    const payment: PaymentData = {
      order_id: String(paymentRaw.order_id || invoiceId),
      amount: Number(paymentRaw.amount || finalPrice),
      total_payment: Number(paymentRaw.total_payment || finalPrice),
      fee: Number(paymentRaw.fee || 0),
      payment_number: String(paymentRaw.payment_number || ""),
      expired_at: String(paymentRaw.expired_at || ""),
      qris_image_url: qrisImageUrl,
      qr_string: qrString,
    };

    await prisma.transaction.update({
      where: { invoiceId },
      data: {
        productDetails: JSON.stringify({
          productId: product.id,
          productName,
          variantId: variant?.id ?? null,
          variantName,
          targetId,
          customerPhone: whatsapp,
          type: productType,
          duration: productDuration,
          warranty: productWarranty,
          qrisImageUrl,
          qris_image_url: qrisImageUrl,
          qr_string: qrString,
          payment_number: payment.payment_number,
          expired_at: payment.expired_at,
          total_payment: payment.total_payment,
          fee: payment.fee,
          payment_provider: "pakasir",
          payment_provider_status: "PENDING",
          payment_created_at: new Date().toISOString(),
          payment_order_id: payment.order_id,
          invoice_url: invoiceUrl,
        } satisfies ProductDetailsShape),
      },
    });

    try {
      const waMessage = WATemplates.invoiceCreated({
        invoiceId,
        productName: buildProductLabel(productName, variantName),
        targetId,
        price: finalPrice,
        paymentUrl: invoiceUrl,
      });

      console.log("[CHECKOUT QRIS WA]", {
        invoiceId,
        whatsapp,
        qrisImageUrl,
        hasQrString: Boolean(qrString),
      });

      if (qrisImageUrl) {
        void sendInvoiceWithQris({
          phone: whatsapp,
          message: waMessage,
          qrisImageUrl,
        }).catch((err) => {
          console.error("[Checkout WA Error] Gagal kirim invoice + QRIS:", err);
        });
      } else {
        void sendWhatsAppMessage(whatsapp, waMessage).catch((err) => {
          console.error(
            "[Checkout WA Error] Gagal kirim notifikasi invoice:",
            err
          );
        });
      }
    } catch (waError) {
      console.error("[Checkout WA Template Error]:", waError);
    }

    return {
      success: true,
      message: "Berhasil menyiapkan pembayaran.",
      payment,
      invoiceId,
      invoiceUrl,
      amount: finalPrice,
      qrisImageUrl,
    };
  } catch (error: any) {
    console.error("[Checkout Server Exception]:", {
      name: error?.name,
      message: error?.message,
      cause: error?.cause,
      stack: error?.stack,
    });

    return {
      success: false,
      message: "Terjadi kesalahan internal saat memproses transaksi.",
    };
  }
}
