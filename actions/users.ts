"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// 1. TAMBAH PENGGUNA BARU (Khusus Admin)
export async function addUser(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as "ADMIN" | "USER";

    // Validasi email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: false, message: "Email ini sudah digunakan oleh pengguna lain." };
    }

    if (password.length < 6) {
      return { success: false, message: "Kata sandi minimal 6 karakter." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role }
    });

    revalidatePath("/admin/users");
    
    // Kembalikan data user baru untuk langsung dimasukkan ke state tabel tanpa refresh
    return { success: true, message: "Pengguna baru berhasil ditambahkan!", user: newUser };
  } catch (error) {
    console.error("Gagal tambah user:", error);
    return { success: false, message: "Terjadi kesalahan server saat menambah pengguna." };
  }
}

// 2. UBAH HAK AKSES (Update Role)
export async function updateUserRole(userId: string, newRole: "ADMIN" | "EMPLOYEE") {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    });
    
    revalidatePath("/admin/users");
    return { success: true, message: `Hak akses berhasil diubah menjadi ${newRole}.` };
  } catch (error) {
    return { success: false, message: "Terjadi kesalahan saat memperbarui pengguna." };
  }
}

// 3. HAPUS PENGGUNA (Delete User)
export async function deleteUser(userId: string) {
  try {
    await prisma.user.delete({ 
      where: { id: userId } 
    });
    
    revalidatePath("/admin/users");
    return { success: true, message: "Pengguna berhasil dihapus secara permanen." };
  } catch (error) {
    return { success: false, message: "Gagal menghapus pengguna. Terjadi kesalahan sistem." };
  }
}