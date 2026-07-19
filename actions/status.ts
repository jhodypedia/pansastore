"use server";

import prisma from "@/lib/prisma";

function normalizeInvoice(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function isExpired(expiredAt: Date | string | null | undefined): boolean {
  if (!expiredAt) return false;

  const time = new Date(expiredAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

export async function checkPaymentStatus(invoiceId: string) {
  try {
    const normalizedInvoiceId = normalizeInvoice(invoiceId);

    if (!normalizedInvoiceId) {
      return "PENDING";
    }

    const transaction = await prisma.transaction.findUnique({
      where: { invoiceId: normalizedInvoiceId },
      select: {
        id: true,
        paymentStatus: true,
        paymentExpiredAt: true,
      },
    });

    if (!transaction) {
      return "PENDING";
    }

    if (
      transaction.paymentStatus === "PENDING" &&
      isExpired(transaction.paymentExpiredAt)
    ) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          paymentStatus: "EXPIRED",
        },
      });

      return "EXPIRED";
    }

    return transaction.paymentStatus || "PENDING";
  } catch {
    return "PENDING";
  }
}
