import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Paksa route ini agar selalu mengambil data segar, bukan cache statis
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Menghitung jumlah transaksi yang berstatus "PENDING"
    const pendingCount = await prisma.transaction.count({
      where: { paymentStatus: "PENDING" }
    });
    
    return NextResponse.json({ count: pendingCount, success: true });
  } catch (error) {
    return NextResponse.json({ count: 0, success: false });
  }
}