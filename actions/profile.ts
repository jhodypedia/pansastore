"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, message: "Akses ditolak. Sesi tidak valid." };
    }

    const name = formData.get("name") as string;
    const oldPassword = formData.get("oldPassword") as string;
    const newPassword = formData.get("password") as string;

    // 1. Ambil data user saat ini dari database untuk mencocokkan password lama
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    const updateData: any = { name };

    // 2. Jika user mencoba mengisi kata sandi baru
    if (newPassword && newPassword.trim() !== "") {
      if (!oldPassword || oldPassword.trim() === "") {
        return { success: false, message: "Kata sandi lama wajib diisi untuk mengubah kata sandi baru." };
      }

      // Validasi apakah kata sandi lama sesuai dengan database
      const isOldPasswordMatch = await bcrypt.compare(oldPassword, currentUser.password);
      if (!isOldPasswordMatch) {
        return { success: false, message: "Kata sandi lama yang Anda masukkan salah." };
      }

      if (newPassword.length < 6) {
        return { success: false, message: "Kata sandi baru minimal 6 karakter." };
      }

      // Hash kata sandi baru jika semua validasi lolos
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // 3. Jalankan update ke database
    await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
    });

    revalidatePath("/admin/profile");
    return { success: true, message: "Profil berhasil diperbarui!" };
  } catch (error) {
    console.error("Gagal update profil:", error);
    return { success: false, message: "Terjadi kesalahan server internal." };
  }
}