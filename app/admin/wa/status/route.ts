// app/api/admin/wa/status/route.ts
import { NextResponse } from "next/server";
import { getWhatsAppStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "WhatsApp status fetched successfully.",
    ...getWhatsAppStatus(),
  });
}
