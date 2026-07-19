// app/api/admin/wa/logout/route.ts
import { logoutWhatsAppBot } from "@/lib/whatsapp";
import { waError, waSuccess } from "@/lib/wa-api-response";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await logoutWhatsAppBot();
    return waSuccess("WhatsApp logged out and session reset.");
  } catch (error: any) {
    return waError(error?.message || "Failed to logout WhatsApp.", 500);
  }
}
