"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { toast } from "react-hot-toast";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

interface DashboardClientProps {
  user: any;
  transactions: any[];
}

export default function DashboardClient({ user, transactions }: DashboardClientProps) {
  const handleLogout = async () => {
    const toastId = toast.loading("Keluar dari sistem...");
    await signOut({ callbackUrl: "/login" });
    toast.success("Berhasil keluar", { id: toastId });
  };

  // Fungsi pembantu warna status Pembayaran (Pakasir)
  const getPaymentBadge = (status: string) => {
    const upperStatus = status.toUpperCase();
    if (upperStatus === "COMPLETED" || upperStatus === "PAID") {
      return {
        label: "LUNAS",
        style: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "ri-check-double-line",
      };
    }
    if (upperStatus === "FAILED" || upperStatus === "EXPIRED") {
      return {
        label: "GAGAL",
        style: "bg-red-50 text-red-600 border-red-200",
        icon: "ri-close-circle-line",
      };
    }
    return {
      label: "MENUNGGU",
      style: "bg-amber-50 text-amber-700 border-amber-200",
      icon: "ri-time-line",
    };
  };

  // Fungsi pembantu warna status Pengiriman (Premify / Baileys)
  const getDeliveryBadge = (status: string) => {
    const upperStatus = status.toUpperCase();
    if (upperStatus === "SUCCESS" || upperStatus === "COMPLETED") {
      return {
        label: "TERKIRIM",
        style: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (upperStatus === "FAILED") {
      return {
        label: "GAGAL KIRIM",
        style: "bg-red-50 text-red-600 border-red-200",
      };
    }
    if (upperStatus === "PROCESSING") {
      return {
        label: "DIPROSES",
        style: "bg-blue-50 text-blue-700 border-blue-200",
      };
    }
    return {
      label: "PENDING",
      style: "bg-slate-50 text-slate-500 border-slate-200",
    };
  };

  // Kalkulasi statistik
  const validCompletedStatus = ["COMPLETED", "PAID"];
  const totalSpent = transactions
    .filter((t) => validCompletedStatus.includes(t.paymentStatus.toUpperCase()))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOrders = transactions.length;

  return (
    <div
      className={`${fontSans.variable} min-h-screen bg-[#F7F5EF] font-sans selection:bg-emerald-200 selection:text-emerald-900 pb-20`}
    >
      {/* NAVIGATION - Premium Clean */}
      <nav className="bg-[#F7F5EF]/85 backdrop-blur-xl border-b border-emerald-900/10 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-full bg-[#0A1F1A] flex items-center justify-center text-emerald-300 shadow-sm group-hover:-translate-x-0.5 transition-transform">
              <i className="ri-arrow-left-line text-lg"></i>
            </span>
            <span className="font-extrabold text-[#0A1F1A] tracking-tight hidden sm:block">
              PANSA<span className="text-emerald-600">STORE</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[13px] font-bold text-emerald-900/50 hover:text-[#0A1F1A] transition-colors hidden sm:block"
            >
              Belanja Lagi
            </Link>
            <div className="w-px h-5 bg-emerald-900/10 hidden sm:block"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-bold transition-all border border-red-100 active:scale-95"
            >
              <i className="ri-logout-circle-line"></i> Keluar
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 md:pt-12">
        <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700/80 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Area Pengguna
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#0A1F1A] tracking-tight mb-8">
          Dashboard Saya
        </h1>

        {/* HEADER & PROFILE CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-10">
          {/* USER INFO */}
          <div className="lg:col-span-2 bg-white rounded-[28px] p-6 md:p-8 border border-emerald-900/10 shadow-[0_4px_24px_rgba(10,31,26,0.04)] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-600/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0A1F1A] to-emerald-800 flex items-center justify-center text-2xl font-black text-white shadow-md shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-[#0A1F1A] tracking-tight">
                    {user.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5">
                    <p className="text-emerald-900/60 font-semibold text-sm flex items-center gap-1.5">
                      <i className="ri-mail-fill text-emerald-600/50"></i> {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-emerald-900/60 font-semibold text-sm flex items-center gap-1.5">
                        <i className="ri-whatsapp-fill text-emerald-600/50"></i> {user.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {!user.phone && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 mt-4">
                  <i className="ri-error-warning-fill text-amber-500 text-xl mt-0.5 shrink-0"></i>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Nomor WhatsApp Belum Terhubung
                    </h4>
                    <p className="text-xs text-amber-800/80 mt-1 font-medium leading-relaxed">
                      Riwayat transaksi otomatis dilacak berdasarkan nomor WhatsApp Anda saat melakukan checkout.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STATS CARD (DARK THEME) */}
          <div className="bg-[#0A1F1A] rounded-[28px] p-6 md:p-8 shadow-[0_20px_40px_-15px_rgba(10,31,26,0.3)] text-white relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-[#C8A24D] to-emerald-600" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-600/20 rounded-full blur-[50px] pointer-events-none"></div>

            <div className="mb-6 relative z-10">
              <p className="text-emerald-300/50 text-[10px] font-bold uppercase tracking-widest mb-1">
                Total Pembelanjaan
              </p>
              <h2 className="text-3xl font-black text-emerald-400 tracking-tight flex items-baseline gap-1">
                <span className="text-base text-emerald-400/60 font-bold">Rp</span>
                {totalSpent.toLocaleString("id-ID")}
              </h2>
            </div>

            <div className="relative z-10">
              <p className="text-emerald-300/50 text-[10px] font-bold uppercase tracking-widest mb-1">
                Pesanan Berhasil
              </p>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {totalOrders}{" "}
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">
                  Transaksi
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* TRANSACTION HISTORY */}
        <div className="bg-white rounded-[28px] border border-emerald-900/10 shadow-[0_4px_24px_rgba(10,31,26,0.04)] overflow-hidden">
          <div className="p-6 md:p-8 border-b border-emerald-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-extrabold text-[#0A1F1A] flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i className="ri-history-line"></i>
              </div>
              Riwayat Pembelian Terakhir
            </h3>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 md:p-16 text-center">
              <div className="w-20 h-20 bg-[#F7F5EF] rounded-full flex items-center justify-center text-emerald-900/20 text-4xl mx-auto mb-5 border border-emerald-900/5">
                <i className="ri-shopping-bag-3-fill"></i>
              </div>
              <h4 className="text-[#0A1F1A] font-extrabold text-xl mb-2">
                Belum Ada Transaksi
              </h4>
              <p className="text-emerald-900/50 text-sm font-medium mb-8 max-w-sm mx-auto">
                Riwayat pesanan yang menggunakan nomor WhatsApp Anda akan otomatis muncul di sini.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-md active:scale-95"
              >
                Mulai Belanja Sekarang
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#F7F5EF]/50 border-b border-emerald-900/5">
                    <th className="p-4 md:px-8 py-4 text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest whitespace-nowrap">
                      ID Tagihan
                    </th>
                    <th className="p-4 py-4 text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest">
                      Detail Produk
                    </th>
                    <th className="p-4 py-4 text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest">
                      Total Bayar
                    </th>
                    <th className="p-4 py-4 text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/5">
                  {transactions.map((trx) => {
                    let productData: any = {};
                    try {
                      productData = JSON.parse(trx.productDetails || "{}");
                    } catch (e) {}

                    const paymentBadge = getPaymentBadge(trx.paymentStatus);
                    const deliveryBadge = getDeliveryBadge(trx.premifyStatus);

                    return (
                      <tr
                        key={trx.id}
                        className="hover:bg-[#F7F5EF]/50 transition-colors group"
                      >
                        <td className="p-4 md:px-8 py-5">
                          <Link
                            href={`/cek-pesanan?invoice=${trx.invoiceId}`}
                            className="font-extrabold text-[#0A1F1A] hover:text-emerald-600 text-sm tracking-tight flex items-center gap-1.5 transition-colors"
                          >
                            {trx.invoiceId}
                            <i className="ri-external-link-line text-[10px] text-emerald-900/30 group-hover:text-emerald-600"></i>
                          </Link>
                          <div className="text-[11px] text-emerald-900/50 font-medium mt-1 flex items-center gap-1">
                            <i className="ri-calendar-event-line"></i>
                            {new Date(trx.createdAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td className="p-4 py-5">
                          <div className="font-bold text-[#0A1F1A] text-sm line-clamp-1">
                            {productData.name || "Produk PansaStore"}
                          </div>
                          <div className="text-[11px] text-emerald-900/50 font-medium mt-1.5 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            <i className="ri-user-received-2-line text-emerald-600"></i>
                            {productData.targetId || "Tidak ada ID Tujuan"}
                          </div>
                        </td>
                        <td className="p-4 py-5 font-extrabold text-[#0A1F1A] text-sm">
                          Rp {trx.amount.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 py-5">
                          <div className="flex flex-col gap-2 items-start">
                            {/* Lencana Pembayaran */}
                            <span
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-extrabold tracking-widest border ${paymentBadge.style}`}
                            >
                              <i className={`${paymentBadge.icon}`}></i>
                              {paymentBadge.label}
                            </span>
                            
                            {/* Lencana Pengiriman Aset */}
                            {(trx.paymentStatus.toUpperCase() === "COMPLETED" || trx.paymentStatus.toUpperCase() === "PAID") && (
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest border ${deliveryBadge.style}`}
                              >
                                {deliveryBadge.label}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
