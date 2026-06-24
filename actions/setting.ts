"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSettings(formData: FormData) {
  try {
    const premifyApiKey = formData.get("premifyApiKey") as string;
    const pakasirApiKey = formData.get("pakasirApiKey") as string;
    const pakasirProjectSlug = formData.get("pakasirProjectSlug") as string;
    const globalMarkup = parseFloat(formData.get("globalMarkup") as string) || 0;
    const isRegisterOpen = formData.get("isRegisterOpen") === "true"; // Tangkap status toggle

    await prisma.appSetting.upsert({
      where: { id: 1 },
      update: { 
        premifyApiKey, 
        pakasirApiKey, 
        pakasirProjectSlug, 
        globalMarkup, 
        isRegisterOpen 
      },
      create: { 
        id: 1, 
        premifyApiKey, 
        pakasirApiKey, 
        pakasirProjectSlug, 
        globalMarkup, 
        isRegisterOpen 
      },
    });

    // Refresh cache agar pengaturan baru langsung aktif tanpa perlu restart server
    revalidatePath("/admin/settings");
    
    return { success: true, message: "Pengaturan berhasil disimpan!" };
  } catch (error) {
    console.error("[Settings Update Error]:", error);
    return { success: false, message: "Terjadi kesalahan server saat menyimpan pengaturan." };
  }
}
