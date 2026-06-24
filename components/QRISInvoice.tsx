"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRISInvoiceProps {
  paymentData: {
    order_id: string;
    amount: number;
    total_payment: number;
    fee: number;
    payment_number: string; // Raw QRIS string dari Pakasir
    expired_at: string;
  };
}

export default function QRISInvoice({ paymentData }: QRISInvoiceProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Hitung mundur waktu kedaluwarsa
  useEffect(() => {
    // Pastikan format expired_at valid untuk di-parse
    const expiryTime = new Date(paymentData.expired_at).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft("00:00");
        setIsExpired(true);
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentData.expired_at]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-emerald-900/10 shadow-[0_20px_40px_-15px_rgba(10,31,26,0.1)] rounded-[28px] overflow-hidden relative">
      {/* Garis Aksen Emas */}
      <div className="h-[3px] w-full bg-gradient-to-r from-emerald-600 via-[#C8A24D] to-emerald-600" />

      {/* Header Info */}
      <div className="bg-[#0A1F1A] p-6 text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-600/20 blur-[50px] pointer-events-none" />
        <h2 className="text-xl font-extrabold text-white tracking-tight relative z-10">
          Scan QRIS
        </h2>
        <p className="text-[11px] font-bold text-emerald-300/70 tracking-widest uppercase mt-1 relative z-10">
          ID: {paymentData.order_id}
        </p>
      </div>

      <div className="p-6 md:p-8 flex flex-col items-center">
        {/* Timer */}
        <div className="mb-6 text-center bg-[#F7F5EF] w-full py-3 rounded-2xl border border-emerald-900/5">
          <p className="text-[10px] text-emerald-900/50 uppercase font-bold tracking-widest mb-1">
            Sisa Waktu Pembayaran
          </p>
          <p
            className={`text-2xl font-black tracking-tight ${
              isExpired ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {isExpired ? "KADALUARSA" : timeLeft || "--:--"}
          </p>
        </div>

        {/* QR Code Area */}
        <div className="bg-white p-5 border-2 border-[#F7F5EF] rounded-3xl shadow-sm mb-6 relative">
          {isExpired && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-3xl z-20">
              <span className="text-red-600 font-black px-5 py-2 border-4 border-red-600 rounded-xl transform -rotate-12 tracking-widest uppercase text-xl">
                Expired
              </span>
            </div>
          )}

          {/* Wrapper SVG agar background QR Code bersih */}
          <div className="rounded-xl overflow-hidden">
            <QRCodeSVG
              value={paymentData.payment_number}
              size={220}
              level="M"
              includeMargin={false}
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 bg-emerald-50 text-emerald-800 p-3 rounded-xl mb-6 text-xs font-medium border border-emerald-100">
          <i className="ri-information-fill text-emerald-600 mt-0.5 text-base"></i>
          <p>
            Buka aplikasi M-Banking atau e-Wallet Anda (Gopay, OVO, Dana, ShopeePay), pilih menu Scan QR, dan arahkan kamera ke kode di atas.
          </p>
        </div>

        {/* Rincian Harga */}
        <div className="w-full space-y-3 text-sm font-medium text-emerald-900/70">
          <div className="flex justify-between items-center pb-3 border-b border-dashed border-emerald-900/10">
            <span>Nominal Pembelian</span>
            <span className="font-bold text-[#0A1F1A]">
              {formatRupiah(paymentData.amount)}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-dashed border-emerald-900/10">
            <span className="text-xs">Biaya Layanan (Fee)</span>
            <span className="text-xs">{formatRupiah(paymentData.fee)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-[#0A1F1A]">Total Bayar</span>
            <span className="text-2xl font-black text-[#0A1F1A]">
              {formatRupiah(paymentData.total_payment)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Auto-Check Loader */}
      {!isExpired && (
        <div className="bg-[#F7F5EF] px-6 py-4 border-t border-emerald-900/10 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-900/60 uppercase tracking-widest">
            <i className="ri-loader-4-line animate-spin text-emerald-600 text-base"></i>
            Menunggu Pembayaran...
          </div>
        </div>
      )}
    </div>
  );
}
