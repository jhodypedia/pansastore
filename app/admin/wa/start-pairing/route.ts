// app/api/admin/wa/start-pairing/route.ts
import { NextRequest } from "next/server";
import { startWhatsAppBot } from "@/lib/whatsapp";
import { waError, waSuccess } from "@/lib/wa-api-response";

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
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = String((body as any)?.phone || "");
    const phone = normalizeInputPhone(rawPhone);

    if (!phone) {
      return waError(
        "Nomor WhatsApp tidak valid. Gunakan format Indonesia seperti 6281234567890.",
        400
      );
    }

    await startWhatsAppBot({
      usePairingCode: true,
      pairingPhoneNumber: phone,
    });

    return waSuccess("Pairing code generation started.");
  } catch (error: any) {
    return waError(error?.message || "Failed to start WhatsApp pairing connection.", 500);
  }
}
