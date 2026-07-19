import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pakasirSDK } from "@/lib/pakasir";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";
import { processPremifyOrder } from "@/lib/premify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizePaymentMethod(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function extractProductName(productDetails: string | null | undefined) {
  try {
    const parsed =
      typeof productDetails === "string"
        ? JSON.parse(productDetails)
        : productDetails || {};

    const productName = String(parsed?.productName || "").trim();
    const variantName = String(parsed?.variantName || "").trim();
    const fallbackName = String(parsed?.name || "").trim();

    if (productName && variantName && productName !== variantName) {
      return `${productName} - ${variantName}`;
    }

    return productName || variantName || fallbackName || "Produk Digital";
  } catch {
    return "Produk Digital";
  }
}

function isFinitePositiveNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    if (!rawBody || !rawBody.trim()) {
      return NextResponse.json(
        { error: "Payload kosong" },
        { status: 400 }
      );
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

    if (
      transaction.paymentStatus === "CANCELLED"
    ) {
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

    if (!verification?.ok) {
      return NextResponse.json(
        { error: "Verifikasi transaksi gagal" },
        { status: 400 }
      );
    }

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

    const updateResult = await prisma.transaction.updateMany({
      where: {
        id: transaction.id,
        paymentStatus: {
          in: ["PENDING", "FAILED", "EXPIRED"],
        },
      },
      data: {
        paymentStatus: "PAID",
        paymentPaidAt: new Date(),
        paymentPayload: JSON.stringify(apiTransaction),
        premifyStatus: "PROCESSING",
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json({
        received: true,
        message: "Sudah diproses sebelumnya.",
      });
    }

    const productName = extractProductName(transaction.productDetails);

    try {
      const processingMessage = WATemplates.orderProcessing({
        invoiceId: orderId,
        productName,
      });

      await sendWhatsAppMessage(transaction.customerPhone, processingMessage);
    } catch {}

    try {
      const premifyResult = await processPremifyOrder(
        transaction.id,
        transaction.productCode
      );

      if (!premifyResult?.success) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            premifyStatus: "FAILED",
          },
        });
      }
    } catch {
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
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
