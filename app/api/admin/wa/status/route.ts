import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWhatsAppStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user || String(session.user.role || "").toUpperCase() !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: "Unauthorized", ...getWhatsAppStatus() },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "WhatsApp status fetched successfully.",
    ...getWhatsAppStatus(),
  });
}
