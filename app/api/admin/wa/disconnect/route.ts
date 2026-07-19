import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { disconnectWhatsAppBot, getWhatsAppStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();

  if (!session?.user || String(session.user.role || "").toUpperCase() !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: "Unauthorized", ...getWhatsAppStatus() },
      { status: 401 }
    );
  }

  await disconnectWhatsAppBot();

  return NextResponse.json({
    success: true,
    message: "WhatsApp socket disconnected without deleting session.",
    ...getWhatsAppStatus(),
  });
}
