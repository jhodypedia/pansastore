"use server";

import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";

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
    };

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
  const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `INV-PS-${datePrefix}-${randomHex}`;
}

export async function processCheckout(formData: FormData): Promise<CheckoutResult> {
  try {
    // 1. Ambil data dari form
    const productId = String(formData.get("productId") || "").trim();
    const variantId = String(formData.get("variantId") || "").trim();
    const targetId = String(formData.get("targetId") || "").trim();
    const whatsappRaw = String(formData.get("whatsapp") || "").trim();
    const method = String(formData.get("method") || "qris").trim().toLowerCase();

    // 2. Validasi input dasar
    if (!productId || !variantId || !targetId || !whatsappRaw) {
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
      };
    }

    if (method !== "qris") {
      return {
        success: false,
        message: `Metode pembayaran ${method} belum didukung sistem ini.`,
      };
    }

    // 3. Ambil setting dan variant + product parent
    const [settings, variant] = await Promise.all([
      prisma.appSetting.findFirst(),
      prisma.variant.findUnique({
        where: { id: variantId },
        include: { product: true },
      }),
    ]);

    if (!settings?.pakasirProjectSlug || !settings?.pakasirApiKey) {
      console.error("[Checkout Error] Kredensial Pakasir belum diatur di database.");
      return {
        success: false,
        message: "Sistem pembayaran sedang dalam gangguan. Hubungi admin.",
      };
    }

    if (!variant || !variant.product) {
      return {
        success: false,
        message: "Variant produk tidak ditemukan atau tidak tersedia.",
      };
    }

    if (variant.product.id !== productId) {
      return {
        success: false,
        message: "Variant tidak cocok dengan produk yang dipilih.",
      };
    }

    if (typeof variant.stock === "number" && variant.stock <= 0) {
      return {
        success: false,
        message: "Stok varian sedang habis.",
      };
    }

    const finalPrice = Number(variant.price);
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      return {
        success: false,
        message: "Harga variant tidak valid.",
      };
    }

    const invoiceId = generateInvoiceId();

    // 4. Simpan transaksi pending
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

    // 5. Request QRIS ke Pakasir
    const paymentResult = await pakasirSDK.createQris({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id: invoiceId,
      amount: finalPrice,
    });

    if (!paymentResult?.ok || !paymentResult?.data?.payment) {
      console.error("[Checkout Error] Pakasir membalas:", paymentResult?.data);

      await prisma.transaction.update({
        where: { invoiceId },
        data: { paymentStatus: "FAILED" },
      });

      return {
        success: false,
        message:
          paymentResult?.data?.message ||
          "Gagal membuat invoice di payment gateway.",
      };
    }

    const payment = paymentResult.data.payment;

    // 6. URL invoice lokal
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const invoiceUrl = `${appUrl}/cek-pesanan?invoice=${encodeURIComponent(invoiceId)}`;

    // 7. Kirim notifikasi WA invoice
    try {
      const waMessage = WATemplates.invoiceCreated({
        invoiceId,
        productName: `${variant.product.name} - ${variant.name}`,
        targetId,
        price: finalPrice,
        paymentUrl: invoiceUrl,
      });

      sendWhatsAppMessage(whatsapp, waMessage).catch((err) => {
        console.error("[Checkout WA Error] Gagal kirim notifikasi awal:", err);
      });
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
