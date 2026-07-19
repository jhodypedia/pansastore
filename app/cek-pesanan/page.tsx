import prisma from "@/lib/prisma";
import CekPesananClient from "./CekPesananClient";

export const dynamic = "force-dynamic";

function normalizeInvoice(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function isExpired(expiredAt: Date | string | null | undefined): boolean {
  if (!expiredAt) return false;

  const time = new Date(expiredAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

export default async function CekPesananPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  const resolvedParams = await searchParams;
  const invoiceId = normalizeInvoice(resolvedParams.invoice || "");

  let transactionData = null;

  if (invoiceId) {
    transactionData = await prisma.transaction.findUnique({
      where: { invoiceId },
    });

    if (
      transactionData &&
      transactionData.paymentStatus === "PENDING" &&
      isExpired(transactionData.paymentExpiredAt)
    ) {
      transactionData = await prisma.transaction.update({
        where: { id: transactionData.id },
        data: {
          paymentStatus: "EXPIRED",
        },
      });
    }
  }

  return (
    <CekPesananClient
      initialInvoice={invoiceId}
      transactionData={transactionData}
    />
  );
}
