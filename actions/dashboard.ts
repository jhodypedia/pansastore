"use server";

import prisma from "@/lib/prisma";

export async function getDashboardStats() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const whereThisMonth = {
      paymentStatus: "COMPLETED" as const,
      createdAt: { gte: startOfMonth },
    };

    const [revenueAgg, monthlyTransactions, activeProducts, latestTransactions] =
      await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: whereThisMonth,
        }),
        prisma.transaction.count({
          where: whereThisMonth,
        }),
        prisma.product.count({
          where: { stock: { gt: 0 } },
        }),
        prisma.transaction.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            invoiceId: true,
            productCode: true,
            customerPhone: true,
            amount: true,
            paymentStatus: true,
            premifyStatus: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      revenue: revenueAgg._sum.amount ?? 0,
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
