import { getDashboardStats } from "@/actions/dashboard";
import WaConnectionClient from "./WaConnectionClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-up">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sistem Operasional</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Pantau performa PansaGroup secara real-time dari database.</p>
        </div>
        <button 
          className="bg-[hsl(var(--primary))] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-800 transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <i className="ri-refresh-line"></i> Sinkronisasi API
        </button>
      </div>

      {/* Statistik Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 border border-slate-200 rounded-xl flex flex-col hover:border-[hsl(var(--primary))] transition-colors">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[hsl(var(--primary))]">
              <i className="ri-wallet-3-fill text-xl"></i>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Pendapatan Bulan Ini</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-auto">
            Rp {stats.revenue.toLocaleString('id-ID')}
          </h3>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl flex flex-col hover:border-[hsl(var(--primary))] transition-colors">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[hsl(var(--primary))]">
              <i className="ri-shopping-cart-2-fill text-xl"></i>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Transaksi Sukses</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-auto">
            {stats.monthlyTransactions} <span className="text-sm font-medium text-slate-400">pesanan</span>
          </h3>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl flex flex-col justify-between hover:border-[hsl(var(--primary))] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[hsl(var(--primary))]">
                <i className="ri-whatsapp-fill text-xl"></i>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Bot Status</span>
            </div>
          </div>
          <WaConnectionClient />
        </div>
      </div>

      {/* Tabel Transaksi Real-Time */}
      <div className="bg-white border border-slate-200 rounded-xl mt-8 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-extrabold text-slate-900 tracking-tight">Log Transaksi Terakhir</h3>
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
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    <i className="ri-inbox-archive-line text-4xl mb-2 block"></i>
                    Belum ada data transaksi di database.
                  </td>
                </tr>
              ) : (
                stats.latestTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{tx.invoiceId}</td>
                    <td className="px-6 py-4 text-slate-600">{tx.productCode}</td>
                    <td className="px-6 py-4 text-slate-600">{tx.customerPhone}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">
                      Rp {tx.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 text-xs font-bold rounded-md ${
                        tx.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        tx.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {tx.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}