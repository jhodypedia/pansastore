"use server";

import { revalidatePath } from "next/cache";
import { reconcilePremifyTransaction } from "@/lib/premify";

export async function syncPremifyTransactionAction(formData: FormData) {
  const transactionId = Number(formData.get("transactionId"));

  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    return {
      success: false,
      message: "Transaction ID tidak valid.",
    };
  }

  const result = await reconcilePremifyTransaction(transactionId);

  revalidatePath("/admin/transaction");
  revalidatePath("/cek-pesanan");

  return result;
}
