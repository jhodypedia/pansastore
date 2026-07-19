import { NextResponse } from "next/server";
import {
  disconnectWhatsAppBot,
  getWhatsAppStatus,
  logoutWhatsAppBot,
  startWhatsAppBot,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizePhone(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

export async function GET() {
  try {
    const status = getWhatsAppStatus();

    return NextResponse.json({
      status: status.status || "DISCONNECTED",
      qrCode: status.qrCode || "",
      pairingCode: status.pairingCode || "",
      connected: Boolean(status.connected),
      lastError: status.lastError || "",
    });
  } catch {
    return NextResponse.json(
      {
        status: "ERROR",
        qrCode: "",
        pairingCode: "",
        connected: false,
        lastError: "Gagal mengambil status WhatsApp.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    const phoneNumber = normalizePhone(body?.phoneNumber);

    if (!action) {
      return NextResponse.json(
        { error: "Action wajib diisi." },
        { status: 400 }
      );
    }

    if (action === "start-qr") {
      await startWhatsAppBot({
        usePairingCode: false,
      });

      const status = getWhatsAppStatus();

      return NextResponse.json({
        success: true,
        message: "Proses koneksi QR dimulai.",
        data: status,
      });
    }

    if (action === "start-pairing") {
      if (!phoneNumber) {
        return NextResponse.json(
          { error: "Nomor WhatsApp wajib diisi." },
          { status: 400 }
        );
      }

      await startWhatsAppBot({
        usePairingCode: true,
        pairingPhoneNumber: phoneNumber,
      });

      const status = getWhatsAppStatus();

      return NextResponse.json({
        success: true,
        message: "Proses pairing code dimulai.",
        data: status,
      });
    }

    if (action === "disconnect") {
      await disconnectWhatsAppBot();

      return NextResponse.json({
        success: true,
        message: "Koneksi WhatsApp diputus tanpa menghapus session.",
      });
    }

    if (action === "logout") {
      await logoutWhatsAppBot();

      return NextResponse.json({
        success: true,
        message: "Session WhatsApp logout dan folder auth direset.",
      });
    }

    return NextResponse.json(
      { error: "Action tidak dikenal." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses permintaan WhatsApp." },
      { status: 500 }
    );
  }
}
