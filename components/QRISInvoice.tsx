"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkPaymentStatus } from "@/actions/status";

interface QRISInvoiceProps {
  paymentData: {
    order_id: string;
    amount: number;
    total_payment: number;
    fee: number;
    payment_number: string;
    expired_at: string;
    qris_image_url?: string | null;
    qr_string?: string | null;
  };
  invoiceId?: string;
  invoiceUrl?: string;
  amount?: number;
  qrisImageUrl?: string;
}

export default function QRISInvoice({
  paymentData,
  invoiceId,
  invoiceUrl,
  amount,
  qrisImageUrl,
}: QRISInvoiceProps) {
  const router = useRouter();
  const mountedRef = useRef(true);

  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [hasRedirected, setHasRedirected] = useState<boolean>(false);

  const resolvedInvoiceId = invoiceId || paymentData.order_id;
  const resolvedAmount = Number(amount || paymentData.total_payment || paymentData.amount || 0);

  const resolvedQrisImageUrl = useMemo(() => {
    return (
      qrisImageUrl ||
      paymentData.qris_image_url ||
      null
    );
  }, [paymentData.qris_image_url, qrisImageUrl]);

  const resolvedQrValue = useMemo(() => {
    return paymentData.qr_string || paymentData.payment_number || "";
  }, [paymentData.qr_string, paymentData.payment_number]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const expiryTime = new Date(paymentData.expired_at).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance <= 0) {
        clearInterval(timer);

        if (!mountedRef.current) return;
        setTimeLeft("00:00");
        setIsExpired(true);
        setIsChecking(false);
        return;
      }

      const totalSeconds = Math.floor(distance / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const display =
        hours > 0
          ? `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
          : `${minutes.toString().padStart(2, "0")}:${seconds
              .toString()
              .padStart(2, "0")}`;

      if (!mountedRef.current) return;
      setTimeLeft(display);
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentData.expired_at]);

  useEffect(() => {
    if (isExpired || isSuccess || hasRedirected) return;

    const interval = setInterval(async () => {
      try {
        const status = await checkPaymentStatus(paymentData.order_id);

        if (!mountedRef.current) return;

        if (status === "COMPLETED") {
          setIsSuccess(true);
          setIsChecking(false);
          setHasRedirected(true);
          clearInterval(interval);

          router.replace(`/cek-pesanan?invoice=${paymentData.order_id}`);
          return;
        }

        if (status === "EXPIRED" || status === "FAILED") {
          setIsChecking(false);

          if (status === "EXPIRED") {
            setIsExpired(true);
          }

          clearInterval(interval);
          return;
        }

        setIsChecking(true);
      } catch (error) {
        console.error("Gagal mengecek status:", error);

        if (!mountedRef.current) return;
        setIsChecking(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [hasRedirected, isExpired, isSuccess, paymentData.order_id, router]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-white/20 bg-white/95 shadow-[0_0_40px_rgba(16,185,129,0.15)] backdrop-blur-xl">
      <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-[#C8A24D] to-emerald-500 shadow-[0_0_10px_rgba(200,162,77,0.5)]" />

      <div className="relative overflow-hidden bg-[#0A1F1A] p-6 text-center">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-[50px]" />
        <h2 className="relative z-10 text-xl font-extrabold tracking-tight text-white drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
          Scan QRIS
        </h2>
        <p className="relative z-10 mt-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300/70">
          ID: {resolvedInvoiceId}
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-center p-6 md:p-8">
        <div className="mb-4 w-full rounded-2xl border border-emerald-900/10 bg-emerald-900/5 py-3 text-center backdrop-blur-sm">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-900/50">
            Sisa Waktu Pembayaran
          </p>
          <p
            className={`text-2xl font-black tracking-tight drop-shadow-sm ${
              isExpired ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {isExpired ? "KADALUARSA" : timeLeft || "--:--"}
          </p>
        </div>

        <div className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Status Pembayaran
          </div>
          <div
            className={`mt-1 text-sm font-black ${
              isSuccess
                ? "text-emerald-700"
                : isExpired
                ? "text-rose-600"
                : isChecking
                ? "text-amber-600"
                : "text-slate-700"
            }`}
          >
            {isSuccess
              ? "Pembayaran berhasil"
              : isExpired
              ? "Invoice kedaluwarsa"
              : isChecking
              ? "Menunggu pembayaran"
              : "Sedang diverifikasi"}
          </div>
        </div>

        <div className="group relative mb-6 rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
          {isExpired && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-white/80 backdrop-blur-md">
              <span className="rotate-[-12deg] rounded-xl border-4 border-red-600 bg-white/50 px-5 py-2 text-xl font-black uppercase tracking-widest text-red-600 shadow-lg">
                Expired
              </span>
            </div>
          )}

          {isSuccess && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-emerald-500/90 backdrop-blur-md">
              <i className="ri-check-double-line mb-2 text-5xl text-white animate-bounce" />
              <span className="text-lg font-black uppercase tracking-widest text-white shadow-lg">
                Berhasil
              </span>
            </div>
          )}

          <div className="relative z-10 overflow-hidden rounded-xl bg-white">
            {resolvedQrisImageUrl ? (
              <img
                src={resolvedQrisImageUrl}
                alt={`QRIS pembayaran untuk invoice ${resolvedInvoiceId}`}
                width={280}
                height={280}
                loading="eager"
                className="h-auto w-[280px] max-w-full object-contain"
              />
            ) : (
              <QRCodeSVG
                value={resolvedQrValue}
                size={220}
                level="M"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#111827"
                className="rounded-lg"
              />
            )}
          </div>
        </div>

        <div className="mb-6 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-xs font-medium text-emerald-800 backdrop-blur-sm">
          <i className="ri-information-fill mt-0.5 text-base text-emerald-600" />
          <p>
            Buka aplikasi M-Banking atau e-Wallet Anda, pilih menu Scan QR, lalu arahkan kamera ke kode di atas. Gunakan gambar QRIS ini sebelum waktu pembayaran habis.
          </p>
        </div>

        <div className="w-full space-y-3 text-sm font-medium text-emerald-900/70">
          <div className="flex items-center justify-between border-b border-dashed border-emerald-900/10 pb-3">
            <span>Invoice</span>
            <span className="font-bold text-[#0A1F1A]">{resolvedInvoiceId}</span>
          </div>

          <div className="flex items-center justify-between border-b border-dashed border-emerald-900/10 pb-3">
            <span>Nominal Pembelian</span>
            <span className="font-bold text-[#0A1F1A]">
              {formatRupiah(paymentData.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-dashed border-emerald-900/10 pb-3">
            <span className="text-xs">Biaya Layanan (Fee)</span>
            <span className="text-xs">{formatRupiah(paymentData.fee)}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="font-bold text-[#0A1F1A]">Total Bayar</span>
            <span className="text-2xl font-black text-emerald-700 drop-shadow-sm">
              {formatRupiah(paymentData.total_payment || resolvedAmount)}
            </span>
          </div>
        </div>

        {invoiceUrl ? (
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
          >
            Buka invoice detail
            <i className="ri-external-link-line" />
          </a>
        ) : null}
      </div>

      <div className="border-t border-emerald-900/10 bg-[#F7F5EF] px-6 py-5">
        {!isExpired ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-900/60">
              {isSuccess ? (
                <span className="text-emerald-700">Mengalihkan ke pesanan...</span>
              ) : (
                <>
                  <i className="ri-loader-4-line text-base text-emerald-600 animate-spin drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]" />
                  Menunggu Pembayaran...
                </>
              )}
            </div>

            <Link
              href={`/cek-pesanan?invoice=${paymentData.order_id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all duration-300 hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(5,150,105,0.5)] active:scale-[0.98]"
            >
              Saya Sudah Bayar <i className="ri-arrow-right-line" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <Link
              href="/"
              className="inline-block w-full rounded-xl bg-emerald-900/10 py-3.5 text-sm font-bold text-emerald-900 transition-all hover:bg-emerald-900/20 active:scale-[0.98]"
            >
              Kembali ke Beranda
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
