// app/admin/wa-settings/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WAStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QR_READY"
  | "PAIRING_CODE"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR";

type WAStatusResponse = {
  status?: WAStatus;
  qrCode?: string;
  pairingCode?: string;
  connected?: boolean;
  lastError?: string;
};

type ActionType =
  | "idle"
  | "refresh"
  | "generate-qr"
  | "generate-pairing"
  | "disconnect"
  | "logout";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function StatusBadge({ status }: { status: WAStatus }) {
  const map: Record<
    WAStatus,
    {
      label: string;
      className: string;
      dotClass: string;
      icon: string;
    }
  > = {
    DISCONNECTED: {
      label: "Disconnected",
      className: "bg-slate-100 text-slate-700 border-slate-200",
      dotClass: "bg-slate-400",
      icon: "ri-plug-line",
    },
    CONNECTING: {
      label: "Connecting",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      dotClass: "bg-blue-500",
      icon: "ri-loader-4-line",
    },
    QR_READY: {
      label: "QR Ready",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
      icon: "ri-qr-code-line",
    },
    PAIRING_CODE: {
      label: "Pairing Code Ready",
      className: "bg-violet-50 text-violet-700 border-violet-200",
      dotClass: "bg-violet-500",
      icon: "ri-key-2-line",
    },
    CONNECTED: {
      label: "Connected",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
      icon: "ri-checkbox-circle-line",
    },
    RECONNECTING: {
      label: "Reconnecting",
      className: "bg-orange-50 text-orange-700 border-orange-200",
      dotClass: "bg-orange-500",
      icon: "ri-refresh-line",
    },
    ERROR: {
      label: "Error",
      className: "bg-rose-50 text-rose-700 border-rose-200",
      dotClass: "bg-rose-500",
      icon: "ri-error-warning-line",
    },
  };

  const item = map[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black tracking-wide",
        item.className
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", item.dotClass)} />
      <i className={cn(item.icon, status === "CONNECTING" || status === "RECONNECTING" ? "animate-spin" : "")} />
      {item.label}
    </span>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("skeleton shimmer rounded-2xl", className)} />;
}

function QRPlaceholder() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] bg-white shadow-sm border border-slate-200">
        <i className="ri-qr-code-line text-4xl text-slate-400" />
      </div>
      <h3 className="text-lg font-black tracking-tight text-slate-900">
        QR belum digenerate
      </h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-slate-500 font-medium">
        QR code hanya akan dibuat ketika tombol <span className="font-bold text-slate-800">Generate QR</span> ditekan.
        Halaman ini tidak menjalankan generate otomatis saat dibuka.
      </p>
    </div>
  );
}

function PairingPlaceholder() {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
        <i className="ri-key-2-line text-2xl text-slate-400" />
      </div>
      <div className="text-sm font-black text-slate-900">Pairing code belum dibuat</div>
      <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500 font-medium">
        Masukkan nomor WhatsApp lalu klik generate pairing code saat dibutuhkan.
      </p>
    </div>
  );
}

function WAStatusCard({
  status,
  connected,
  lastError,
  updatedAt,
}: {
  status: WAStatus;
  connected: boolean;
  lastError: string;
  updatedAt: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            WhatsApp Session
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Manual Connection Control
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500 font-medium">
            Status tidak memicu generate QR otomatis. Anda pegang penuh kapan membuat QR, pairing code, disconnect, atau logout.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <StatusBadge status={status} />
          <div className="text-xs font-semibold text-slate-400">
            Update terakhir: {updatedAt}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Connected
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">
            {connected ? "Ya" : "Tidak"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Session State
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">{status}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Last Error
          </div>
          <div className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
            {lastError || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WASettingsPage() {
  const [status, setStatus] = useState<WAStatus>("DISCONNECTED");
  const [qrCode, setQrCode] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState("");
  const [pairingPhone, setPairingPhone] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionType>("idle");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState("-");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const shouldPoll = useMemo(() => {
    return status === "CONNECTING" || status === "QR_READY" || status === "PAIRING_CODE" || status === "RECONNECTING";
  }, [status]);

  const applyStatus = useCallback((data: WAStatusResponse) => {
    const nextStatus = data.status || "DISCONNECTED";
    setStatus(nextStatus);
    setQrCode(data.qrCode || "");
    setPairingCode(data.pairingCode || "");
    setConnected(Boolean(data.connected));
    setLastError(data.lastError || "");
    setUpdatedAt(
      new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date())
    );
  }, []);

  const fetchStatus = useCallback(
    async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
      try {
        if (!opts?.silent) setActionLoading("refresh");

        const res = await fetch("/api/admin/wa/status", {
          method: "GET",
          cache: "no-store",
          signal: opts?.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = (await res.json().catch(() => ({}))) as WAStatusResponse & {
          success?: boolean;
          message?: string;
        };

        if (!res.ok) {
          throw new Error(data?.message || "Gagal mengambil status WhatsApp.");
        }

        if (!mountedRef.current) return;
        applyStatus(data);
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        if (!mountedRef.current) return;

        setFeedback({
          type: "error",
          text: error?.message || "Terjadi kesalahan saat memuat status WhatsApp.",
        });
      } finally {
        if (!opts?.silent && mountedRef.current) {
          setActionLoading("idle");
        }
      }
    },
    [applyStatus]
  );

  const callAction = useCallback(
    async (
      url: string,
      action: ActionType,
      body?: Record<string, unknown>
    ) => {
      setFeedback(null);
      setActionLoading(action);

      try {
        const res = await fetch(url, {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = (await res.json().catch(() => ({}))) as WAStatusResponse & {
          success?: boolean;
          message?: string;
        };

        if (!res.ok) {
          throw new Error(data?.message || "Aksi gagal diproses.");
        }

        if (!mountedRef.current) return;

        applyStatus(data);

        setFeedback({
          type: "success",
          text:
            action === "generate-qr"
              ? "QR berhasil diminta. Silakan scan dari WhatsApp."
              : action === "generate-pairing"
              ? "Pairing code berhasil diminta."
              : action === "disconnect"
              ? "Socket berhasil diputus tanpa menghapus session."
              : action === "logout"
              ? "Berhasil logout dan reset session."
              : "Status berhasil diperbarui.",
        });
      } catch (error: any) {
        if (!mountedRef.current) return;
        setFeedback({
          type: "error",
          text: error?.message || "Terjadi kesalahan saat menjalankan aksi.",
        });
      } finally {
        if (mountedRef.current) {
          setActionLoading("idle");
        }
      }
    },
    [applyStatus]
  );

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    (async () => {
      try {
        await fetchStatus({ signal: controller.signal });
      } finally {
        if (mountedRef.current) setPageLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
      controller.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (!shouldPoll) return;

    pollRef.current = setInterval(() => {
      fetchStatus({ silent: true });
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [shouldPoll, fetchStatus]);

  const handleGenerateQR = async () => {
    await callAction("/api/admin/wa/start-qr", "generate-qr");
  };

  const handleGeneratePairing = async () => {
    const cleanedPhone = pairingPhone.replace(/\D/g, "");

    if (!cleanedPhone) {
      setFeedback({
        type: "error",
        text: "Nomor WhatsApp untuk pairing code wajib diisi.",
      });
      return;
    }

    await callAction("/api/admin/wa/start-pairing", "generate-pairing", {
      phone: cleanedPhone,
    });
  };

  const handleDisconnect = async () => {
    await callAction("/api/admin/wa/disconnect", "disconnect");
  };

  const handleLogout = async () => {
    const ok = window.confirm(
      "Yakin ingin logout WhatsApp? Session lokal akan direset dan perlu login ulang."
    );

    if (!ok) return;

    await callAction("/api/admin/wa/logout", "logout");
  };

  const isBusy = actionLoading !== "idle";
  const isGeneratingQR = actionLoading === "generate-qr";
  const isGeneratingPairing = actionLoading === "generate-pairing";
  const isRefreshing = actionLoading === "refresh";
  const isDisconnecting = actionLoading === "disconnect";
  const isLoggingOut = actionLoading === "logout";

  return (
    <>
      <style>{`
        .skeleton {
          background-color: #e5e7eb;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .shimmer {
          background-image: linear-gradient(
            90deg,
            rgba(226,232,240,1) 0%,
            rgba(248,250,252,1) 20%,
            rgba(226,232,240,1) 40%,
            rgba(226,232,240,1) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s linear infinite;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-up {
          animation: fadeUp .45s ease-out both;
        }

        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(5,150,105,.18); }
          70% { box-shadow: 0 0 0 12px rgba(5,150,105,0); }
          100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); }
        }

        .pulse-ring {
          animation: pulseRing 2s infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .shimmer,
          .fade-up,
          .pulse-ring,
          .animate-spin {
            animation: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="fade-up flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2">
              <i className="ri-whatsapp-fill text-sm text-emerald-700" />
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                WhatsApp Settings
              </span>
            </div>

            <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-slate-950">
              Kelola koneksi WhatsApp manual
            </h1>
            <p className="mt-3 max-w-3xl text-sm md:text-base leading-7 text-slate-500 font-medium">
              Halaman ini dirancang supaya QR code dan pairing code hanya dibuat saat tombol diklik.
              Tidak ada auto-generate saat halaman dibuka.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fetchStatus()}
              disabled={isBusy}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition-all",
                isBusy
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              )}
            >
              <i className={cn("ri-refresh-line", isRefreshing ? "animate-spin" : "")} />
              Refresh Status
            </button>
          </div>
        </div>

        {feedback ? (
          <div
            className={cn(
              "fade-up rounded-[24px] border px-5 py-4 text-sm font-bold shadow-sm",
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            )}
          >
            <div className="flex items-start gap-3">
              <i
                className={cn(
                  "mt-0.5 text-lg",
                  feedback.type === "success"
                    ? "ri-checkbox-circle-fill"
                    : "ri-error-warning-fill"
                )}
              />
              <div>{feedback.text}</div>
            </div>
          </div>
        ) : null}

        {pageLoading ? (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-4 h-10 w-80" />
              <Skeleton className="mt-3 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-4/5" />
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-4 h-[360px] w-full rounded-[28px]" />
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-4 h-14 w-full" />
                  <Skeleton className="mt-3 h-14 w-full" />
                  <Skeleton className="mt-3 h-14 w-full" />
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-4 h-40 w-full rounded-[24px]" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <WAStatusCard
              status={status}
              connected={connected}
              lastError={lastError}
              updatedAt={updatedAt}
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <section className="fade-up rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      QR Connection
                    </div>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                      Generate QR hanya saat dibutuhkan
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-500 font-medium">
                      Tidak ada auto-generate di page load. Tombol di bawah ini akan request QR baru sesuai session saat ini.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateQR}
                    disabled={isBusy}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-all",
                      isBusy
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : "bg-emerald-700 text-white shadow-[0_16px_35px_rgba(5,150,105,0.20)] hover:bg-emerald-600"
                    )}
                  >
                    <i className={cn(isGeneratingQR ? "ri-loader-4-line animate-spin" : "ri-qr-code-line")} />
                    {isGeneratingQR ? "Generating..." : "Generate QR"}
                  </button>
                </div>

                <div className="mt-6">
                  {status === "QR_READY" && qrCode ? (
                    <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-amber-100">
                          <i className="ri-qr-code-line text-2xl text-amber-700" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900">QR Siap Dipindai</div>
                          <div className="text-xs font-semibold text-slate-500">
                            Buka WhatsApp &gt; Linked Devices &gt; Scan QR
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] bg-white p-4 shadow-sm border border-amber-100">
                        <div className="mx-auto flex max-w-[360px] items-center justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(qrCode)}`}
                            alt="QR Code WhatsApp"
                            width={360}
                            height={360}
                            className="h-auto w-full max-w-[360px] rounded-2xl"
                          />
                        </div>
                      </div>
                    </div>
                  ) : status === "CONNECTING" || status === "RECONNECTING" ? (
                    <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-6">
                      <div className="flex items-center gap-4">
                        <div className="pulse-ring flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-blue-100">
                          <i className="ri-loader-4-line animate-spin text-2xl text-blue-700" />
                        </div>
                        <div>
                          <div className="text-base font-black text-slate-900">Menyiapkan koneksi</div>
                          <div className="mt-1 text-sm font-medium text-slate-500">
                            Sistem sedang menunggu QR atau melanjutkan proses koneksi.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <QRPlaceholder />
                  )}
                </div>
              </section>

              <div className="space-y-6">
                <section className="fade-up rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Pairing Code
                  </div>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                    Connect via nomor WhatsApp
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500 font-medium">
                    Masukkan nomor WA tujuan pairing dalam format Indonesia. Pairing code akan dibuat saat tombol ditekan.
                  </p>

                  <div className="mt-5">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Nomor WhatsApp
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        placeholder="Contoh: 6281234567890"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      />
                      <button
                        type="button"
                        onClick={handleGeneratePairing}
                        disabled={isBusy}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black transition-all sm:min-w-[190px]",
                          isBusy
                            ? "cursor-not-allowed bg-slate-100 text-slate-400"
                            : "bg-violet-700 text-white shadow-[0_16px_35px_rgba(109,40,217,0.18)] hover:bg-violet-600"
                        )}
                      >
                        <i className={cn(isGeneratingPairing ? "ri-loader-4-line animate-spin" : "ri-key-2-line")} />
                        {isGeneratingPairing ? "Generating..." : "Generate Pairing"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    {status === "PAIRING_CODE" && pairingCode ? (
                      <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-violet-100">
                            <i className="ri-key-2-line text-2xl text-violet-700" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-slate-900">
                              Pairing code siap digunakan
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              Masukkan kode ini di perangkat WhatsApp yang akan dihubungkan.
                            </div>

                            <div className="mt-4 rounded-2xl border border-violet-200 bg-white px-4 py-4">
                              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Pairing Code
                              </div>
                              <div className="mt-2 break-all text-3xl font-black tracking-[0.18em] text-violet-700">
                                {pairingCode}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : status === "CONNECTING" || status === "RECONNECTING" ? (
                      <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-5">
                        <div className="flex items-center gap-3">
                          <i className="ri-loader-4-line animate-spin text-2xl text-blue-700" />
                          <div>
                            <div className="text-sm font-black text-slate-900">Menunggu pairing code</div>
                            <div className="text-xs font-medium text-slate-500">
                              Sistem sedang menyiapkan sesi pairing.
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <PairingPlaceholder />
                    )}
                  </div>
                </section>

                <section className="fade-up rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Session Actions
                  </div>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                    Disconnect atau logout session
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500 font-medium">
                    Disconnect hanya memutus socket tanpa hapus folder session. Logout akan reset session dan memerlukan login ulang.
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isBusy}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black transition-all",
                        isBusy
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      )}
                    >
                      <i className={cn(isDisconnecting ? "ri-loader-4-line animate-spin" : "ri-plug-line")} />
                      {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isBusy}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black transition-all",
                        isBusy
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : "bg-rose-600 text-white hover:bg-rose-500"
                      )}
                    >
                      <i className={cn(isLoggingOut ? "ri-loader-4-line animate-spin" : "ri-logout-box-r-line")} />
                      {isLoggingOut ? "Logging out..." : "Logout & Reset Session"}
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <i className="ri-information-line mt-0.5 text-lg text-slate-500" />
                      <div className="text-xs leading-6 text-slate-500 font-medium">
                        Gunakan <span className="font-bold text-slate-700">Generate QR</span> untuk login dengan scan QR,
                        atau <span className="font-bold text-slate-700">Generate Pairing</span> untuk login lewat kode.
                        Halaman ini sengaja tidak memulai generate otomatis saat dibuka agar kontrol tetap penuh di tangan admin.
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
