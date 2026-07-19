import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { startWhatsAppBot, getWhatsAppStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();

  if (!session?.user || String(session.user.role || "").toUpperCase() !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: "Unauthorized", ...getWhatsAppStatus() },
      { status: 401 }
    );
  }

  const result = await startWhatsAppBot({ usePairingCode: false });

  return NextResponse.json({
    success: true,
    message: "QR generation started.",
    ...result,
  });
}
