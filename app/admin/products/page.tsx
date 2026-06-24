import prisma from "@/lib/prisma";
import SyncButton from "@/components/SyncButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  // 1. Ubah tipe data menjadi Promise (Syarat Next.js 15)
  searchParams: Promise<{ page?: string }>;
}) {
  // 2. Wajib di-await sebelum mengakses isinya
  const resolvedParams = await searchParams;
  
  // Konfigurasi Paginasi
  const currentPage = Number(resolvedParams?.page) || 1;
  const itemsPerPage = 20;
  const skip = (currentPage - 1) * itemsPerPage;

  // Tarik data produk dan total data secara paralel untuk performa maksimal
  const [products, totalProducts] = await Promise.all([
    prisma.product.findMany({
      skip,
      take: itemsPerPage,
      orderBy: { category: "asc" },
    }),
    prisma.product.count(),
  ]);

  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startItem = totalProducts === 0 ? 0 : skip + 1;
  const endItem = Math.min(skip + itemsPerPage, totalProducts);

  return (
    <div className="space-y-6 w-full animate-fade-up">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Katalog Produk</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Daftar produk digital dari Premify beserta harga jual.</p>
        </div>
        <div className="w-full sm:w-auto">
          <SyncButton label="Tarik Data Terbaru" icon="ri-download-cloud-2-line" />
        </div>
      </div>

      {/* STRUKTUR TABEL PREMIUM & RESPONSIF */}
      <div className="flex flex-col bg-white border border-slate-200 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.01)] overflow-hidden">
        <div className="overflow-x-auto rounded-t-3xl">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50/70 border-b border-slate-200/60">
                  <tr>
                    <th className="px-6 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                    <th className="px-6 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                    <th className="px-6 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Harga Modal</th>
                    <th className="px-6 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Markup</th>
                    <th className="px-6 py-4.5 text-[11px] font-black text-[hsl(var(--primary))] uppercase tracking-widest">Harga Jual</th>
                    <th className="px-6 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                          <i className="ri-inbox-archive-line text-2xl text-slate-300"></i>
                        </div>
                        <p className="font-bold text-slate-700">Katalog Kosong</p>
                        <p className="text-xs text-slate-400 mt-1">Silakan tekan tombol <b>Tarik Data Terbaru</b> untuk menyinkronkan API.</p>
                      </td>
                    </tr>
                  ) : (
                    products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                        
                        <td className="px-6 py-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <i className="ri-gamepad-line text-xl text-slate-300"></i>
                            )}
                          </div>
                          <div className="max-w-[200px] sm:max-w-xs">
                            <div className="font-bold text-slate-900 truncate" title={prod.name}>{prod.name}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">SKU: {prod.id}</div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg border border-slate-200/60">
                            {prod.category || "Umum"}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-slate-500 font-semibold">
                          Rp {prod.basePrice.toLocaleString('id-ID')}
                        </td>
                        
                        <td className="px-6 py-4 text-emerald-600 font-bold">
                          + Rp {prod.markupValue.toLocaleString('id-ID')}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="font-black text-[hsl(var(--primary))] bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 w-max">
                            Rp {prod.sellPrice.toLocaleString('id-ID')}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg border flex items-center justify-center w-max mx-auto gap-1.5 ${
                            prod.stock > 0 
                              ? 'bg-emerald-50 text-[hsl(var(--primary))] border-emerald-100' 
                              : 'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prod.stock > 0 ? 'bg-[hsl(var(--primary))]' : 'bg-red-500'}`}></span>
                            {prod.stock > 0 ? 'Tersedia' : 'Habis'}
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

        {/* ========================================================= */}
        {/* PAGINATION CONTROLS                                       */}
        {/* ========================================================= */}
        {totalPages > 1 && (
          <div className="px-6 py-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-3xl">
            <div className="text-sm font-semibold text-slate-500">
              Menampilkan <span className="text-slate-900 font-black">{startItem}</span> - <span className="text-slate-900 font-black">{endItem}</span> dari <span className="text-[hsl(var(--primary))] font-black">{totalProducts}</span> produk
            </div>
            
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link 
                  href={`/admin/products?page=${currentPage - 1}`}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-[hsl(var(--primary))] hover:text-white hover:border-[hsl(var(--primary))] transition-all active:scale-95 shadow-sm"
                >
                  <i className="ri-arrow-left-s-line text-xl"></i>
                </Link>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 cursor-not-allowed">
                  <i className="ri-arrow-left-s-line text-xl"></i>
                </div>
              )}

              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 min-w-[4rem] text-center">
                {currentPage} / {totalPages}
              </div>

              {currentPage < totalPages ? (
                <Link 
                  href={`/admin/products?page=${currentPage + 1}`}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-[hsl(var(--primary))] hover:text-white hover:border-[hsl(var(--primary))] transition-all active:scale-95 shadow-sm"
                >
                  <i className="ri-arrow-right-s-line text-xl"></i>
                </Link>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 cursor-not-allowed">
                  <i className="ri-arrow-right-s-line text-xl"></i>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}