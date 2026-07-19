import prisma from "@/lib/prisma";
import CekPesananClient from "./CekPesananClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  invoice?: string | string[];
}>;

function normalizeInvoice(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim().toUpperCase();
  }

  return String(value || "").trim().toUpperCase();
}

function isExpired(expiredAt: Date | string | null | undefined): boolean {
  if (!expiredAt) return false;

  const time = new Date(expiredAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

function toSerializableTransaction(transaction: any) {
  if (!transaction) return null;

  return {
    id: transaction.id,
    invoiceId: transaction.invoiceId,
    customerPhone: transaction.customerPhone ?? null,
    amount: Number(transaction.amount ?? 0),
    paymentStatus: String(transaction.paymentStatus || "PENDING"),
    premifyStatus: String(transaction.premifyStatus || "PENDING"),
    premifyOrderId: transaction.premifyOrderId ?? null,
    paymentExpiredAt: transaction.paymentExpiredAt
      ? new Date(transaction.paymentExpiredAt).toISOString()
      : null,
    createdAt: transaction.createdAt
      ? new Date(transaction.createdAt).toISOString()
      : null,
    updatedAt: transaction.updatedAt
      ? new Date(transaction.updatedAt).toISOString()
      : null,
    productDetails: transaction.productDetails ?? null,
  };
}

export default async function CekPesananPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedParams = await searchParams;
  const invoiceId = normalizeInvoice(resolvedParams.invoice);

  let transactionData = null;

  if (invoiceId) {
    const foundTransaction = await prisma.transaction.findUnique({
      where: { invoiceId },
      select: {
        id: true,
        invoiceId: true,
        customerPhone: true,
        amount: true,
        paymentStatus: true,
        premifyStatus: true,
        premifyOrderId: true,
        paymentExpiredAt: true,
        createdAt: true,
        updatedAt: true,
        productDetails: true,
      },
    });

    if (foundTransaction) {
      let currentTransaction = foundTransaction;

      if (
        currentTransaction.paymentStatus === "PENDING" &&
        isExpired(currentTransaction.paymentExpiredAt)
      ) {
        currentTransaction = await prisma.transaction.update({
          where: { id: currentTransaction.id },
          data: {
            paymentStatus: "EXPIRED",
          },
          select: {
            id: true,
            invoiceId: true,
            customerPhone: true,
            amount: true,
            paymentStatus: true,
            premifyStatus: true,
            premifyOrderId: true,
            paymentExpiredAt: true,
            createdAt: true,
            updatedAt: true,
            productDetails: true,
          },
        });
      }

      transactionData = toSerializableTransaction(currentTransaction);
    }
  }

  return (
    <CekPesananClient
      initialInvoice={invoiceId}
      transactionData={transactionData}
    />
  );
}
