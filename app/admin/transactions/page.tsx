import prisma from "@/lib/prisma";
import SyncPremifyButton from "./SyncPremifyButton";

export const dynamic = "force-dynamic";

function getPaymentBadge(status: string) {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800";
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      return "bg-rose-100 text-rose-800";
    case "PENDING":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getPremifyBadge(status: string) {
  switch (status) {
    case "SUCCESS":
    case "COMPLETED":
      return "bg-blue-100 text-blue-800";
    case "FAILED":
    case "CANCELLED":
      return "bg-rose-100 text-rose-800";
    case "PROCESSING":
      return "bg-sky-100 text-sky-800";
    case "PENDING":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-fade-up space-y-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Riwayat Transaksi
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Kelola seluruh pesanan, pembayaran pelanggan, dan sinkronisasi manual Premify.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Kode Produk</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Status Bayar</th>
                <th className="px-6 py-4">Status Premify</th>
                <th className="px-6 py-4">Order ID Vendor</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-400">
                    Belum ada transaksi tercatat.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(tx.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div>{tx.invoiceId}</div>
                      <div className="text-xs font-medium text-slate-400">
                        ID #{tx.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{tx.productCode}</td>
                    <td className="px-6 py-4 text-slate-600">{tx.customerPhone}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">
                      Rp {tx.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-bold ${getPaymentBadge(
                          tx.paymentStatus
                        )}`}
                      >
                        {tx.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-bold ${getPremifyBadge(
                          tx.premifyStatus
                        )}`}
                      >
                        {tx.premifyStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <span className="break-all">
                        {tx.premifyOrderId || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {tx.premifyOrderId ? (
                        <SyncPremifyButton transactionId={tx.id} />
                      ) : (
                        <span className="text-xs text-slate-400">Belum ada order ID</span>
                      )}
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
