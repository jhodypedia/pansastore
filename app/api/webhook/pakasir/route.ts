import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";
import { processPremifyOrder } from "@/lib/premify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  payment_paid_at?: string | null;
  payment_order_id?: string | null;
  invoice_url?: string | null;
  payment_payload?: unknown;
  [key: string]: unknown;
};

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizePaymentMethod(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function isFinitePositiveNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
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

function extractProductName(details: ProductDetailsShape) {
  const productName = String(details?.productName || "").trim();
  const variantName = String(details?.variantName || "").trim();
  const fallbackName = String(details?.name || "").trim();

  if (productName && variantName && productName !== variantName) {
    return `${productName} - ${variantName}`;
  }

  return productName || variantName || fallbackName || "Produk Digital";
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    if (!rawBody || !rawBody.trim()) {
      return NextResponse.json({ error: "Payload kosong" }, { status: 400 });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Payload bukan JSON valid" },
        { status: 400 }
      );
    }

    const orderId = normalizeText(body?.order_id);
    const incomingStatus = normalizeStatus(body?.status);
    const project = normalizeText(body?.project);
    const paymentMethod = normalizePaymentMethod(body?.payment_method);
    const webhookAmount = body?.amount;

    console.log("[PAKASIR WEBHOOK] Incoming:", {
      orderId,
      incomingStatus,
      project,
      paymentMethod,
      webhookAmount,
    });

    if (!orderId || !incomingStatus || !project) {
      return NextResponse.json(
        { error: "Payload tidak valid" },
        { status: 400 }
      );
    }

    if (!/^INV-PS-/i.test(orderId)) {
      return NextResponse.json(
        { error: "Order ID tidak valid" },
        { status: 400 }
      );
    }

    if (incomingStatus !== "completed") {
      return NextResponse.json({
        received: true,
        message: "Status diabaikan.",
      });
    }

    if (paymentMethod && paymentMethod !== "qris") {
      return NextResponse.json(
        { error: "Metode pembayaran tidak valid" },
        { status: 400 }
      );
    }

    const [transaction, settings] = await Promise.all([
      prisma.transaction.findUnique({
        where: { invoiceId: orderId },
      }),
      prisma.appSetting.findFirst(),
    ]);

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    if (!settings?.pakasirApiKey || !settings?.pakasirProjectSlug) {
      return NextResponse.json(
        { error: "Sistem belum siap" },
        { status: 500 }
      );
    }

    if (project !== settings.pakasirProjectSlug) {
      return NextResponse.json(
        { error: "Project tidak valid" },
        { status: 400 }
      );
    }

    if (
      transaction.paymentMethod &&
      normalizePaymentMethod(transaction.paymentMethod) !== "qris"
    ) {
      return NextResponse.json(
        { error: "Metode pembayaran transaksi tidak cocok" },
        { status: 400 }
      );
    }

    if (
      transaction.paymentStatus === "COMPLETED" ||
      transaction.premifyStatus === "COMPLETED"
    ) {
      return NextResponse.json({
        received: true,
        message: "Transaksi sudah selesai diproses sebelumnya.",
      });
    }

    if (transaction.paymentStatus === "CANCELLED") {
      return NextResponse.json(
        { error: "Transaksi sudah dibatalkan" },
        { status: 400 }
      );
    }

    const dbAmount = Number(transaction.amount);

    if (isFinitePositiveNumber(webhookAmount)) {
      const normalizedWebhookAmount = Number(webhookAmount);
      if (normalizedWebhookAmount !== dbAmount) {
        return NextResponse.json(
          { error: "Amount webhook tidak cocok" },
          { status: 400 }
        );
      }
    }

    const verification = await pakasirSDK.checkTransaction({
      project: settings.pakasirProjectSlug,
      api_key: settings.pakasirApiKey,
      order_id: orderId,
      amount: dbAmount,
    });

    if (!verification?.ok) {
      return NextResponse.json(
        { error: "Verifikasi transaksi gagal" },
        { status: 400 }
      );
    }

    const apiTransaction =
      verification?.data?.transaction ||
      verification?.data?.payment ||
      verification?.data;

    const apiStatus = normalizeStatus(apiTransaction?.status);
    const apiProject = normalizeText(apiTransaction?.project || project);
    const apiPaymentMethod = normalizePaymentMethod(
      apiTransaction?.payment_method || paymentMethod
    );
    const apiAmount = Number(apiTransaction?.amount);
    const apiOrderId = normalizeText(apiTransaction?.order_id || orderId);

    if (!apiOrderId || apiOrderId !== orderId) {
      return NextResponse.json(
        { error: "Order ID verifikasi tidak cocok" },
        { status: 400 }
      );
    }

    if (apiProject && apiProject !== settings.pakasirProjectSlug) {
      return NextResponse.json(
        { error: "Project verifikasi tidak cocok" },
        { status: 400 }
      );
    }

    if (apiStatus !== "completed") {
      return NextResponse.json(
        { error: "Status verifikasi tidak valid" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(apiAmount) || apiAmount !== dbAmount) {
      return NextResponse.json(
        { error: "Amount verifikasi tidak cocok" },
        { status: 400 }
      );
    }

    if (apiPaymentMethod && apiPaymentMethod !== "qris") {
      return NextResponse.json(
        { error: "Metode pembayaran verifikasi tidak valid" },
        { status: 400 }
      );
    }

    const productDetails = safeJsonParse<ProductDetailsShape>(
      transaction.productDetails,
      {}
    );

    const mergedProductDetails: ProductDetailsShape = {
      ...productDetails,
      payment_provider: "pakasir",
      payment_provider_status: "COMPLETED",
      payment_paid_at: new Date().toISOString(),
      payment_order_id: apiOrderId,
      payment_payload: apiTransaction,
    };

    const updateResult = await prisma.transaction.updateMany({
      where: {
        id: transaction.id,
        paymentStatus: {
          in: ["PENDING", "FAILED", "EXPIRED"],
        },
      },
      data: {
        paymentStatus: "COMPLETED",
        paymentPaidAt: new Date(),
        paymentPayload: JSON.stringify(apiTransaction),
        premifyStatus: "PROCESSING",
        productDetails: JSON.stringify(mergedProductDetails),
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json({
        received: true,
        message: "Sudah diproses sebelumnya.",
      });
    }

    const productName = extractProductName(mergedProductDetails);
    const variantId = normalizeText(mergedProductDetails.variantId);
    const providerTargetId =
      normalizeText(mergedProductDetails.targetId) ||
      normalizeText(transaction.customerPhone);

    console.log("[PAKASIR WEBHOOK] Paid transaction:", {
      transactionId: transaction.id,
      invoiceId: transaction.invoiceId,
      variantId,
      providerTargetId,
      productName,
    });

    try {
      const processingMessage = WATemplates.orderProcessing({
        invoiceId: orderId,
        productName,
      });

      await sendWhatsAppMessage(transaction.customerPhone, processingMessage);
    } catch (error) {
      console.error("[PAKASIR WEBHOOK] Gagal kirim WA processing:", error);
    }

    try {
      const premifyIdentifier = variantId || transaction.productCode;

      const premifyResult = await processPremifyOrder(
        transaction.id,
        premifyIdentifier
      );

      if (!premifyResult?.success) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            premifyStatus: "FAILED",
          },
        });
      }
    } catch (error) {
      console.error("[PAKASIR WEBHOOK] processPremifyOrder error:", error);

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyStatus: "FAILED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook berhasil diproses.",
    });
  } catch (error) {
    console.error("[PAKASIR WEBHOOK] Internal error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
