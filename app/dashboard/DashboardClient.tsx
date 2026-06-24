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

  // Fungsi pembantu warna status DompetX
  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "PAID": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FAILED": return "bg-red-50 text-red-600 border-red-200";
      default: return "bg-amber-50 text-amber-600 border-amber-200";
    }
  };

  // Fungsi pembantu warna status Premify
  const getOrderBadge = (status: string) => {
    switch (status) {
      case "SUCCESS": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FAILED": return "bg-red-50 text-red-600 border-red-200";
      default: return "bg-blue-50 text-blue-600 border-blue-200";
    }
  };

  // Kalkulasi statistik sederhana
  const totalSpent = transactions
    .filter(t => t.paymentStatus === "PAID")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOrders = transactions.length;

  return (
    <div className={`${fontSans.variable} min-h-screen bg-slate-50 font-sans selection:bg-emerald-200 selection:text-emerald-900`}>
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <i className="ri-box-3-fill text-lg"></i>
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight hidden sm:block">
              PANSA<span className="text-emerald-700">STORE</span>
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-bold text-slate-500 hover:text-emerald-700 transition-colors hidden sm:block">
              Ke Etalase
            </Link>
            <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-bold transition-colors border border-red-100"
            >
              <i className="ri-logout-circle-line"></i> Keluar
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        
        {/* HEADER & PROFILE CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full filter blur-[80px] opacity-60 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-2xl font-black text-emerald-800">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Halo, {user.name}</h1>
                  <p className="text-slate-500 font-medium text-sm flex items-center gap-1.5 mt-0.5">
                    <i className="ri-mail-line text-emerald-600"></i> {user.email}
                  </p>
                </div>
              </div>

              {!user.phone && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mt-4">
                  <i className="ri-error-warning-fill text-amber-500 text-lg"></i>
                  <div>
                    <h4 className="text-sm font-bold text-amber-800">Nomor WhatsApp Belum Diatur</h4>
                    <p className="text-xs text-amber-700 mt-1 font-medium">Sistem tidak dapat melacak riwayat transaksi Anda secara otomatis. Harap perbarui nomor WhatsApp Anda jika ingin melihat riwayat pesanan.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STATS CARD */}
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-lg text-white relative overflow-hidden flex flex-col justify-center">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500 rounded-full filter blur-[60px] opacity-20 pointer-events-none"></div>
            
            <div className="mb-6">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Pembelanjaan</p>
              <h2 className="text-3xl font-black text-emerald-400 tracking-tight">
                <span className="text-lg text-emerald-500 mr-1">Rp</span>
                {totalSpent.toLocaleString('id-ID')}
              </h2>
            </div>
            
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Pesanan</p>
              <h2 className="text-2xl font-bold text-white">
                {totalOrders} <span className="text-sm font-medium text-slate-500">Transaksi</span>
              </h2>
            </div>
          </div>

        </div>

        {/* TRANSACTION HISTORY */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <i className="ri-history-line text-emerald-600"></i> Riwayat Pesanan
            </h3>
            {user.phone && (
              <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                Terhubung via: {user.phone}
              </span>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 text-4xl mx-auto mb-4">
                <i className="ri-shopping-cart-2-line"></i>
              </div>
              <h4 className="text-slate-900 font-bold text-lg mb-1">Belum ada transaksi</h4>
              <p className="text-slate-500 text-sm font-medium mb-6">Anda belum memiliki riwayat pembelian yang terhubung dengan nomor HP ini.</p>
              <Link href="/" className="inline-flex items-center gap-2 bg-emerald-800 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-700 transition-colors">
                Mulai Belanja
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice / Tanggal</th>
                    <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Detail Produk</th>
                    <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status Bayar</th>
                    <th className="p-4 md:p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pengiriman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((trx) => {
                    let productData: any = {};
                    try {
                      productData = JSON.parse(trx.productDetails || "{}");
                    } catch (e) {}

                    return (
                      <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 md:p-5">
                          <Link href={`/cek-pesanan?invoice=${trx.invoiceId}`} className="font-extrabold text-emerald-700 hover:text-emerald-800 text-sm tracking-tight block">
                            {trx.invoiceId}
                          </Link>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {new Date(trx.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="p-4 md:p-5">
                          <div className="font-bold text-slate-900 text-sm line-clamp-1">{productData.name || "Produk PansaStore"}</div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Tujuan: {productData.targetId || "-"}</div>
                        </td>
                        <td className="p-4 md:p-5 font-extrabold text-slate-900 text-sm">
                          Rp {trx.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 md:p-5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPaymentBadge(trx.paymentStatus)}`}>
                            {trx.paymentStatus === 'PENDING' ? 'Belum Lunas' : trx.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 md:p-5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getOrderBadge(trx.premifyStatus)}`}>
                            {trx.premifyStatus}
                          </span>
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