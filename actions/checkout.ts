"use server";

import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";
import { z } from "zod";

type CheckoutResult =
  | {
      success: true;
      message: string;
      payment: any;
      invoiceId: string;
      invoiceUrl: string;
      amount: number;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

const checkoutSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih."),
  variantId: z.string().min(1, "Varian wajib dipilih."),
  targetId: z.string().min(1, "Target / user ID wajib diisi."),
  whatsapp: z.string().min(8, "Nomor WhatsApp tidak valid."),
  method: z.enum(["qris"]).default("qris"),
});

function normalizePhone(phone: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return null;
}

function generateInvoiceId(): string {
  const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `INV-PS-${datePrefix}-${rand}`;
}

export async function processCheckout(formData: FormData): Promise<CheckoutResult> {
  try {
    const raw = {
      productId: String(formData.get("productId") || "").trim(),
      variantId: String(formData.get("variantId") || "").trim(),
      targetId: String(formData.get("targetId") || "").trim(),
      whatsapp: String(formData.get("whatsapp") || "").trim(),
      method: String(formData.get("method") || "qris").trim().toLowerCase(),
    };

    const parsed = checkoutSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        message: "Data checkout tidak valid.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { productId, variantId, targetId, whatsapp: whatsappRaw, method } = parsed.data;

    const whatsapp = normalizePhone(whatsappRaw);
    if (!whatsapp) {
      return {
        success: false,
        message: "Nomor WhatsApp tidak valid.",
        fieldErrors: { whatsapp: ["Format nomor WhatsApp tidak valid."] },
      };
    }

    const [settings, variant] = await Promise.all([
      prisma.appSetting.findFirst(),
      prisma.variant.findUnique({
        where: { id: variantId },
        include: { product: true },
      }),
    ]);

    if (!settings?.pakasirProjectSlug || !settings?.pakasirApiKey) {
      console.error("[Checkout Error] Kredensial Pakasir belum diatur.");
      return {
        success: false,
        message: "Sistem pembayaran sedang dalam gangguan. Hubungi admin.",
      };
    }

    if (!variant || !variant.product) {
      return {
        success: false,
        message: "Varian produk tidak ditemukan.",
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

    const finalPrice = Number(variant.price);
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      return {
        success: false,
        message: "Harga varian tidak valid.",
      };
    }

    const recentPending = await prisma.transaction.findFirst({
      where: {
        customerPhone: whatsapp,
        productCode: variant.id,
        paymentStatus: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentPending) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
      return {
        success: true,
        message: "Transaksi pending sebelumnya masih aktif.",
        payment: null,
        invoiceId: recentPending.invoiceId,
        invoiceUrl: `${appUrl}/cek-pesanan?invoice=${encodeURIComponent(recentPending.invoiceId)}`,
        amount: Number(recentPending.amount),
      };
    }

    const invoiceId = generateInvoiceId();

    await prisma.transaction.create({
      data: {
        invoiceId,
        productCode: variant.id,
        customerPhone: whatsapp,
        amount: finalPrice,
        paymentStatus: "PENDING",
        premifyStatus: "PENDING",
        productDetails: JSON.stringify({
          productId: variant.product.id,
          productName: variant.product.name,
          variantId: variant.id,
          variantName: variant.name,
          targetId,
          customerPhone: whatsapp,
          type: variant.type ?? null,
          duration: variant.duration ?? null,
          warranty: variant.warranty ?? null,
        }),
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
        },
      });

      return {
        success: false,
        message: paymentResult?.data?.message || "Gagal membuat invoice pembayaran.",
      };
    }

    const payment = paymentResult.data.payment;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
    const invoiceUrl = `${appUrl}/cek-pesanan?invoice=${encodeURIComponent(invoiceId)}`;

    await prisma.transaction.update({
      where: { invoiceId },
      data: {
        paymentGatewayPayload: JSON.stringify(payment),
      },
    });

    try {
      const waMessage = WATemplates.invoiceCreated({
        invoiceId,
        productName: `${variant.product.name} - ${variant.name}`,
        targetId,
        price: finalPrice,
        paymentUrl: invoiceUrl,
      });

      void sendWhatsAppMessage(whatsapp, waMessage).catch((err) => {
        console.error("[Checkout WA Error]", err);
      });
    } catch (waError) {
      console.error("[Checkout WA Template Error]", waError);
    }

    return {
      success: true,
      message: "Berhasil menyiapkan pembayaran.",
      payment,
      invoiceId,
      invoiceUrl,
      amount: finalPrice,
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
