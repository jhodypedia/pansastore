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
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
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

function getPaymentStatusColor(status: string) {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "PENDING":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getOrderStatusColor(status: string) {
  switch (status) {
    case "SUCCESS":
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
    case "CANCELLED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "PROCESSING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "PENDING":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getPaymentStatusIcon(status: string) {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return "ri-checkbox-circle-line";
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      return "ri-close-circle-line";
    case "PENDING":
    default:
      return "ri-time-line";
  }
}

function getOrderStatusIcon(status: string) {
  switch (status) {
    case "SUCCESS":
    case "COMPLETED":
      return "ri-check-double-line";
    case "FAILED":
    case "CANCELLED":
      return "ri-error-warning-line";
    case "PROCESSING":
      return "ri-loader-4-line";
    case "PENDING":
    default:
      return "ri-hourglass-line";
  }
}

function buildTimeline(paymentStatus: string, orderStatus: string) {
  const paid =
    paymentStatus === "PAID" || paymentStatus === "COMPLETED";
  const expired =
    paymentStatus === "FAILED" ||
    paymentStatus === "CANCELLED" ||
    paymentStatus === "EXPIRED";
  const processing = orderStatus === "PROCESSING";
  const done = orderStatus === "SUCCESS" || orderStatus === "COMPLETED";
  const failed = orderStatus === "FAILED" || orderStatus === "CANCELLED";

  return [
    {
      title: "Invoice dibuat",
      active: true,
      done: true,
      desc: "Pesanan berhasil tercatat di sistem.",
    },
    {
      title: "Menunggu pembayaran",
      active: !paid && !expired,
      done: paid,
      desc: expired
        ? "Invoice tidak dapat diproses karena pembayaran tidak selesai tepat waktu."
        : "Silakan selesaikan pembayaran agar pesanan diproses otomatis.",
    },
    {
      title: "Pesanan diproses",
      active: paid && processing,
      done: done,
      desc: failed
        ? "Pesanan mengalami kendala saat diproses."
        : "Sistem sedang meneruskan pesanan ke provider.",
    },
    {
      title: "Pesanan selesai",
      active: done,
      done: done,
      desc: done
        ? "Pesanan telah berhasil diselesaikan."
        : "Produk akan dikirim setelah proses selesai.",
    },
  ];
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

  const customerPhone =
    String(transactionData?.customerPhone || productDetails?.customerPhone || "").trim() || "-";

  const isPending = transactionData?.paymentStatus === "PENDING";
  const isExpired =
    transactionData?.paymentStatus === "EXPIRED" ||
    transactionData?.paymentStatus === "FAILED" ||
    transactionData?.paymentStatus === "CANCELLED";
  const isPaid =
    transactionData?.paymentStatus === "PAID" ||
    transactionData?.paymentStatus === "COMPLETED";

  const timeline = buildTimeline(
    String(transactionData?.paymentStatus || "PENDING"),
    String(transactionData?.premifyStatus || "PENDING")
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f6f2] font-sans text-slate-900 selection:bg-emerald-200 selection:text-emerald-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f7f6f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-800"
          >
            <i className="ri-arrow-left-line text-base" />
            <span className="hidden sm:inline">Kembali ke Beranda</span>
            <span className="sm:hidden">Kembali</span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-800">
            <i className="ri-radar-line text-sm" />
            Cek Pesanan
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <section className="mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
              Tracking Invoice
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Lacak status pesanan Anda
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500 md:text-base">
            Masukkan nomor invoice untuk melihat status pembayaran, proses pesanan,
            dan detail transaksi terbaru secara lebih jelas.
          </p>
        </section>

        <form
          onSubmit={handleSearch}
          className="mb-8 rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400">
                <i className="ri-file-list-3-line text-xl" />
              </div>

              <input
                type="text"
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value.toUpperCase())}
                placeholder="Contoh: INV-PS-260623-A1B2"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-4 text-sm font-bold uppercase text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100 md:text-base"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !invoiceInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-lg" />
                  Mencari...
                </>
              ) : (
                <>
                  <i className="ri-search-line text-lg" />
                  Cari Invoice
                </>
              )}
            </button>
          </div>
        </form>

        {transactionData ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            <section className="space-y-6 lg:col-span-8">
              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="h-1 bg-gradient-to-r from-emerald-700 via-[#c8a24d] to-emerald-700" />

                <div className="p-6 md:p-8">
                  <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Nomor Invoice
                      </div>
                      <h2 className="mt-2 break-all text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                        {transactionData.invoiceId}
                      </h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        Dibuat pada {formatDateTime(transactionData.createdAt)} WIB
                      </p>
                    </div>

                    {transactionData.paymentExpiredAt ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Batas Pembayaran
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-800">
                          {formatDateTime(transactionData.paymentExpiredAt)} WIB
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Status Pembayaran
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${getPaymentStatusColor(
                          transactionData.paymentStatus
                        )}`}
                      >
                        <i className={getPaymentStatusIcon(transactionData.paymentStatus)} />
                        {getPaymentStatusLabel(transactionData.paymentStatus)}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Status Pesanan
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${getOrderStatusColor(
                          transactionData.premifyStatus
                        )}`}
                      >
                        <i
                          className={`${getOrderStatusIcon(transactionData.premifyStatus)} ${
                            transactionData.premifyStatus === "PROCESSING"
                              ? "animate-spin"
                              : ""
                          }`}
                        />
                        {getOrderStatusLabel(transactionData.premifyStatus)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] md:p-8">
                <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                    <i className="ri-file-text-line" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Detail pesanan</h3>
                    <p className="text-sm font-medium text-white/60">
                      Informasi produk dan tujuan pengiriman.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                      Nama Produk
                    </div>
                    <div className="mt-2 text-base font-black leading-7 text-white">
                      {productName}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                      ID Tujuan / Player ID
                    </div>
                    <div className="mt-2 break-all text-base font-black text-emerald-300">
                      {targetId}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                      Total Pembayaran
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-white">
                      {formatRupiah(transactionData.amount)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                      Nomor WhatsApp
                    </div>
                    <div className="mt-2 break-all text-base font-bold text-white/90">
                      {customerPhone}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                      Order ID Vendor
                    </div>
                    <div className="mt-2 break-all text-sm font-bold text-white/75">
                      {transactionData.premifyOrderId || "Menunggu proses penyelesaian..."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)] md:p-8">
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <i className="ri-route-line" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      Progress pesanan
                    </h3>
                    <p className="text-sm font-medium text-slate-500">
                      Tahapan pembayaran hingga penyelesaian pesanan.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {timeline.map((item, index) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${
                            item.done
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : item.active
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-50 text-slate-400"
                          }`}
                        >
                          {item.done ? <i className="ri-check-line" /> : index + 1}
                        </div>
                        {index < timeline.length - 1 ? (
                          <div className="mt-2 h-full w-px bg-slate-200" />
                        ) : null}
                      </div>

                      <div className="pb-5">
                        <div className="text-sm font-black text-slate-900">
                          {item.title}
                        </div>
                        <div className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-500">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-6 lg:col-span-4">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                    <i className="ri-information-2-line" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      Ringkasan
                    </h3>
                    <p className="text-sm font-medium text-slate-500">
                      Status terbaru invoice Anda.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {isPending ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-800">
                      <div className="mb-1 font-black">Menunggu pembayaran</div>
                      Link QRIS pembayaran telah dikirim ke WhatsApp Anda. Selesaikan pembayaran sebelum invoice kedaluwarsa.
                    </div>
                  ) : null}

                  {isExpired ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-800">
                      <div className="mb-1 font-black">Invoice kedaluwarsa</div>
                      Invoice ini sudah tidak dapat digunakan. Silakan lakukan checkout ulang untuk membuat pembayaran baru.
                    </div>
                  ) : null}

                  {isPaid ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                      <div className="mb-1 font-black">Pembayaran diterima</div>
                      Pembayaran Anda sudah masuk dan pesanan sedang atau telah diproses otomatis oleh sistem.
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                  >
                    <i className="ri-store-2-line" />
                    Belanja Lagi
                  </Link>

                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
                  >
                    <i className="ri-refresh-line" />
                    Refresh Status
                  </button>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                <div className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Tips
                </div>

                <div className="space-y-3 text-sm font-medium leading-6 text-slate-600">
                  <p>
                    Gunakan nomor invoice yang sama seperti yang dikirim melalui halaman checkout atau WhatsApp.
                  </p>
                  <p>
                    Untuk status pending, tunggu beberapa saat setelah pembayaran agar sistem selesai melakukan sinkronisasi.
                  </p>
                  <p>
                    Jika pesanan belum masuk setelah pembayaran berhasil, simpan invoice ini sebagai referensi pengecekan.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        ) : initialInvoice ? (
          <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-14 text-center shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-4xl text-slate-400">
              <i className="ri-file-search-line" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">
              Invoice tidak ditemukan
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm font-medium leading-7 text-slate-500">
              Pastikan nomor invoice yang Anda masukkan sudah benar, lalu coba lagi menggunakan format invoice yang sama.
            </p>
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-700">
              <i className="ri-bill-line" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">
              Masukkan invoice terlebih dahulu
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm font-medium leading-7 text-slate-500">
              Anda bisa melacak pembayaran dan status pengiriman pesanan dengan nomor invoice yang valid.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
