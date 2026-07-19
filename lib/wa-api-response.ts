// lib/wa-api-response.ts
import { NextResponse } from "next/server";
import { getWhatsAppStatus } from "@/lib/whatsapp";

export function waSuccess(message?: string, extra?: Record<string, unknown>) {
  return NextResponse.json({
    success: true,
    message: message || "OK",
    ...getWhatsAppStatus(),
    ...(extra || {}),
  });
}

export function waError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...getWhatsAppStatus(),
      ...(extra || {}),
    },
    { status }
  );
}
