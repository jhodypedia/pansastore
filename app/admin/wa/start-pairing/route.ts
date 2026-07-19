import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { startWhatsAppBot, getWhatsAppStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function normalizeInputPhone(phone: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user || String(session.user.role || "").toUpperCase() !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: "Unauthorized", ...getWhatsAppStatus() },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const phone = normalizeInputPhone(String((body as any)?.phone || ""));

  if (!phone) {
    return NextResponse.json(
      {
        success: false,
        message: "Nomor WhatsApp tidak valid. Gunakan format Indonesia seperti 6281234567890.",
        ...getWhatsAppStatus(),
      },
      { status: 400 }
    );
  }

  const result = await startWhatsAppBot({
    usePairingCode: true,
    pairingPhoneNumber: phone,
  });

  return NextResponse.json({
    success: true,
    message: "Pairing code generation started.",
    ...result,
  });
}
