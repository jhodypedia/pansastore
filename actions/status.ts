"use server";
import prisma from "@/lib/prisma";

export async function checkPaymentStatus(invoiceId: string) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { invoiceId: invoiceId },
      select: { paymentStatus: true }
    });
    
    // Kembalikan statusnya (PENDING, COMPLETED, atau FAILED)
    return transaction?.paymentStatus || "PENDING";
  } catch (error) {
    return "PENDING";
  }
}
