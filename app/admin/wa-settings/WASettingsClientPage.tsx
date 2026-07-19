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
  success?: boolean;
  message?: string;
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
    { label: string; className: string; dotClass: string; icon: string }
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
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide",
        item.className
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", item.dotClass)} />
      <i
        className={cn(
          item.icon,
          status === "CONNECTING" || status === "RECONNECTING" ? "animate-spin" : ""
        )}
      />
      {item.label}
    </span>
  );
}

export default function WASettingsClientPage() {
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
    setStatus(data.status || "DISCONNECTED");
    setQrCode(data.qrCode || "");
    setPairingCode(data.pairingCode || "");
    setConnected(Boolean(data.connected));
    setLastError(data.lastError || "");
    setUpdatedAt(
      new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "medium",
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
        });

        const data = await res.json().catch(() => ({
          success: false,
          message: "Response status WA tidak valid.",
        }));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || `HTTP ${res.status} saat ambil status.`);
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
    async (url: string, action: ActionType, body?: Record<string, unknown>) => {
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

        const data = await res.json().catch(() => ({
          success: false,
          message: "Response API tidak valid.",
        }));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || `HTTP ${res.status} saat memproses aksi.`);
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

  if (pageLoading) {
    return <div className="p-6 text-sm font-medium text-slate-500">Memuat WA settings...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              WhatsApp Admin Settings
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              Kelola koneksi WhatsApp manual
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Gunakan QR Code atau pairing code untuk menghubungkan nomor WhatsApp admin ke sistem.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchStatus()}
            disabled={isBusy}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh Status
          </button>
        </div>

        {feedback ? (
          <div
            className={cn(
              "mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold",
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            )}
          >
            {feedback.text}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Status
            </div>
            <div className="mt-3">
              <StatusBadge status={status} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Connected
            </div>
            <div className="mt-3 text-lg font-extrabold text-slate-900">
              {connected ? "Ya" : "Tidak"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Last Error
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-700">
              {lastError || "-"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Updated At
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-700">
              {updatedAt}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                QR Code
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-slate-950">
                Connect dengan QR
              </h2>
            </div>

            <button
              type="button"
              onClick={handleGenerateQR}
              disabled={isBusy}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              Generate QR
            </button>
          </div>

          <div className="mt-6">
            {status === "QR_READY" && qrCode ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(qrCode)}`}
                  alt="QR Code WhatsApp"
                  width={360}
                  height={360}
                  className="mx-auto h-auto w-full max-w-[360px] rounded-2xl bg-white p-3"
                />
              </div>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
                QR belum tersedia. Klik Generate QR untuk membuat QR baru.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Pairing Code
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-slate-950">
              Connect dengan Pairing Code
            </h2>

            <div className="mt-5 space-y-3">
              <input
                type="text"
                inputMode="numeric"
                value={pairingPhone}
                onChange={(e) => setPairingPhone(e.target.value)}
                placeholder="Contoh: 6281234567890"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-300"
              />

              <button
                type="button"
                onClick={handleGeneratePairing}
                disabled={isBusy}
                className="w-full rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                Generate Pairing Code
              </button>
            </div>

            <div className="mt-5">
              {status === "PAIRING_CODE" && pairingCode ? (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                    Pairing Code
                  </div>
                  <div className="mt-2 break-all text-3xl font-extrabold tracking-[0.18em] text-violet-800">
                    {pairingCode}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-medium text-slate-500">
                  Pairing code belum tersedia.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Session Action
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-slate-950">
              Disconnect atau Logout
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isBusy}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              >
                Disconnect
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isBusy}
                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                Logout & Reset Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
