import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Riwayat Transaksi</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Kelola seluruh pesanan dan pembayaran pelanggan.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Invoice / TRX ID</th>
                <th className="px-6 py-4">Kode Produk</th>
                <th className="px-6 py-4">WhatsApp Tujuan</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Status Bayar</th>
                <th className="px-6 py-4">Status Premify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">Belum ada transaksi tercatat.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{tx.invoiceId}</td>
                    <td className="px-6 py-4 text-slate-600">{tx.productCode}</td>
                    <td className="px-6 py-4 text-slate-600">{tx.customerPhone}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">Rp {tx.amount.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${tx.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {tx.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${tx.premifyStatus === 'SUCCESS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                        {tx.premifyStatus}
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