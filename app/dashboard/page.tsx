import { redirect } from "next/navigation";
// Pastikan path import auth ini sesuai dengan lokasi file auth.ts kamu (biasanya di root folder)
import { auth } from "@/auth"; 
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 1. Verifikasi Session
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  // 2. Cegah Admin masuk ke dasbor user biasa
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  // 3. Tarik data profil User dari database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    redirect("/login");
  }

  // 4. Tarik Riwayat Transaksi berdasarkan Nomor HP User
  let transactions: any[] = [];
  if (user.phone) {
    transactions = await prisma.transaction.findMany({
      where: { customerPhone: user.phone },
      orderBy: { createdAt: "desc" },
      take: 20 // Ambil 20 transaksi terakhir
    });
  }

  return <DashboardClient user={user} transactions={transactions} />;
}