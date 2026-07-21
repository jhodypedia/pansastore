"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";

type Role = "ADMIN" | "USER";

type SafeUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: Date;
};

type ActionSuccess = {
  success: true;
  message: string;
};

type AddUserResponse =
  | (ActionSuccess & { user: SafeUser })
  | { success: false; message: string };

type MutationResponse = ActionSuccess | { success: false; message: string };

const ALLOWED_ROLES: Role[] = ["ADMIN", "USER"];

function sanitizeText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && ALLOWED_ROLES.includes(value as Role);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return session.user;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return "Anda harus login untuk melakukan aksi ini.";
    }

    if (error.message === "FORBIDDEN") {
      return "Akses ditolak. Hanya admin yang dapat melakukan aksi ini.";
    }
  }

  return fallback;
}

export async function addUser(formData: FormData): Promise<AddUserResponse> {
  try {
    await requireAdmin();

    const name = normalizeName(sanitizeText(formData.get("name")));
    const email = normalizeEmail(sanitizeText(formData.get("email")));
    const password = sanitizeText(formData.get("password"));
    const rawRole = formData.get("role");
    const role: Role = isValidRole(rawRole) ? rawRole : "USER";

    if (!name) {
      return { success: false, message: "Nama wajib diisi." };
    }

    if (name.length < 3) {
      return { success: false, message: "Nama minimal 3 karakter." };
    }

    if (!email) {
      return { success: false, message: "Email wajib diisi." };
    }

    if (!isValidEmail(email)) {
      return { success: false, message: "Format email tidak valid." };
    }

    if (!password) {
      return { success: false, message: "Kata sandi wajib diisi." };
    }

    if (password.length < 6) {
      return { success: false, message: "Kata sandi minimal 6 karakter." };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return {
        success: false,
        message: "Email ini sudah digunakan oleh pengguna lain.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    revalidatePath("/admin/users");

    return {
      success: true,
      message: "Pengguna baru berhasil ditambahkan.",
      user: newUser,
    };
  } catch (error) {
    console.error("Gagal tambah user:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Email ini sudah digunakan oleh pengguna lain.",
      };
    }

    return {
      success: false,
      message: getErrorMessage(
        error,
        "Terjadi kesalahan server saat menambah pengguna."
      ),
    };
  }
}

export async function updateUserRole(
  userId: string,
  newRole: Role
): Promise<MutationResponse> {
  try {
    const currentUser = await requireAdmin();
    const safeUserId = userId.trim();

    if (!safeUserId) {
      return { success: false, message: "ID pengguna tidak valid." };
    }

    if (!isValidRole(newRole)) {
      return { success: false, message: "Role tidak valid." };
    }

    if (currentUser.id === safeUserId) {
      return {
        success: false,
        message: "Admin tidak dapat mengubah role akun miliknya sendiri.",
      };
    }

    await prisma.user.update({
      where: { id: safeUserId },
      data: { role: newRole },
    });

    revalidatePath("/admin/users");

    return {
      success: true,
      message: `Hak akses berhasil diubah menjadi ${newRole}.`,
    };
  } catch (error) {
    console.error("Gagal update role:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        success: false,
        message: "Pengguna tidak ditemukan atau sudah dihapus.",
      };
    }

    return {
      success: false,
      message: getErrorMessage(
        error,
        "Terjadi kesalahan saat memperbarui pengguna."
      ),
    };
  }
}

export async function deleteUser(userId: string): Promise<MutationResponse> {
  try {
    const currentUser = await requireAdmin();
    const safeUserId = userId.trim();

    if (!safeUserId) {
      return { success: false, message: "ID pengguna tidak valid." };
    }

    if (currentUser.id === safeUserId) {
      return {
        success: false,
        message: "Admin tidak dapat menghapus akun miliknya sendiri.",
      };
    }

    await prisma.user.delete({
      where: { id: safeUserId },
    });

    revalidatePath("/admin/users");

    return {
      success: true,
      message: "Pengguna berhasil dihapus secara permanen.",
    };
  } catch (error) {
    console.error("Gagal hapus user:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        success: false,
        message: "Pengguna tidak ditemukan atau sudah dihapus.",
      };
    }

    return {
      success: false,
      message: getErrorMessage(
        error,
        "Gagal menghapus pengguna. Terjadi kesalahan sistem."
      ),
    };
  }
}
