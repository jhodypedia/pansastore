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
  payment_order_id?: string;
  premifyOrderId?: string;
  premifyCompletedAt?: string;
  premifyFailedAt?: string;
  premifyReconciledAt?: string;
  premifyLastEvent?: string;
  premifyLastStatus?: string;
  premifyLastPaymentStatus?: string;
  premifyRawLastPayload?: unknown;
  [key: string]: unknown;
};

type PremifyWebhookPayload = {
  id?: string;
  event?: string;
  timestamp?: string;
  data?: {
    order_id?: string;
    order_number?: string;
    status?: string;
    payment_status?: string;
    total_amount?: number;
    is_test?: boolean;
    created_at?: string;
    updated_at?: string;
    customer?: {
      name?: string;
      email?: string;
      whatsapp?: string;
      [key: string]: unknown;
    };
    metadata?: {
      is_test?: boolean;
      [key: string]: unknown;
    };
    items?: Array<{
      product_name?: string;
      variant_name?: string;
      price?: number;
      quantity?: number;
      subtotal?: number;
      account_details?: string;
      [key: string]: unknown;
    }>;
    account_details?: string;
    [key: string]: unknown;
  };
  order_id?: string;
  order_number?: string;
  providerOrderId?: string;
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

function normalizePhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

function getProductName(details: TransactionProductDetails) {
  return (
    [details.productName, details.variantName].filter(Boolean).join(" - ") ||
    details.name ||
    "Produk Digital"
  );
}

function resolveProviderOrderId(body: PremifyWebhookPayload): string {
  return String(
    body?.data?.order_number ||
      body?.data?.order_id ||
      body?.order_number ||
      body?.order_id ||
      body?.providerOrderId ||
      ""
  ).trim();
}

function resolveEventKey(body: PremifyWebhookPayload, providerOrderId: string): string {
  const event = String(body?.event || "").trim().toLowerCase();
  const status = String(body?.data?.status || "").trim().toLowerCase();
  const paymentStatus = String(body?.data?.payment_status || "")
    .trim()
    .toLowerCase();

  return [providerOrderId, event, status, paymentStatus].filter(Boolean).join(":");
}

async function findTransactionByPremifyOrder(providerOrderId: string) {
  let transaction: any = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { premifyOrderId: providerOrderId },
          {
            productDetails: {
              contains: `"payment_order_id":"${providerOrderId}"`,
            },
          },
          {
            productDetails: {
              contains: `"premifyOrderId":"${providerOrderId}"`,
            },
          },
        ],
      },
    });

    if (transaction) {
      if (attempt > 1) {
        console.log(
          `[Premify Webhook] Transaksi ditemukan pada attempt ${attempt} untuk ${providerOrderId}.`
        );
      }
      return transaction;
    }

    console.warn(
      `[Premify Webhook] Attempt ${attempt}: transaksi untuk Premify order ${providerOrderId} belum ditemukan.`
    );

    if (attempt < 5) {
      await wait(600);
    }
  }

  return null;
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
      process.env.PREMIFY_API_KEY || settings?.premifyApiKey || "";

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

    let body: PremifyWebhookPayload;
    try {
      body = JSON.parse(rawBody) as PremifyWebhookPayload;
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const event = String(body.event || "").trim().toLowerCase();
    const data = body.data || {};
    const providerOrderId = resolveProviderOrderId(body);

    console.log("[Premify Webhook] Event diterima:", {
      event,
      providerStatus: data.status,
      paymentStatus: data.payment_status,
      order_id: data.order_id,
      order_number: data.order_number,
      providerOrderId,
    });

    if (!event || !providerOrderId) {
      console.error(
        "[Premify Webhook] Payload tidak valid: event/providerOrderId tidak ditemukan.",
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

    const transaction = await findTransactionByPremifyOrder(providerOrderId);

    if (!transaction) {
      console.warn(
        `[Premify Webhook] Transaksi untuk Premify order ${providerOrderId} tetap tidak ditemukan setelah retry.`
      );

      return NextResponse.json(
        { success: true, message: "Transaction not found locally" },
        { status: 200 }
      );
    }

    const productDetails = safeJsonParse<TransactionProductDetails>(
      transaction.productDetails,
      {}
    );

    const currentStatus = String(transaction.premifyStatus || "PENDING").toUpperCase();
    const customerWA = normalizePhone(
      transaction.customerPhone ||
        productDetails.customerPhone ||
        data.customer?.whatsapp
    );
    const productName =
      getProductName(productDetails) ||
      [data.items?.[0]?.product_name, data.items?.[0]?.variant_name]
        .filter(Boolean)
        .join(" - ") ||
      "Produk Digital";
    const targetId = String(productDetails.targetId || "-").trim() || "-";
    const eventKey = resolveEventKey(body, providerOrderId);

    const baseUpdatedDetails: TransactionProductDetails = {
      ...productDetails,
      payment_order_id:
        String(productDetails.payment_order_id || "").trim() || providerOrderId,
      premifyOrderId: providerOrderId,
      premifyLastEvent: event,
      premifyLastStatus: String(data.status || "").trim() || currentStatus,
      premifyLastPaymentStatus: String(data.payment_status || "").trim(),
      premifyRawLastPayload: body,
      premifyReconciledAt: new Date().toISOString(),
    };

    if (!transaction.premifyOrderId || transaction.premifyOrderId !== providerOrderId) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyOrderId: providerOrderId,
        },
      });
    }

    const providerStatus = String(data.status || "").trim().toLowerCase();
    const paymentStatus = String(data.payment_status || "").trim().toLowerCase();

    const isCompletedEvent =
      event === "order.completed" ||
      (providerStatus === "completed" && paymentStatus === "paid");

    const isFailedEvent =
      event === "order.failed" ||
      event === "order.cancelled" ||
      providerStatus === "failed" ||
      providerStatus === "cancelled";

    const isProcessingEvent =
      event === "order.processing" || providerStatus === "processing";

    if (isCompletedEvent) {
      if (currentStatus === "COMPLETED") {
        console.log(
          `[Premify Webhook] Duplicate completed ignored untuk ${transaction.invoiceId} (${eventKey}).`
        );
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
        ...baseUpdatedDetails,
        sn: accountDetailsStr,
        premifyCompletedAt: new Date().toISOString(),
      };

      delete updatedDetails.error;

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyOrderId: providerOrderId,
          premifyStatus: "COMPLETED",
          paymentStatus: "COMPLETED",
          productDetails: JSON.stringify(updatedDetails),
        },
      });

      if (customerWA) {
        await sendWhatsAppMessage(
          customerWA,
          WATemplates.orderCompleted({
            invoiceId: transaction.invoiceId,
            productName,
            targetId,
            accountDetails:
              accountDetailsStr !== "Akses otomatis aktif."
                ? accountDetailsStr
                : undefined,
          })
        ).catch((err) => {
          console.error(
            `[Premify Webhook] Gagal kirim WA order completed ${transaction.invoiceId}:`,
            err
          );
        });
      } else {
        console.warn(
          `[Premify Webhook] Customer WA kosong untuk invoice ${transaction.invoiceId}, notif completed tidak dikirim.`
        );
      }

      console.log(
        `[Premify Webhook] Pesanan ${transaction.invoiceId} selesai, notif WA diproses.`
      );

      return NextResponse.json({
        success: true,
        message: "Completed event handled",
      });
    }

    if (isFailedEvent) {
      if (currentStatus === "COMPLETED") {
        console.log(
          `[Premify Webhook] Failed/cancelled diabaikan karena order ${transaction.invoiceId} sudah completed.`
        );
        return NextResponse.json({
          success: true,
          message: "Completed already, ignore failed/cancelled event",
        });
      }

      if (currentStatus === "FAILED" || currentStatus === "CANCELLED") {
        console.log(
          `[Premify Webhook] Duplicate failed/cancelled ignored untuk ${transaction.invoiceId} (${eventKey}).`
        );
        return NextResponse.json({
          success: true,
          message: "Already failed/cancelled",
        });
      }

      const nextStatus = event === "order.cancelled" || providerStatus === "cancelled"
        ? "CANCELLED"
        : "FAILED";

      const updatedDetails: TransactionProductDetails = {
        ...baseUpdatedDetails,
        error: "Pesanan digagalkan/dibatalkan oleh penyedia (Premify).",
        premifyFailedAt: new Date().toISOString(),
      };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          premifyOrderId: providerOrderId,
          premifyStatus: nextStatus,
          productDetails: JSON.stringify(updatedDetails),
        },
      });

      if (customerWA) {
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
      } else {
        console.warn(
          `[Premify Webhook] Customer WA kosong untuk invoice ${transaction.invoiceId}, notif failed tidak dikirim.`
        );
      }

      console.warn(
        `[Premify Webhook] Pesanan ${transaction.invoiceId} gagal/dibatalkan oleh Premify.`
      );

      return NextResponse.json({
        success: true,
        message: "Failed/cancelled event handled",
      });
    }

    if (isProcessingEvent) {
      if (
        currentStatus !== "COMPLETED" &&
        currentStatus !== "FAILED" &&
        currentStatus !== "CANCELLED" &&
        currentStatus !== "PROCESSING"
      ) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            premifyOrderId: providerOrderId,
            premifyStatus: "PROCESSING",
            productDetails: JSON.stringify(baseUpdatedDetails),
          },
        });
      } else {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            premifyOrderId: providerOrderId,
            productDetails: JSON.stringify(baseUpdatedDetails),
          },
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

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        premifyOrderId: providerOrderId,
        productDetails: JSON.stringify(baseUpdatedDetails),
      },
    });

    console.log(
      `[Premify Webhook] Event '${event}' untuk ${providerOrderId} tidak memerlukan aksi.`
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
