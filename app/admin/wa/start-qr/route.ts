// app/api/admin/wa/start-qr/route.ts
import { startWhatsAppBot } from "@/lib/whatsapp";
import { waError, waSuccess } from "@/lib/wa-api-response";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await startWhatsAppBot({
      usePairingCode: false,
    });

    return waSuccess("QR generation started.");
  } catch (error: any) {
    return waError(error?.message || "Failed to start WhatsApp QR connection.", 500);
  }
}
