import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, WATemplates } from "@/lib/whatsapp";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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
  [key: string]: unknown;
};

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function verifyPremifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signatureHeader || "", "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-premify-signature") || "";

    if (!signatureHeader) {
      console.warn("[Premify Webhook] Ditolak: Header signature tidak ditemukan.");
      return NextResponse.json(
        { success: false, message: "Missing signature" },
        { status: 401 }
      );
    }

    const settings = await prisma.appSetting.findFirst();

    const premifySecret =
      process.env.PREMIFY_API_KEY ||
      settings?.premifyApiKey ||
      "";

    if (!premifySecret) {
      console.error("[Premify Webhook] Premify API key / secret belum dikonfigurasi.");
      return NextResponse.json(
        { success: false, message: "System not ready" },
        { status: 500 }
      );
    }

    const isValidSignature = verifyPremifySignature(
      rawBody,
      signatureHeader,
      premifySecret
    );

    if (!isValidSignature) {
      console.error("[Premify Webhook] Signature HMAC tidak cocok.");
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { event, data } = body;

    const providerOrderId = String(
      data?.order_id || data?.order_number || ""
    ).trim();

    const normalizedEvent = String(event || "").toLowerCase();
    const normalizedProviderStatus = String(data?.status || "").toLowerCase();

    console.log("[Premify Webhook] Event diterima:", {
      event,
      providerStatus: data?.status,
      order_id: data?.order_id,
      order_number: data?.order_number,
      providerOrderId,
    });

    if (!event || !data || !providerOrderId) {
      console.error(
        "[Premify Webhook] Payload tidak valid: event/order_id/order_number tidak ditemukan.",
        body
      );
      return NextResponse.json(
        { success: false, message: "Invalid payload" },
        { status: 400 }
      );
    }

    const isDevelopment = process.env.NODE_ENV === "development";
    const isTest = data.is_test === true || data.metadata?.is_test === true;

    if (isTest && !isDevelopment) {
      console.log(`[Premify Webhook] Transaksi sandbox diabaikan: ${providerOrderId}`);
      return NextResponse.json(
        { success: true, message: "Test event ignored" },
        { status: 200 }
      );
    }

    if (isTest && isDevelopment) {
      console.log(`[Premify Webhook] Mode DEV: sandbox tetap diproses: ${providerOrderId}`);
    }

    let transaction: any = null;

    for (let attempt = 1; attempt <= 4; attempt++) {
      transaction = await prisma.transaction.findFirst({
        where: { premifyOrderId: providerOrderId },
      });

      if (transaction) break;

      console.warn(
        `[Premify Webhook] Attempt ${attempt}: transaksi untuk Premify order ${providerOrderId} belum ditemukan.`
      );

      if (attempt < 4) {
        await wait(500);
      }
    }

    if (!transaction) {
      console.warn(
        `[Premify Webhook] Transaksi untuk Premify order ${providerOrderId} tetap tidak ditemukan setelah retry.`
      );
      console.warn("[Premify Webhook] Payload data:", data);

      return NextResponse.json(
        { success: true, message: "Transaction not found locally" },
        { status: 200 }
      );
    }

    const productDetails = safeJsonParse<TransactionProductDetails>(
      transaction.productDetails,
      {}
    );

    const customerWA = transaction.customerPhone;

    const productName =
      [productDetails.productName, productDetails.variantName]
        .filter(Boolean)
        .join(" - ") ||
      productDetails.name ||
      "Produk Digital";

    const targetId = productDetails.targetId || "-";

    const isCompletedEvent =
      normalizedEvent === "order.completed" ||
      normalizedProviderStatus === "completed" ||
      normalizedProviderStatus === "success";

    const isFailedEvent =
      normalizedEvent === "order.failed" ||
      normalizedEvent === "order.cancelled" ||
      normalizedProviderStatus === "failed" ||
      normalizedProviderStatus === "cancelled";

    const isProcessingEvent =
      !isCompletedEvent &&
      !isFailedEvent &&
      (
        normalizedEvent === "order.processing" ||
        normalizedProviderStatus === "processing"
      );

    if (isCompletedEvent) {
      if (transaction.premifyStatus === "COMPLETED") {
        return NextResponse.json({
          success: true,
          message: "Already completed",
        });
      }

      const accountDetailsStr =
        data.items?.[0]?.account_details ||
        data.account_details ||
        "Akses otomatis aktif.";

      const updatedDetails: TransactionProductDetails = {
        ...productDetails,
        sn: accountDetailsStr,
        premifyCompletedAt: new Date().toISOString(),
      };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyStatus: "COMPLETED",
          paymentStatus: "COMPLETED",
          productDetails: JSON.stringify(updatedDetails),
        },
      });

      const msg = WATemplates.orderCompleted({
        invoiceId: transaction.invoiceId,
        productName,
        targetId,
        accountDetails:
          accountDetailsStr !== "Akses otomatis aktif."
            ? accountDetailsStr
            : undefined,
      });

      await sendWhatsAppMessage(customerWA, msg).catch((err) => {
        console.error(
          `[Premify Webhook] Gagal kirim WA order completed ${transaction.invoiceId}:`,
          err
        );
      });

      console.log(
        `[Premify Webhook] Pesanan ${transaction.invoiceId} selesai, notif WA terkirim.`
      );

      return NextResponse.json({
        success: true,
        message: "Completed event handled",
      });
    }

    if (isFailedEvent) {
      if (
        transaction.premifyStatus === "FAILED" ||
        transaction.premifyStatus === "CANCELLED"
      ) {
        return NextResponse.json({
          success: true,
          message: "Already failed/cancelled",
        });
      }

      const updatedDetails: TransactionProductDetails = {
        ...productDetails,
        error: "Pesanan digagalkan/dibatalkan oleh penyedia (Premify).",
        premifyFailedAt: new Date().toISOString(),
      };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyStatus:
            normalizedEvent === "order.cancelled" ||
            normalizedProviderStatus === "cancelled"
              ? "CANCELLED"
              : "FAILED",
          productDetails: JSON.stringify(updatedDetails),
        },
      });

      await sendWhatsAppMessage(
        customerWA,
        WATemplates.orderFailed({
          invoiceId: transaction.invoiceId,
          productName,
        })
      ).catch((err) => {
        console.error(
          `[Premify Webhook] Gagal kirim WA order failed ${transaction.invoiceId}:`,
          err
        );
      });

      console.warn(
        `[Premify Webhook] Pesanan ${transaction.invoiceId} gagal/dibatalkan oleh Premify.`
      );

      return NextResponse.json({
        success: true,
        message: "Failed/cancelled event handled",
      });
    }

    if (isProcessingEvent) {
      if (transaction.premifyStatus !== "PROCESSING") {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { premifyStatus: "PROCESSING" },
        });
      }

      console.log(
        `[Premify Webhook] Order ${transaction.invoiceId} sedang diproses oleh Premify.`
      );

      return NextResponse.json({
        success: true,
        message: "Processing event handled",
      });
    }

    console.log(
      `[Premify Webhook] Event '${event}' dengan status '${data?.status}' untuk ${providerOrderId} tidak memerlukan aksi.`
    );

    return NextResponse.json(
      { success: true, message: "Event ignored" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Premify Webhook] Internal Error:", {
      name: error?.name,
      message: error?.message,
      cause: error?.cause,
      stack: error?.stack,
    });

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
