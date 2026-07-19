"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type WAStatusResponse = {
  status: string;
  qrCode?: string;
  pairingCode?: string;
  connected?: boolean;
  lastError?: string;
};

const POLLING_INTERVAL = 5000;

export default function WASettingsPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [waData, setWaData] = useState<WAStatusResponse>({
    status: "LOADING",
    qrCode: "",
    pairingCode: "",
    connected: false,
    lastError: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      setWaData({
        status: String(data?.status || "DISCONNECTED"),
        qrCode: String(data?.qrCode || ""),
        pairingCode: String(data?.pairingCode || ""),
        connected: Boolean(data?.connected),
        lastError: String(data?.lastError || ""),
      });
    } catch {
      setWaData((prev) => ({
        ...prev,
        status: "ERROR",
        lastError: "Gagal mengambil status WhatsApp.",
      }));
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = window.setInterval(fetchStatus, POLLING_INTERVAL);

    return () => window.clearInterval(interval);
  }, []);

  const statusTone = useMemo(() => {
    switch (waData.status) {
      case "CONNECTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "QR_READY":
      case "PAIRING_CODE":
      case "CONNECTING":
      case "RECONNECTING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ERROR":
      case "DISCONNECTED":
      default:
        return "bg-red-50 text-red-700 border-red-200";
    }
  }, [waData.status]);

  const handleAction = async (action: "start-qr" | "start-pairing" | "disconnect" | "logout") => {
    try {
      setIsSubmitting(true);

      const body =
        action === "start-pairing"
          ? {
              action,
              phoneNumber,
            }
          : { action };

      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setWaData((prev) => ({
          ...prev,
          status: "ERROR",
          lastError: String(data?.error || "Permintaan gagal diproses."),
        }));
        return;
      }

      await fetchStatus();
    } catch {
      setWaData((prev) => ({
        ...prev,
        status: "ERROR",
        lastError: "Gagal memproses permintaan.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            WA Settings
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Kelola koneksi WhatsApp untuk notifikasi invoice, pembayaran, dan proses order.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleAction("start-qr")}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-[hsl(var(--primary))] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-60"
          >
            <i className="ri-qr-scan-2-line"></i>
            Connect QR
          </button>

          <button
            onClick={() => handleAction("disconnect")}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <i className="ri-link-unlink-m"></i>
            Disconnect
          </button>

          <button
            onClick={() => handleAction("logout")}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            <i className="ri-logout-box-r-line"></i>
            Logout & Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
            <h3 className="font-extrabold text-slate-900 tracking-tight">
              Status Koneksi
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Pantau status login WhatsApp secara real-time.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-black uppercase tracking-wide ${statusTone}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80"></span>
                {waData.status}
              </span>

              {waData.connected && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                  Session aktif
                </span>
              )}
            </div>

            {waData.lastError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {waData.lastError}
              </div>
            ) : null}

            {waData.status === "CONNECTED" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <i className="ri-checkbox-circle-fill text-xl"></i>
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-900">WhatsApp Terhubung</h4>
                    <p className="text-sm text-emerald-700">
                      Bot siap digunakan untuk notifikasi customer.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {waData.status === "QR_READY" && waData.qrCode && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center text-center">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-4">
                  <QRCodeSVG value={waData.qrCode} size={220} />
                </div>
                <h4 className="font-black text-slate-900 mb-1">Scan QR Code</h4>
                <p className="text-sm text-slate-500 max-w-md">
                  Buka WhatsApp pada perangkat utama, lalu scan QR ini untuk menghubungkan session baru.
                </p>
              </div>
            )}

            {waData.status === "PAIRING_CODE" && waData.pairingCode && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
                <p className="text-[11px] uppercase tracking-[0.24em] text-blue-600 font-black mb-2">
                  Pairing Code
                </p>
                <div className="text-3xl md:text-4xl font-black tracking-[0.28em] text-blue-950">
                  {waData.pairingCode}
                </div>
                <p className="text-sm text-blue-700 mt-3">
                  Masukkan kode ini di WhatsApp pada menu perangkat tertaut.
                </p>
              </div>
            )}

            {(waData.status === "CONNECTING" || waData.status === "RECONNECTING") && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <i className="ri-loader-4-line text-xl animate-spin"></i>
                  </div>
                  <div>
                    <h4 className="font-black text-amber-900">
                      {waData.status === "RECONNECTING"
                        ? "Menghubungkan Ulang"
                        : "Menyiapkan Koneksi"}
                    </h4>
                    <p className="text-sm text-amber-700">
                      Mohon tunggu, sistem sedang memproses session WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(waData.status === "DISCONNECTED" || waData.status === "ERROR") && !waData.qrCode && !waData.pairingCode && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
                    <i className="ri-whatsapp-line text-xl"></i>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">Belum Ada Session Aktif</h4>
                    <p className="text-sm text-slate-500">
                      Gunakan QR code atau pairing code untuk memulai koneksi baru.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
            <h3 className="font-extrabold text-slate-900 tracking-tight">
              Pairing Code
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Hubungkan perangkat tanpa scan QR.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Nomor WhatsApp
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="6281234567890"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))]"
              />
              <p className="text-xs text-slate-500 mt-2">
                Gunakan format E.164 tanpa tanda tambah, contoh: 6281234567890.
              </p>
            </div>

            <button
              onClick={() => handleAction("start-pairing")}
              disabled={isSubmitting || !phoneNumber.trim()}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <i className="ri-smartphone-line"></i>
              Generate Pairing Code
            </button>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">Catatan:</p>
              <ul className="space-y-1">
                <li>- Pairing code hanya muncul jika session belum terdaftar.</li>
                <li>- Jika sudah pernah login, lakukan logout reset terlebih dulu bila ingin ganti akun.</li>
                <li>- Setelah berhasil login, status akan berubah menjadi CONNECTED.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
