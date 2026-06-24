"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerUser(formData: FormData) {
  try {
    // 1. Cek status pendaftaran dari AppSetting
    const settings = await prisma.appSetting.findFirst();
    
    // Jika ada pengaturan dan isRegisterOpen bernilai false, tolak registrasi
    if (settings && settings.isRegisterOpen === false) {
      return { error: "Pendaftaran akun baru saat ini sedang ditutup oleh Administrator." };
    }

    // Tangkap data dari Client (TIDAK PERLU menangkap role dari form)
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string | null;
    
    // Validasi input kosong tingkat server
    if (!name || !email || !password) {
      return { error: "Nama, email, dan kata sandi wajib diisi." };
    }

    // 2. Validasi apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    if (existingUser) {
      return { error: "Alamat email ini sudah terdaftar di sistem." };
    }

    // 3. Enkripsi kata sandi
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 4. Simpan ke database dengan ROLE DIKUNCI (Hardcoded)
    await prisma.user.create({
      data: { 
        name, 
        email, 
        phone: phone ? phone.trim() : null,
        password: hashedPassword, 
        role: "USER" // Kunci mati: Semua pendaftar jalur ini pasti menjadi USER biasa
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Registrasi Error:", error);
    return { error: "Terjadi kesalahan server saat memproses pendaftaran." };
  }
}