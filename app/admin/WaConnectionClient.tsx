"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function WaConnectionClient() {
  const [waData, setWaData] = useState<{ status: string; qr: string }>({ status: "LOADING", qr: "" });

  useEffect(() => {
    const fetchWaStatus = async () => {
      try {
        const res = await fetch("/api/admin/whatsapp");
        const data = await res.json();
        setWaData(data);
      } catch (error) {
        console.error("Gagal mengambil status WA");
      }
    };

    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (waData.status === "CONNECTED") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <h3 className="text-lg font-black text-slate-900">Terhubung</h3>
        </div>
        <p className="text-sm font-medium text-slate-500">PANSA GROUP WHATSAPP OTP aktif.</p>
      </div>
    );
  }

  if (waData.status === "QR_READY" && waData.qr) {
    return (
      <div className="flex flex-col items-center justify-center mt-2">
        <div className="bg-white p-2 rounded-lg border border-slate-200 inline-block mb-3">
          <QRCodeSVG value={waData.qr} size={100} />
        </div>
        <p className="text-xs font-bold text-slate-500 text-center uppercase tracking-widest">
          Scan QR untuk menghubungkan
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start justify-center animate-pulse mt-2">
      <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mb-2"></div>
      <p className="text-slate-500 text-sm font-bold">Menyiapkan WhatsApp...</p>
    </div>
  );
}