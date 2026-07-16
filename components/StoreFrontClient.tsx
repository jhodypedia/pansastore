"use client";

import { useState, useMemo, useEffect, useRef, useId } from "react";
import Link from "next/link";

interface Variant {
  id: string;
  productId?: string;
  name: string;
  price: number;
  duration: string;
  type: string;
  warranty: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  category: string | null;
  sellPrice: number;
  type: string | null;
  stock: number;
  imageUrl?: string | null;
  description?: string | null;
  variants?: Variant[];
}

interface StorefrontClientProps {
  initialProducts: Product[];
  isLoggedIn?: boolean;
  userRole?: string | null;
}

const getInitials = (name: string) => {
  const words = name.trim().split(" ").filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const PALETTE = [
  ["#0F766E", "#065F46"],
  ["#1D4ED8", "#1E40AF"],
  ["#7C3AED", "#6D28D9"],
  ["#BE185D", "#9D174D"],
  ["#B45309", "#92400E"],
  ["#0F766E", "#155E75"],
] as const;

const getGradientStyle = (name: string) => {
  const idx = (name.charCodeAt(0) || 0) % PALETTE.length;
  return {
    background: `linear-gradient(135deg, ${PALETTE[idx][0]} 0%, ${PALETTE[idx][1]} 100%)`,
  };
};

const formatPrice = (value: number) => value.toLocaleString("id-ID");

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");

const extractBaseProductName = (name: string) => {
  const cleaned = normalizeText(name);

  const base = cleaned
    .replace(/\b(\d+\s*(hari|bulan|tahun|minggu|day|days|month|months|year|years))\b/gi, "")
    .replace(
      /\b(private|sharing|lifetime|garansi|official|premium|akun|account|member|voucher)\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  return base || cleaned;
};

const prettifyBaseName = (name: string) =>
  name
    .replace(/\b\d+\s*(Hari|Bulan|Tahun|Minggu)\b/gi, "")
    .replace(
      /\b(Private|Sharing|Lifetime|Garansi|Official|Premium|Akun|Account|Member|Voucher)\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

const getProductHref = (product: Product, variant?: Variant | null) => {
  const params = new URLSearchParams();
  params.set("product", variant?.productId || product.id);
  if (variant?.id) params.set("variant", variant.id);
  return `/checkout?${params.toString()}`;
};

const getVariantFromProduct = (product: Product): Variant => {
  const firstExistingVariant = product.variants?.[0];

  return {
    id: firstExistingVariant?.id || product.id,
    productId: product.id,
    name: product.name,
    price: firstExistingVariant?.price ?? product.sellPrice,
    duration: firstExistingVariant?.duration || "-",
    type: firstExistingVariant?.type || product.type || "Digital",
    warranty: firstExistingVariant?.warranty || "-",
    stock: firstExistingVariant?.stock ?? product.stock ?? 0,
  };
};

const groupProductsByBaseName = (products: Product[]): Product[] => {
  const grouped = new Map<string, Product[]>();

  for (const product of products) {
    const key = extractBaseProductName(product.name);
    const current = grouped.get(key) || [];
    current.push(product);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([_, items]) => {
    const sortedItems = [...items].sort((a, b) => a.sellPrice - b.sellPrice);
    const primary = sortedItems[0];

    const mergedVariants = sortedItems
      .flatMap((item) => {
        if (item.variants && item.variants.length > 0) {
          return item.variants.map((variant) => ({
            ...variant,
            productId: item.id,
            name: variant.name || item.name,
            price: variant.price ?? item.sellPrice,
            type: variant.type || item.type || "Digital",
            stock: variant.stock ?? item.stock ?? 0,
            duration: variant.duration || "-",
            warranty: variant.warranty || "-",
          }));
        }

        return [getVariantFromProduct(item)];
      })
      .sort((a, b) => a.price - b.price);

    const displayName = prettifyBaseName(primary.name) || primary.name;
    const lowestPrice =
      mergedVariants.length > 0
        ? Math.min(...mergedVariants.map((variant) => variant.price))
        : primary.sellPrice;

    const totalStock = mergedVariants.reduce((sum, variant) => sum + (variant.stock || 0), 0);

    return {
      ...primary,
      name: displayName,
      sellPrice: lowestPrice,
      stock: totalStock,
      description:
        primary.description ||
        `Tersedia ${mergedVariants.length} pilihan paket untuk ${displayName}.`,
      variants: mergedVariants,
    };
  });
};

const TRUST_STATS = [
  { icon: "ri-shopping-bag-3-fill", value: "120.000+", label: "Pesanan Selesai" },
  { icon: "ri-repeat-2-fill", value: "24/7", label: "Sistem Berjalan" },
  { icon: "ri-user-heart-fill", value: "45.000+", label: "Pelanggan Aktif" },
  { icon: "ri-timer-flash-fill", value: "< 3 Detik", label: "Waktu Proses" },
] as const;

const TESTIMONIALS = [
  {
    name: "Rizky Aditya",
    avatar: "RA",
    role: "Mobile Gamer",
    rating: 5,
    text: "Top up paling cepat yang pernah saya coba. Bayar dan pesanan langsung diproses tanpa alur yang ribet.",
    color: ["#0F766E", "#065F46"],
  },
  {
    name: "Siti Nur Haliza",
    avatar: "SN",
    role: "Content Creator",
    rating: 5,
    text: "Harga konsisten rapi, sistem enak dipakai, dan cocok untuk kebutuhan langganan rutin.",
    color: ["#7C3AED", "#6D28D9"],
  },
  {
    name: "Budi Santoso",
    avatar: "BS",
    role: "Reseller Digital",
    rating: 5,
    text: "Cocok buat dijual lagi karena proses cepat, stok stabil, dan halaman produk jelas.",
    color: ["#1D4ED8", "#1E40AF"],
  },
] as const;

function TrustBar() {
  return (
    <section className="py-10 md:py-14 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {TRUST_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[26px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-5 py-5 md:px-6 md:py-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                <i className={`${stat.icon} text-emerald-700 text-xl`} />
              </div>
              <div className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] md:text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductImage({
  product,
  className,
  square = false,
}: {
  product: Product;
  className?: string;
  square?: boolean;
}) {
  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        width={square ? 600 : 800}
        height={square ? 600 : 1000}
        className={className}
      />
    );
  }

  return (
    <div
      className={`w-full h-full flex items-center justify-center text-white ${className || ""}`}
      style={getGradientStyle(product.name)}
      aria-label={product.name}
    >
      <span className="text-3xl md:text-5xl font-black tracking-tighter drop-shadow-md opacity-95">
        {getInitials(product.name)}
      </span>
    </div>
  );
}

function ProductCard({
  product,
  featured = false,
  onOpen,
}: {
  product: Product;
  featured?: boolean;
  onOpen: (product: Product) => void;
}) {
  const startingPrice = product.sellPrice;
  const variantCount = product.variants?.length ?? 0;
  const inStock = product.stock > 0;
  const previewVariant = product.variants?.find((v) => v.stock > 0) ?? product.variants?.[0] ?? null;

  return (
    <article
      className={`reveal-card group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-[0_24px_60px_rgba(5,150,105,0.10)] ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-700 via-[#C8A24D] to-emerald-700 opacity-90" />

      <div className={`grid ${featured ? "md:grid-cols-[1.05fr_0.95fr]" : "grid-cols-1"} h-full`}>
        <div className={`relative overflow-hidden ${featured ? "min-h-[320px] md:min-h-full" : "aspect-[4/3]"}`}>
          <ProductImage
            product={product}
            square
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />

          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/92 backdrop-blur-md px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm">
                {product.category || "Katalog"}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-sm ${
                  inStock
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                    : "bg-rose-50 text-rose-700 border border-rose-100"
                }`}
              >
                <i className={inStock ? "ri-checkbox-circle-fill" : "ri-close-circle-fill"} />
                {inStock ? "Tersedia" : "Habis"}
              </span>
            </div>

            {featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                Pilihan
              </span>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-4 py-3 text-white">
              <div className="text-[10px] uppercase tracking-[0.16em] font-black text-white/70 mb-1">
                Harga mulai
              </div>
              <div className="text-2xl md:text-[2rem] font-black tracking-tight">
                <span className="text-sm mr-1 text-white/70">Rp</span>
                {formatPrice(startingPrice)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                {product.name}
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700/80 mt-1.5">
                {product.type || previewVariant?.type || "Produk Digital"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2 text-right shrink-0">
              <div className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400">
                Paket
              </div>
              <div className="text-sm font-black text-slate-900">{variantCount || 1}</div>
            </div>
          </div>

          <p className="text-sm leading-7 font-medium text-slate-500 line-clamp-3 min-h-[84px]">
            {product.description ||
              "Produk digital resmi dengan pilihan paket yang rapi dan alur pembelian yang cepat."}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] font-black text-slate-400 mb-1">
                Varian
              </div>
              <div className="text-xs font-black text-slate-800">{variantCount || 1} opsi</div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] font-black text-slate-400 mb-1">
                Garansi
              </div>
              <div className="text-xs font-black text-slate-800">
                {previewVariant?.warranty || "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] font-black text-slate-400 mb-1">
                Stok
              </div>
              <div className="text-xs font-black text-slate-800">{product.stock}</div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpen(product)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-800 active:scale-[0.98]"
            >
              <i className="ri-eye-line" />
              Detail
            </button>

            <Link
              href={getProductHref(product, previewVariant)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-black text-emerald-800 transition-all duration-300 hover:bg-emerald-100"
            >
              <i className="ri-shopping-bag-3-line" />
              Beli
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductModal({
  product,
  selectedVariant,
  onSelectVariant,
  onClose,
}: {
  product: Product;
  selectedVariant: Variant | null;
  onSelectVariant: (variant: Variant) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const selectedPrice = selectedVariant?.price ?? product.sellPrice;
  const checkoutHref = getProductHref(product, selectedVariant);

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-t-[28px] sm:rounded-[34px] bg-white shadow-[0_35px_100px_rgba(15,23,42,0.35)] outline-none"
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200 sm:hidden z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] max-h-[92vh]">
          <div className="relative min-h-[280px] lg:min-h-[720px] overflow-hidden">
            <ProductImage product={product} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup detail produk"
              className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
            >
              <i className="ri-close-line text-lg" />
            </button>

            <div className="absolute left-5 right-5 bottom-5 text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] mb-3">
                {product.category || "Katalog"}
              </span>

              <h3 id={titleId} className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                {product.name}
              </h3>

              <p
                id={descId}
                className="mt-3 max-w-xl text-sm md:text-base font-medium leading-7 text-white/80"
              >
                {product.description ||
                  "Pilih paket yang paling sesuai, lalu lanjutkan ke checkout dari detail produk ini."}
              </p>
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-5 md:p-6">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 mb-5">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400 mb-1">
                      Kategori
                    </div>
                    <div className="text-sm font-black text-slate-900">{product.category || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400 mb-1">
                      Paket
                    </div>
                    <div className="text-sm font-black text-slate-900">{product.variants?.length || 1}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400 mb-1">
                      Stok
                    </div>
                    <div className="text-sm font-black text-slate-900">{product.stock}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Pilih Paket
                  </p>
                  <p className="text-[11px] font-bold text-slate-400">
                    {product.variants?.length || 1} opsi tersedia
                  </p>
                </div>

                {product.variants && product.variants.length > 0 ? (
                  <div className="space-y-3">
                    {product.variants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      const outOfStock = variant.stock <= 0;

                      return (
                        <button
                          key={`${variant.productId || product.id}-${variant.id}`}
                          type="button"
                          disabled={outOfStock}
                          onClick={() => onSelectVariant(variant)}
                          className={`w-full text-left rounded-[24px] border p-4 transition-all ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50 shadow-[0_0_0_4px_rgba(5,150,105,0.08)]"
                              : "border-slate-200 bg-white hover:border-emerald-300"
                          } ${outOfStock ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm md:text-base font-black text-slate-900 leading-tight">
                                {variant.name}
                              </div>
                              <div className="mt-1 text-xs font-bold text-emerald-700">
                                {variant.duration}
                              </div>
                            </div>

                            {isSelected ? (
                              <i className="ri-checkbox-circle-fill text-xl text-emerald-600 shrink-0" />
                            ) : (
                              <i className="ri-checkbox-blank-circle-line text-xl text-slate-300 shrink-0" />
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                              {variant.type}
                            </span>
                            <span className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                              Garansi {variant.warranty}
                            </span>
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400">
                                Harga
                              </div>
                              <div className="text-xl font-black tracking-tight text-emerald-800">
                                <span className="text-xs mr-1">Rp</span>
                                {formatPrice(variant.price)}
                              </div>
                            </div>

                            <div
                              className={`text-[11px] font-bold ${
                                outOfStock ? "text-rose-500" : "text-slate-400"
                              }`}
                            >
                              {outOfStock ? "Stok habis" : `Stok ${variant.stock}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-black text-slate-900">Produk tanpa varian</div>
                    <div className="text-sm font-medium text-slate-500 mt-1">
                      Harga mulai dari Rp{formatPrice(product.sellPrice)}.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white p-5">
              <div className="rounded-[24px] bg-slate-900 px-5 py-4 text-white mb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] font-black text-white/55">
                      Total
                    </div>
                    <div className="text-3xl font-black tracking-tight">
                      <span className="text-sm mr-1 text-white/60">Rp</span>
                      {formatPrice(selectedPrice)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.14em] font-black text-white/55">
                      Status
                    </div>
                    <div className="text-sm font-black text-emerald-300">
                      {selectedVariant?.stock === 0 ? "Tidak tersedia" : "Siap diproses"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Tutup
                </button>

                <Link
                  href={checkoutHref}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-emerald-600"
                >
                  <i className="ri-lightning-fill" />
                  Lanjut ke Checkout
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-10 md:mb-14 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-4">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
              Ulasan Pelanggan
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Pengalaman belanja yang
            <br className="hidden md:block" />
            konsisten dan jelas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 md:p-7 shadow-[0_10px_30px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center gap-1 text-yellow-400 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <i key={j} className="ri-star-fill text-sm" />
                ))}
              </div>

              <p className="text-sm font-medium leading-7 text-slate-600 min-h-[112px]">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="mt-5 pt-4 border-t border-slate-200 flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${t.color[0]}, ${t.color[1]})` }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">{t.name}</div>
                  <div className="text-[11px] font-semibold text-slate-400">{t.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function StorefrontClient({
  initialProducts,
  isLoggedIn = false,
  userRole = null,
}: StorefrontClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("SEMUA");
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const groupedProducts = useMemo(() => {
    return groupProductsByBaseName(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const featured = [...groupedProducts]
      .sort((a, b) => {
        const aScore = (a.variants?.length || 1) * 100 + a.stock;
        const bScore = (b.variants?.length || 1) * 100 + b.stock;
        return bScore - aScore;
      })
      .slice(0, 2)
      .map((item) => item.id);

    setFeaturedIds(featured);
  }, [groupedProducts]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (typeof window !== "undefined" && window.innerWidth < 768) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).style.opacity = "1";
          (entry.target as HTMLElement).style.transform = "translateY(0)";
          observerRef.current?.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "40px" }
    );

    document.querySelectorAll(".reveal-card").forEach((el) => {
      (el as HTMLElement).style.opacity = "0";
      (el as HTMLElement).style.transform = "translateY(24px)";
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [activeCategory, searchQuery, groupedProducts]);

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariant(product.variants?.find((v) => v.stock > 0) ?? product.variants?.[0] ?? null);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  const categories = useMemo(() => {
    const cats = groupedProducts.map((p) => p.category).filter(Boolean) as string[];
    return ["SEMUA", ...Array.from(new Set(cats)).sort((a, b) => a.localeCompare(b))];
  }, [groupedProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return groupedProducts.filter((p) => {
      const matchCat = activeCategory === "SEMUA" || p.category === activeCategory;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.variants || []).some((v) => v.name.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [groupedProducts, searchQuery, activeCategory]);

  const orderedProducts = useMemo(() => {
    const featured = filteredProducts.filter((item) => featuredIds.includes(item.id));
    const regular = filteredProducts.filter((item) => !featuredIds.includes(item.id));
    return [...featured, ...regular];
  }, [filteredProducts, featuredIds]);

  const primaryAccountHref = isLoggedIn
    ? userRole === "ADMIN"
      ? "/admin"
      : "/dashboard"
    : "/login";

  const primaryAccountLabel = isLoggedIn ? "Dashboard" : "Masuk";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-up { animation: fadeUp 0.7s ease-out forwards; }
        .animate-fade-up-delay { animation: fadeUp 0.7s 0.12s ease-out both; }
        .animate-fade-up-delay2 { animation: fadeUp 0.7s 0.24s ease-out both; }
        .animate-fade-up-delay3 { animation: fadeUp 0.7s 0.36s ease-out both; }

        .reveal-card {
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-up,
          .animate-fade-up-delay,
          .animate-fade-up-delay2,
          .animate-fade-up-delay3 {
            animation: none;
          }
          .reveal-card {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-slate-900"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <header className="fixed inset-x-0 top-0 z-50">
          <nav
            className={`transition-all duration-300 ease-out ${
              isScrolled
                ? "border-b border-slate-200 bg-white py-3 shadow-sm"
                : "bg-white/95 py-4 md:py-5 backdrop-blur-xl"
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
              <Link href="/" className="group flex items-center gap-2.5 shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white shadow-lg shadow-emerald-900/20">
                  <i className="ri-store-2-fill text-lg" />
                </div>
                <div className="leading-none">
                  <div className="text-base md:text-lg font-black tracking-tight text-slate-900">
                    Pansa<span className="text-emerald-700">Store</span>
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Digital Marketplace
                  </div>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm font-bold text-slate-500 transition-colors hover:text-emerald-700"
                >
                  Beranda
                </Link>
                <Link
                  href="/cek-pesanan"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-emerald-700"
                >
                  <i className="ri-search-eye-line" />
                  Cek Pesanan
                </Link>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <Link
                  href="/cek-pesanan"
                  className="md:hidden flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  aria-label="Cek pesanan"
                >
                  <i className="ri-search-eye-line text-base" />
                </Link>

                <Link
                  href={primaryAccountHref}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs md:text-sm font-black text-white transition-all duration-300 hover:bg-emerald-800 active:scale-95"
                >
                  <i className={`${isLoggedIn ? "ri-dashboard-line" : "ri-user-3-line"} text-sm`} />
                  <span className="hidden sm:inline">{primaryAccountLabel}</span>
                </Link>

                {!isLoggedIn && (
                  <Link
                    href="/register"
                    className="hidden md:inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-600 active:scale-95"
                  >
                    <i className="ri-user-add-line text-sm" />
                    Daftar
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </header>

        <section
          className="relative overflow-hidden bg-white px-4 pt-28 pb-14 md:pt-40 md:pb-20"
          style={{ paddingTop: "clamp(104px, 16vw, 172px)" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.025)_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:radial-gradient(ellipse_72%_82%_at_50%_48%,#000_60%,transparent_100%)] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] md:w-[820px] h-[280px] md:h-[420px] bg-gradient-to-b from-emerald-100/80 via-emerald-50/40 to-transparent rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-end">
              <div>
                <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-6">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                    Katalog produk digital terkurasi
                  </span>
                </div>

                <h1 className="animate-fade-up-delay text-[2.8rem] sm:text-5xl md:text-[5.4rem] font-black tracking-tight leading-[1.02] text-slate-900 mb-5">
                  Katalog yang
                  <br />
                  jelas, cepat,
                  <br />
                  dan siap dibeli.
                </h1>

                <p className="animate-fade-up-delay2 max-w-2xl text-sm md:text-xl font-semibold leading-relaxed text-slate-500 mb-8 md:mb-10">
                  Telusuri produk, bandingkan paket, lalu lanjut ke checkout dengan alur yang ringkas
                  dan tampilan yang mudah dipahami.
                </p>

                <div className="animate-fade-up-delay3 max-w-2xl relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 md:pl-6 flex items-center pointer-events-none z-10">
                    <i className="ri-search-2-line text-slate-400 text-xl md:text-2xl transition-colors duration-300 group-focus-within:text-emerald-700" />
                  </div>

                  <input
                    type="text"
                    placeholder="Cari game, voucher, akun, atau layanan digital..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-[28px] border-2 border-slate-200 bg-white pl-14 pr-12 py-4 md:pl-16 md:py-5 text-sm md:text-base font-semibold text-slate-900 placeholder:text-slate-400 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600"
                    aria-label="Cari produk digital"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Hapus pencarian"
                    >
                      <i className="ri-close-circle-fill text-xl" />
                    </button>
                  )}
                </div>
              </div>

              <div className="animate-fade-up-delay3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <i className="ri-layout-grid-fill text-emerald-700 text-xl" />
                    </div>
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-1">Grid Rapi</div>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      Struktur katalog lebih mudah dipindai dan dibandingkan.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <i className="ri-stack-fill text-emerald-700 text-xl" />
                    </div>
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-1">Paket Jelas</div>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      Informasi penting ditempatkan tanpa elemen yang mengganggu.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <i className="ri-flashlight-fill text-emerald-700 text-xl" />
                    </div>
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-1">Alur Singkat</div>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      Pengunjung bisa masuk dari browse ke checkout dengan cepat.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <i className="ri-compasses-2-fill text-emerald-700 text-xl" />
                    </div>
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-1">Navigasi Ringan</div>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      Fokus ke katalog, kategori, dan tombol aksi utama.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TrustBar />

        <div
          id="catalog"
          className="sticky top-0 z-40 bg-[#F8FAFC]/95 backdrop-blur-xl border-y border-slate-200/80 shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-0 md:px-6">
            <div className="flex overflow-x-auto py-3 md:py-4 gap-2 px-4 md:px-0 hide-scrollbar items-center">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-5 py-2 text-[11px] md:text-xs font-black transition-all duration-200 active:scale-95 ${
                    activeCategory === category
                      ? "bg-emerald-800 text-white border-transparent shadow-md shadow-emerald-900/15"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 md:pt-14 pb-20 md:pb-28 min-h-[50vh]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-10">
            <div>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
                {activeCategory === "SEMUA" ? "Pilihan Produk" : activeCategory}
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-2">
                {orderedProducts.length} produk tersedia untuk ditelusuri.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 w-fit">
              <i className="ri-layout-grid-line text-emerald-700" />
              Tata katalog editorial
            </div>
          </div>

          {orderedProducts.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-[32px] shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="ri-search-line text-3xl text-slate-300" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">Produk tidak ditemukan</h3>
              <p className="text-sm text-slate-400 font-medium">
                Coba kata kunci atau kategori lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 auto-rows-[1fr]">
              {orderedProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  featured={index < 2 && featuredIds.includes(product.id)}
                  onOpen={openProductDetail}
                />
              ))}
            </div>
          )}
        </main>

        <TestimonialsSection />

        <section className="bg-[#F8FAFC] py-16 md:py-24 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="rounded-[34px] border border-slate-200 bg-white p-8 md:p-12 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-4">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                      Mulai belanja
                    </span>
                  </div>

                  <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-slate-900 mb-4">
                    Temukan paket yang tepat
                    <br className="hidden md:block" />
                    untuk kebutuhan Anda.
                  </h2>

                  <p className="max-w-2xl text-sm md:text-base font-medium leading-7 text-slate-500">
                    Telusuri katalog, buka detail produk, lalu pilih paket yang paling sesuai tanpa
                    antarmuka yang terasa berlebihan.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3">
                  <a
                    href="#catalog"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-emerald-600"
                  >
                    <i className="ri-shopping-bag-3-fill" />
                    Jelajahi Katalog
                  </a>

                  <Link
                    href="/cek-pesanan"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <i className="ri-search-eye-line" />
                    Cek Pesanan
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            selectedVariant={selectedVariant}
            onSelectVariant={setSelectedVariant}
            onClose={closeModal}
          />
        )}
      </div>
    </>
  );
}
