"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSettings(formData: FormData) {
  try {
    const premifyApiKey = formData.get("premifyApiKey") as string;
    const dompetxApiKey = formData.get("dompetxApiKey") as string;
    const globalMarkup = parseFloat(formData.get("globalMarkup") as string) || 0;
    const isRegisterOpen = formData.get("isRegisterOpen") === "true"; // Tangkap status toggle

    await prisma.appSetting.upsert({
      where: { id: 1 },
      update: { premifyApiKey, dompetxApiKey, globalMarkup, isRegisterOpen },
      create: { id: 1, premifyApiKey, dompetxApiKey, globalMarkup, isRegisterOpen },
    });

    revalidatePath("/admin/settings");
    return { success: true, message: "Pengaturan berhasil disimpan!" };
  } catch (error) {
    return { success: false, message: "Terjadi kesalahan server saat menyimpan." };
  }
}