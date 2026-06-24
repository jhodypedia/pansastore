import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; variant?: string }>;
}) {
  const resolvedParams = await searchParams;
  const productId = resolvedParams.product;
  const variantId = resolvedParams.variant;

  if (!productId) {
    redirect("/");
  }

  // Tarik data produk dari database
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center bg-white p-8 md:p-12 rounded-[32px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-slate-200 max-w-md mx-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100">
            <i className="ri-error-warning-fill animate-pulse"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Produk Tidak Ditemukan</h1>
          <p className="text-slate-500 mt-2 font-medium text-sm leading-relaxed">
            Maaf, katalog produk digital ini tidak tersedia atau telah diarsip oleh sistem PansaStore.
          </p>
          <a href="/" className="mt-8 inline-flex items-center gap-2 bg-emerald-800 text-white px-6 py-3 rounded-full font-bold hover:bg-emerald-700 transition-all text-sm shadow-sm active:scale-95">
            <i className="ri-arrow-left-line"></i> Kembali ke Katalog
          </a>
        </div>
      </div>
    );
  }

  const variantName = variantId ? `Varian: ${variantId}` : "Paket Reguler (Instan)";
  const checkoutPrice = product.sellPrice; 

  return (
    <CheckoutClient 
      product={product} 
      variantId={variantId} 
      variantName={variantName}
      price={checkoutPrice} 
    />
  );
}