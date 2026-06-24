import prisma from "@/lib/prisma";
import CekPesananClient from "./CekPesananClient";

export const dynamic = "force-dynamic";

export default async function CekPesananPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  // Await searchParams khusus untuk Next.js 15+
  const resolvedParams = await searchParams;
  const invoiceId = resolvedParams.invoice || "";

  let transactionData = null;

  // Jika ada nomor invoice di URL, tarik datanya dari database
  if (invoiceId) {
    transactionData = await prisma.transaction.findUnique({
      where: { invoiceId: invoiceId },
    });
  }

  return <CekPesananClient initialInvoice={invoiceId} transactionData={transactionData} />;
}