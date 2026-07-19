"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CekPesananClientProps {
  initialInvoice: string;
  transactionData: any | null;
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatRupiah(value: number | string) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("id-ID").format(amount);
}

function normalizeInvoice(value: string) {
  return String(value || "").trim().toUpperCase();
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Belum Lunas";
    case "PAID":
      return "Sudah Dibayar";
    case "COMPLETED":
      return "Selesai";
    case "FAILED":
      return "Gagal";
    case "CANCELLED":
      return "Dibatalkan";
    case "EXPIRED":
      return "Kedaluwarsa";
    default:
      return status || "PENDING";
  }
}

function getOrderStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Menunggu";
    case "PROCESSING":
      return "Diproses";
    case "SUCCESS":
      return "Berhasil";
    case "COMPLETED":
      return "Selesai";
    case "FAILED":
      return "Gagal";
    case "CANCELLED":
      return "Dibatalkan";
    default:
      return status || "PENDING";
  }
}

export default function CekPesananClient({
  initialInvoice,
  transactionData,
}: CekPesananClientProps) {
  const router = useRouter();
  const [invoiceInput, setInvoiceInput] = useState(initialInvoice || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const invoice = normalizeInvoice(invoiceInput);
    if (!invoice) return;

    setIsLoading(true);
    router.push(`/cek-pesanan?invoice=${encodeURIComponent(invoice)}`);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FAILED":
      case "CANCELLED":
      case "EXPIRED":
        return "bg-red-50 text-red-600 border-red-200";
      case "PENDING":
      default:
        return "bg-amber-50 text-amber-600 border-amber-200";
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FAILED":
      case "CANCELLED":
        return "bg-red-50 text-red-600 border-red-200";
      case "PROCESSING":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "PENDING":
      default:
        return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  const productDetails = useMemo(() => {
    if (!transactionData?.productDetails) return {};

    try {
      return typeof transactionData.productDetails === "string"
        ? JSON.parse(transactionData.productDetails)
        : transactionData.productDetails;
    } catch {
      return {};
    }
  }, [transactionData]);

  const productName =
    [
      String(productDetails?.productName || "").trim(),
      String(productDetails?.variantName || "").trim(),
    ]
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .join(" - ") ||
    String(productDetails?.name || "").trim() ||
    "Produk Digital";

  const targetId =
    String(productDetails?.targetId || "").trim() ||
    String(productDetails?.target || "").trim() ||
    "-";

  const isPending = transactionData?.paymentStatus === "PENDING";
  const isExpired = transactionData?.paymentStatus === "EXPIRED";
  const isPaid =
    transactionData?.paymentStatus === "PAID" ||
    transactionData?.paymentStatus === "COMPLETED";

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-emerald-200 selection:text-emerald-900 pb-20 overflow-x-hidden">
      <nav className="bg-white border-b border-slate-200/60 py-4 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-emerald-800 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <i className="ri-arrow-left-line text-lg"></i>
            </div>
            <span className="font-black text-slate-900 ml-1">
              Kembali ke Beranda
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 md:pt-16">
        <div className="text-center mb-10 animate-fade-up">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 text-3xl mx-auto mb-4">
            <i className="ri-search-eye-line"></i>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
            Lacak Pesanan
          </h1>
          <p className="text-slate-500 font-medium">
            Masukkan nomor Invoice Anda untuk melihat status pembayaran dan
            pengiriman produk secara real-time.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="relative group mb-12 animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <i className="ri-file-list-3-line text-slate-400 text-xl group-focus-within:text-emerald-800 transition-colors"></i>
          </div>

          <input
            type="text"
            value={invoiceInput}
            onChange={(e) => setInvoiceInput(e.target.value.toUpperCase())}
            placeholder="Contoh: INV-PS-260623-A1B2"
            className="w-full pl-14 pr-32 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-800 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.03)] font-bold text-sm md:text-base uppercase"
          />

          <div className="absolute inset-y-2 right-2">
            <button
              type="submit"
              disabled={isLoading || !invoiceInput.trim()}
              className="h-full bg-emerald-800 text-white px-6 rounded-xl font-bold text-sm hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-70 flex items-center gap-2"
            >
              {isLoading ? (
                <i className="ri-loader-4-line animate-spin text-lg"></i>
              ) : (
                "Cari"
              )}
            </button>
          </div>
        </form>

        {transactionData ? (
          <div className="bg-white rounded-[32px] p-6 md:p-10 border border-slate-200/80 shadow-[0_20px_40px_rgba(0,0,0,0.04)] animate-fade-up relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full filter blur-[80px] opacity-60 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 border-b border-slate-100 pb-6 gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Nomor Invoice
                </p>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 break-all">
                  {transactionData.invoiceId}
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {formatDateTime(transactionData.createdAt)} WIB
                </p>
              </div>

              {transactionData.paymentExpiredAt && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Batas Pembayaran
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {formatDateTime(transactionData.paymentExpiredAt)} WIB
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 relative z-10">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Status Pembayaran
                </p>
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${getPaymentStatusColor(
                    transactionData.paymentStatus
                  )}`}
                >
                  {getPaymentStatusLabel(transactionData.paymentStatus)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Status Pengiriman
                </p>
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${getOrderStatusColor(
                    transactionData.premifyStatus
                  )}`}
                >
                  {getOrderStatusLabel(transactionData.premifyStatus)}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500 rounded-full filter blur-[60px] opacity-20 pointer-events-none"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Nama Produk
                  </p>
                  <p className="font-bold text-lg break-words">{productName}</p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    ID Tujuan / Player ID
                  </p>
                  <p className="font-bold text-emerald-400 text-lg break-all">
                    {targetId}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Total Pembayaran
                  </p>
                  <p className="font-black text-2xl text-white">
                    Rp {formatRupiah(transactionData.amount)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Order ID Vendor
                  </p>
                  <p className="font-bold text-slate-300 text-sm break-all select-all">
                    {transactionData.premifyOrderId ||
                      "Menunggu proses penyelesaian..."}
                  </p>
                </div>
              </div>
            </div>

            {isPending && (
              <div className="mt-8 text-center relative z-10">
                <p className="text-sm text-slate-500 mb-4 font-medium">
                  Pembayaran belum diselesaikan. Detail pesanan telah kami
                  amankan.
                </p>
                <p className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl text-xs font-bold border border-amber-200">
                  <i className="ri-whatsapp-line text-lg"></i>
                  Link QRIS pembayaran telah dikirim ke WhatsApp Anda.
                </p>
              </div>
            )}

            {isExpired && (
              <div className="mt-8 text-center relative z-10">
                <p className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-5 py-2.5 rounded-xl text-xs font-bold border border-red-200">
                  <i className="ri-time-line text-lg"></i>
                  Invoice ini sudah kedaluwarsa. Silakan lakukan checkout ulang.
                </p>
              </div>
            )}

            {isPaid && (
              <div className="mt-8 text-center relative z-10">
                <p className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-xl text-xs font-bold border border-emerald-200">
                  <i className="ri-checkbox-circle-line text-lg"></i>
                  Pembayaran sudah diterima dan pesanan sedang / telah diproses.
                </p>
              </div>
            )}
          </div>
        ) : initialInvoice ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-[32px] shadow-sm animate-fade-up">
            <i className="ri-file-search-line text-6xl text-slate-300 mb-4 block animate-bounce"></i>
            <h3 className="text-xl font-black text-slate-900">
              Invoice Tidak Ditemukan
            </h3>
            <p className="text-slate-500 mt-2 font-medium">
              Pastikan nomor invoice yang Anda masukkan sudah benar.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
