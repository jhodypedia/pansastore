"use server";

import prisma from "@/lib/prisma";

export async function getDashboardStats() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Hitung total pendapatan bulan ini (Berdasarkan paymentStatus "PAID")
    const revenueAgg = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        paymentStatus: "PAID",
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // 2. Hitung jumlah transaksi sukses bulan ini
    const monthlyTransactions = await prisma.transaction.count({
      where: {
        paymentStatus: "PAID",
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // 3. Hitung produk yang aktif (stok > 0)
    const activeProducts = await prisma.product.count({
      where: {
        stock: {
          gt: 0,
        },
      },
    });

    // 4. Ambil 5 transaksi terbaru untuk tabel log
    const latestTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      // Tidak menggunakan include karena tidak ada relasi di schema
    });

    return {
      revenue: revenueAgg._sum.amount || 0,
      monthlyTransactions,
      activeProducts,
      latestTransactions,
    };
  } catch (error) {
    console.error("Kesalahan saat mengambil data dashboard:", error);
    return {
      revenue: 0,
      monthlyTransactions: 0,
      activeProducts: 0,
      latestTransactions: [],
    };
  }
}