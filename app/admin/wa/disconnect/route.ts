// app/api/admin/wa/disconnect/route.ts
import { disconnectWhatsAppBot } from "@/lib/whatsapp";
import { waError, waSuccess } from "@/lib/wa-api-response";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await disconnectWhatsAppBot();
    return waSuccess("WhatsApp socket disconnected without deleting session.");
  } catch (error: any) {
    return waError(error?.message || "Failed to disconnect WhatsApp socket.", 500);
  }
}
