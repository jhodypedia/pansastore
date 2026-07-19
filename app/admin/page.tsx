import Link from "next/link";
import { getDashboardStats } from "@/actions/dashboard";
import WaConnectionClient from "./WaConnectionClient";

export const dynamic = "force-dynamic";

function getPaymentStatusClass(status: string) {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case "PENDING":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "EXPIRED":
    case "FAILED":
    case "CANCELLED":
      return "bg-red-100 text-red-800 border border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "PAID":
      return "PAID";
    case "COMPLETED":
      return "COMPLETED";
    case "PENDING":
      return "PENDING";
    case "EXPIRED":
      return "EXPIRED";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return status || "UNKNOWN";
  }
}

function formatDateTime(value: string | Date) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sistem Operasional
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Pantau performa PansaGroup secara real-time dari database dan status
            koneksi WhatsApp.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            href="/admin/wa-settings"
            className="bg-white text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold border border-slate-200 hover:border-emerald-200 hover:text-[hsl(var(--primary))] hover:bg-emerald-50 transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <i className="ri-whatsapp-fill"></i>
            WA Settings
          </Link>

          <button className="bg-[hsl(var(--primary))] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-800 transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center gap-2">
            <i className="ri-refresh-line"></i>
            Sinkronisasi API
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 border border-slate-200 rounded-xl flex flex-col hover:border-[hsl(var(--primary))] transition-colors">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[hsl(var(--primary))]">
              <i className="ri-wallet-3-fill text-xl"></i>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">
              Pendapatan Bulan Ini
            </span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-auto">
            Rp {Number(stats.revenue || 0).toLocaleString("id-ID")}
          </h3>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl flex flex-col hover:border-[hsl(var(--primary))] transition-colors">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[hsl(var(--primary))]">
              <i className="ri-shopping-cart-2-fill text-xl"></i>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">
              Transaksi Sukses
            </span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-auto">
            {Number(stats.monthlyTransactions || 0).toLocaleString("id-ID")}{" "}
            <span className="text-sm font-medium text-slate-400">pesanan</span>
          </h3>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl flex flex-col hover:border-[hsl(var(--primary))] transition-colors">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <i className="ri-timer-flash-fill text-xl"></i>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">
              Transaksi Terbaru
            </span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-auto">
            {Number(stats.latestTransactions?.length || 0).toLocaleString("id-ID")}
            <span className="text-sm font-medium text-slate-400"> log</span>
          </h3>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl flex flex-col justify-between hover:border-[hsl(var(--primary))] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[hsl(var(--primary))]">
                <i className="ri-whatsapp-fill text-xl"></i>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">
                Bot Status
              </span>
            </div>

            <Link
              href="/admin/wa-settings"
              className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline"
            >
              Kelola
            </Link>
          </div>
          <WaConnectionClient />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-extrabold text-slate-900 tracking-tight">
              Log Transaksi Terakhir
            </h3>
            <span className="text-xs font-bold text-[hsl(var(--primary))] bg-emerald-50 px-3 py-1 rounded-full">
              {stats.latestTransactions.length} Terbaru
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 bg-white border-b border-slate-200 uppercase tracking-widest font-bold">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Invoice</th>
                  <th className="px-6 py-4">Kode Produk</th>
                  <th className="px-6 py-4">No. Pelanggan</th>
                  <th className="px-6 py-4">Nominal</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {stats.latestTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-slate-400"
                    >
                      <i className="ri-inbox-archive-line text-4xl mb-2 block"></i>
                      Belum ada data transaksi di database.
                    </td>
                  </tr>
                ) : (
                  stats.latestTransactions.map((tx: any) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-500">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {tx.invoiceId}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {tx.productCode}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {tx.customerPhone}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        Rp {Number(tx.amount || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-md ${getPaymentStatusClass(
                            tx.paymentStatus
                          )}`}
                        >
                          {getPaymentStatusLabel(tx.paymentStatus)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-extrabold text-slate-900 tracking-tight">
              Shortcut Operasional
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Akses cepat ke modul yang paling sering dipakai admin.
            </p>
          </div>

          <div className="p-4 space-y-3">
            <Link
              href="/admin/transactions"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/60 transition-colors group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                <i className="ri-exchange-dollar-fill text-xl"></i>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-[hsl(var(--primary))]">
                  Kelola Transaksi
                </div>
                <div className="text-xs text-slate-500">
                  Tinjau pembayaran dan status pesanan terbaru.
                </div>
              </div>
            </Link>

            <Link
              href="/admin/products"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/60 transition-colors group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                <i className="ri-box-3-fill text-xl"></i>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-[hsl(var(--primary))]">
                  Kelola Katalog
                </div>
                <div className="text-xs text-slate-500">
                  Perbarui produk digital dan pengaturan item.
                </div>
              </div>
            </Link>

            <Link
              href="/admin/wa-settings"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/60 transition-colors group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                <i className="ri-whatsapp-fill text-xl"></i>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-[hsl(var(--primary))]">
                  WA Settings
                </div>
                <div className="text-xs text-slate-500">
                  Hubungkan bot via QR code atau pairing code.
                </div>
              </div>
            </Link>

            <Link
              href="/admin/settings"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/60 transition-colors group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                <i className="ri-settings-4-fill text-xl"></i>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-[hsl(var(--primary))]">
                  Pengaturan API
                </div>
                <div className="text-xs text-slate-500">
                  Kelola kredensial sistem dan integrasi utama.
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
