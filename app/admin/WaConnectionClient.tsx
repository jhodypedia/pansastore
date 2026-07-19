"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type WAResponse = {
  status: string;
  qrCode?: string;
  qr?: string;
  pairingCode?: string;
  connected?: boolean;
  lastError?: string;
};

const POLLING_INTERVAL = 5000;

export default function WaConnectionClient() {
  const [waData, setWaData] = useState<WAResponse>({
    status: "LOADING",
    qrCode: "",
    qr: "",
    pairingCode: "",
    connected: false,
    lastError: "",
  });

  useEffect(() => {
    let mounted = true;

    const fetchWaStatus = async () => {
      try {
        const res = await fetch("/api/admin/whatsapp", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!mounted) return;

          setWaData((prev) => ({
            ...prev,
            status: "ERROR",
            lastError: "Gagal mengambil status WhatsApp.",
          }));
          return;
        }

        const data = await res.json();

        if (!mounted) return;

        setWaData({
          status: String(data?.status || "DISCONNECTED"),
          qrCode: String(data?.qrCode || ""),
          qr: String(data?.qr || ""),
          pairingCode: String(data?.pairingCode || ""),
          connected: Boolean(data?.connected),
          lastError: String(data?.lastError || ""),
        });
      } catch {
        if (!mounted) return;

        setWaData((prev) => ({
          ...prev,
          status: "ERROR",
          lastError: "Tidak dapat terhubung ke endpoint WhatsApp.",
        }));
      }
    };

    fetchWaStatus();
    const interval = window.setInterval(fetchWaStatus, POLLING_INTERVAL);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const qrValue = waData.qrCode || waData.qr || "";
  const isConnected = waData.status === "CONNECTED" || waData.connected;
  const isQrReady = waData.status === "QR_READY" && !!qrValue;
  const isPairingReady =
    waData.status === "PAIRING_CODE" && !!waData.pairingCode;
  const isLoading =
    waData.status === "LOADING" ||
    waData.status === "CONNECTING" ||
    waData.status === "RECONNECTING";
  const isError =
    waData.status === "ERROR" ||
    waData.status === "DISCONNECTED";

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="text-lg font-black text-slate-900">Terhubung</h3>
          </div>
          <p className="text-sm font-medium text-slate-500">
            PANSA GROUP WhatsApp aktif dan siap mengirim notifikasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/wa-settings"
            className="inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))] hover:underline"
          >
            <i className="ri-settings-4-line"></i>
            Buka WA Settings
          </Link>
        </div>
      </div>
    );
  }

  if (isQrReady) {
    return (
      <div className="flex flex-col items-center justify-center mt-2">
        <div className="bg-white p-2 rounded-lg border border-slate-200 inline-block mb-3">
          <QRCodeSVG value={qrValue} size={100} />
        </div>

        <p className="text-xs font-bold text-slate-500 text-center uppercase tracking-widest">
          Scan QR untuk menghubungkan
        </p>

        <Link
          href="/admin/wa-settings"
          className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--primary))] hover:underline"
        >
          <i className="ri-external-link-line"></i>
          Buka panel lengkap
        </Link>
      </div>
    );
  }

  if (isPairingReady) {
    return (
      <div className="space-y-3 mt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
          <h3 className="text-base font-black text-slate-900">
            Pairing Code Siap
          </h3>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-blue-600 font-black mb-2">
            Kode Pairing
          </p>
          <p className="text-xl font-black tracking-[0.2em] text-blue-900">
            {waData.pairingCode}
          </p>
        </div>

        <p className="text-xs font-medium text-slate-500">
          Masukkan kode ini pada perangkat WhatsApp yang akan dihubungkan.
        </p>

        <Link
          href="/admin/wa-settings"
          className="inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--primary))] hover:underline"
        >
          <i className="ri-external-link-line"></i>
          Buka panel lengkap
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-start justify-center mt-2">
        <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-slate-500 text-sm font-bold">
          {waData.status === "RECONNECTING"
            ? "Menghubungkan ulang WhatsApp..."
            : "Menyiapkan WhatsApp..."}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 mt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <h3 className="text-lg font-black text-slate-900">Belum Terhubung</h3>
        </div>

        <p className="text-sm font-medium text-slate-500">
          {waData.lastError || "WhatsApp belum aktif atau perlu login ulang."}
        </p>

        <Link
          href="/admin/wa-settings"
          className="inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))] hover:underline"
        >
          <i className="ri-whatsapp-line"></i>
          Buka WA Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-slate-300"></span>
        <h3 className="text-lg font-black text-slate-900">Status Tidak Diketahui</h3>
      </div>

      <p className="text-sm font-medium text-slate-500">
        Sistem belum menerima status WhatsApp terbaru.
      </p>

      <Link
        href="/admin/wa-settings"
        className="inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))] hover:underline"
      >
        <i className="ri-whatsapp-line"></i>
        Buka WA Settings
      </Link>
    </div>
  );
}
