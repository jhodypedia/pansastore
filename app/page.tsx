import prisma from "@/lib/prisma";
import StorefrontClient from "@/components/StoreFrontClient";
import { auth } from "@/auth"; // Import fungsi auth NextAuth

// Selalu ambil data terbaru dari database
export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    // 1. Cek Sesi (Session) User yang sedang aktif di awal
    const session = await auth();
    const isLoggedIn = !!session?.user;
    const userRole = session?.user?.role || null;

    // 2. Tarik Data Produk dari Database
    const products = await prisma.product.findMany({
      where: {
        stock: {
          gt: 0,
        },
      },
      orderBy: {
        name: "asc",
      },
      include: {
        variants: {
          orderBy: {
            price: "asc",
          },
        },
      },
    });

    // 3. Lempar semua data (produk + status login) ke Client Component
    return (
      <StorefrontClient 
        initialProducts={products} 
        isLoggedIn={isLoggedIn} 
        userRole={userRole} 
      />
    );
  } catch (error) {
    console.error("[PansaStore] Gagal mengambil data produk:", error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <i className="ri-error-warning-fill text-4xl text-red-400"></i>
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">
            Sistem Sedang Menyiapkan Data
          </h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
            Terjadi kendala saat memuat katalog. Mohon tunggu beberapa saat
            atau refresh halaman ini.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-black transition-all shadow-sm"
          >
            <i className="ri-refresh-line"></i> Coba Lagi
          </a>
        </div>
      </div>
    );
  }
}