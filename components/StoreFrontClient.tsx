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
  ["#0f766e", "#052e2b"],
  ["#0f3f8c", "#111827"],
  ["#17624d", "#091a16"],
  ["#6b4f1d", "#1f1607"],
  ["#244b7a", "#0f172a"],
  ["#14532d", "#052e16"],
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
  const baseId = variant?.productId || product.id;
  const params = new URLSearchParams();

  if (variant?.id) {
    params.set("variant", variant.id);
  }

  const qs = params.toString();
  return `/checkout/${baseId}${qs ? `?${qs}` : ""}`;
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
  { icon: "ri-shield-check-fill", value: "120.000+", label: "Pesanan Diproses" },
  { icon: "ri-flashlight-fill", value: "< 3 Detik", label: "Respon Sistem" },
  { icon: "ri-layout-grid-fill", value: "Rapi", label: "Tampilan Katalog" },
  { icon: "ri-customer-service-2-fill", value: "24/7", label: "Monitoring" },
] as const;

function TrustBar() {
  return (
    <section className="relative border-y border-slate-200/80 bg-white/90">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {TRUST_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:px-5 md:py-5"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
                <i className={`${stat.icon} text-xl text-emerald-700`} />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 md:text-xs">
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
        width={square ? 600 : 900}
        height={square ? 600 : 1100}
        className={className}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center text-white ${className || ""}`}
      style={getGradientStyle(product.name)}
      aria-label={product.name}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)]" />
      <span className="relative text-4xl font-black tracking-[-0.08em] opacity-95 drop-shadow-md md:text-6xl">
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
      className={`reveal-card group relative overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] transition-all duration-500 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-[0_28px_70px_rgba(5,150,105,0.12)] ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-700 via-[#c8a24d] to-emerald-700" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-emerald-300/20 blur-3xl" />
      </div>

      <div className={`grid h-full ${featured ? "md:grid-cols-[1.05fr_0.95fr]" : "grid-cols-1"}`}>
        <div className={`relative overflow-hidden ${featured ? "min-h-[320px] md:min-h-full" : "aspect-[4/3]"}`}>
          <ProductImage
            product={product}
            square
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.03),rgba(2,6,23,0.04)),linear-gradient(0deg,rgba(2,6,23,0.78),rgba(2,6,23,0.02)_56%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_18%)] opacity-80" />

          <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-white/40 bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-800 backdrop-blur-md">
                {product.category || "Katalog"}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                  inStock
                    ? "border border-emerald-200 bg-emerald-50/95 text-emerald-800"
                    : "border border-rose-200 bg-rose-50/95 text-rose-700"
                }`}
              >
                <i className={inStock ? "ri-checkbox-circle-fill" : "ri-close-circle-fill"} />
                {inStock ? "Tersedia" : "Habis"}
              </span>
            </div>

            {featured && (
              <span className="inline-flex items-center rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
                Featured
              </span>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 text-white backdrop-blur-xl">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                Harga mulai
              </div>
              <div className="text-[1.9rem] font-black tracking-tight md:text-[2.35rem]">
                <span className="mr-1 text-sm text-white/70">Rp</span>
                {formatPrice(startingPrice)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-black leading-tight tracking-tight text-slate-950 md:text-2xl">
                {product.name}
              </h3>
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/80">
                {product.type || previewVariant?.type || "Produk Digital"}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Paket
              </div>
              <div className="text-sm font-black text-slate-900">{variantCount || 1}</div>
            </div>
          </div>

          <p className="min-h-[84px] text-sm font-medium leading-7 text-slate-500 line-clamp-3">
            {product.description ||
              "Produk digital resmi dengan beberapa pilihan paket, proses pembelian cepat, dan tampilan yang mudah dipahami."}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                Varian
              </div>
              <div className="text-xs font-black text-slate-800">{variantCount || 1} opsi</div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                Garansi
              </div>
              <div className="text-xs font-black text-slate-800">
                {previewVariant?.warranty || "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                Stok
              </div>
              <div className="text-xs font-black text-slate-800">{product.stock}</div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => onOpen(product)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-800 active:scale-[0.98]"
            >
              <i className="ri-eye-line" />
              Detail
            </button>

            <Link
              href={getProductHref(product, previewVariant)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-black text-emerald-800 transition-all duration-300 hover:border-emerald-300 hover:bg-emerald-100"
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
  const scrollYRef = useRef(0);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    scrollYRef.current = window.scrollY;

    const body = document.body;
    const html = document.documentElement;

    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      html.style.overscrollBehavior = "";
      window.scrollTo(0, scrollYRef.current);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const selectedPrice = selectedVariant?.price ?? product.sellPrice;
  const checkoutHref = getProductHref(product, selectedVariant);
  const selectedReady = (selectedVariant?.stock ?? product.stock) > 0;

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/70 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="absolute inset-0 overflow-hidden">
        <div className="flex min-h-full items-end justify-center md:items-center md:p-5">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="relative flex h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.35)] outline-none md:h-[88dvh] md:rounded-[34px]"
          >
            <div className="absolute left-1/2 top-3 z-20 h-1.5 w-12 -translate-x-1/2 rounded-full bg-slate-200 md:hidden" />

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.02fr_0.98fr]">
              <div className="relative hidden min-h-0 overflow-hidden lg:block">
                <ProductImage product={product} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.1)),linear-gradient(0deg,rgba(2,6,23,0.84),rgba(2,6,23,0.06)_58%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_18%)]" />

                <div className="absolute left-6 right-6 top-6 flex items-start justify-between gap-3">
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    {product.category || "Katalog"}
                  </span>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup detail produk"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                  >
                    <i className="ri-close-line text-lg" />
                  </button>
                </div>

                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h3 id={titleId} className="text-3xl font-black leading-tight tracking-tight">
                    {product.name}
                  </h3>
                  <p
                    id={descId}
                    className="mt-3 max-w-xl text-base font-medium leading-8 text-white/80"
                  >
                    {product.description ||
                      "Pilih paket yang paling sesuai, lalu lanjutkan ke checkout dengan alur yang cepat dan lebih jelas."}
                  </p>
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-white">
                <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-5 pb-4 pt-5 backdrop-blur-xl md:px-6">
                  <div className="flex items-start justify-between gap-4 lg:hidden">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
                        {product.category || "Katalog"}
                      </div>
                      <h3 id={titleId} className="text-xl font-black leading-tight tracking-tight text-slate-950">
                        {product.name}
                      </h3>
                      <p id={descId} className="mt-2 text-sm font-medium leading-7 text-slate-500">
                        {product.description ||
                          "Pilih varian yang paling cocok dan lanjutkan ke checkout."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Tutup detail produk"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                    >
                      <i className="ri-close-line text-lg" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Kategori
                      </div>
                      <div className="text-sm font-black text-slate-900">{product.category || "-"}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Varian
                      </div>
                      <div className="text-sm font-black text-slate-900">{product.variants?.length || 1}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Stok
                      </div>
                      <div className="text-sm font-black text-slate-900">{product.stock}</div>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Pilih Paket
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {product.variants?.length || 1} opsi tersedia
                      </p>
                    </div>

                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-500">
                      Swipe / scroll untuk lihat semua
                    </div>
                  </div>

                  {product.variants && product.variants.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {product.variants.map((variant) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        const outOfStock = variant.stock <= 0;

                        return (
                          <button
                            key={`${variant.productId || product.id}-${variant.id}`}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => onSelectVariant(variant)}
                            className={`group/variant relative overflow-hidden rounded-[26px] border p-4 text-left transition-all duration-300 ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50 shadow-[0_0_0_4px_rgba(5,150,105,0.08)]"
                                : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                            } ${outOfStock ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                          >
                            <div className="absolute -right-8 top-0 h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl opacity-0 transition-opacity duration-300 group-hover/variant:opacity-100" />

                            <div className="relative flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-black leading-tight text-slate-950 md:text-base">
                                  {variant.name}
                                </div>
                                <div className="mt-1 text-xs font-bold text-emerald-700">
                                  {variant.duration}
                                </div>
                              </div>

                              {isSelected ? (
                                <i className="ri-checkbox-circle-fill shrink-0 text-2xl text-emerald-600" />
                              ) : (
                                <i className="ri-checkbox-blank-circle-line shrink-0 text-2xl text-slate-300" />
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
                                {variant.type}
                              </span>
                              <span className="rounded-xl border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                                Garansi {variant.warranty}
                              </span>
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                  Harga
                                </div>
                                <div className="text-xl font-black tracking-tight text-emerald-800">
                                  <span className="mr-1 text-xs">Rp</span>
                                  {formatPrice(variant.price)}
                                </div>
                              </div>

                              <div
                                className={`text-[11px] font-black ${
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
                    <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-black text-slate-900">Produk tanpa varian</div>
                      <div className="mt-1 text-sm font-medium text-slate-500">
                        Harga mulai dari Rp{formatPrice(product.sellPrice)}.
                      </div>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 z-20 border-t border-slate-200/80 bg-white/95 p-5 backdrop-blur-xl md:p-6">
                  <div className="mb-4 rounded-[26px] bg-slate-950 px-5 py-4 text-white">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                          Total
                        </div>
                        <div className="mt-1 text-3xl font-black tracking-tight">
                          <span className="mr-1 text-sm text-white/60">Rp</span>
                          {formatPrice(selectedPrice)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                          Status
                        </div>
                        <div className={`text-sm font-black ${selectedReady ? "text-emerald-300" : "text-rose-300"}`}>
                          {selectedReady ? "Siap diproses" : "Tidak tersedia"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      Tutup
                    </button>

                    <Link
                      href={checkoutHref}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white transition-colors ${
                        selectedReady
                          ? "bg-emerald-700 hover:bg-emerald-600"
                          : "pointer-events-none bg-slate-300"
                      }`}
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
      </div>
    </div>
  );
}

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 border-t border-slate-200 bg-slate-950 text-white md:mt-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr] lg:gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-800 text-white shadow-lg shadow-emerald-950/20">
                <i className="ri-store-2-fill text-lg" />
              </div>
              <div className="leading-none">
                <div className="text-lg font-black tracking-tight">
                  Pansa<span className="text-emerald-400">Store</span>
                </div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                  Digital Marketplace
                </div>
              </div>
            </Link>

            <p className="mt-5 max-w-md text-sm font-medium leading-7 text-white/65">
              Storefront digital yang lebih bersih, lebih cepat dipindai, dan lebih nyaman dipakai
              untuk memilih paket serta lanjut ke checkout tanpa bingung.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/cek-pesanan"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/90 transition-colors hover:bg-white/10"
              >
                <i className="ri-search-eye-line" />
                Cek Pesanan
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-500"
              >
                <i className="ri-user-3-line" />
                Masuk Akun
              </Link>
            </div>
          </div>

          <div>
            <div className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/35">
              Navigasi
            </div>
            <div className="space-y-3">
              <Link href="/" className="block text-sm font-semibold text-white/70 transition-colors hover:text-white">
                Beranda
              </Link>
              <Link
                href="/cek-pesanan"
                className="block text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                Cek Pesanan
              </Link>
              <Link
                href="/login"
                className="block text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="block text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                Register
              </Link>
            </div>
          </div>

          <div>
            <div className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/35">
              Kelebihan
            </div>
            <div className="space-y-3 text-sm font-semibold text-white/70">
              <div>Pilihan paket lebih jelas</div>
              <div>Checkout lebih ringkas</div>
              <div>Grid responsif mobile-first</div>
              <div>Visual storefront lebih premium</div>
            </div>
          </div>

          <div>
            <div className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/35">
              Informasi
            </div>
            <div className="space-y-3 text-sm font-semibold text-white/70">
              <div className="flex items-start gap-2">
                <i className="ri-shield-check-line mt-0.5 text-emerald-400" />
                Sistem menampilkan katalog dengan struktur yang lebih rapi dan mudah dipindai.
              </div>
              <div className="flex items-start gap-2">
                <i className="ri-smartphone-line mt-0.5 text-emerald-400" />
                Modal varian dioptimalkan agar nyaman dibaca di layar kecil.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold">© {year} PansaStore. Semua hak dilindungi.</div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold">Built for fast digital checkout</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            <span className="font-semibold">Responsive storefront experience</span>
          </div>
        </div>
      </div>
    </footer>
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
    handleScroll();
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
      { threshold: 0.05, rootMargin: "50px" }
    );

    document.querySelectorAll(".reveal-card").forEach((el) => {
      (el as HTMLElement).style.opacity = "0";
      (el as HTMLElement).style.transform = "translateY(26px)";
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
        html { scroll-behavior: smooth; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes softFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .animate-fade-up { animation: fadeUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-up-delay { animation: fadeUp 0.75s 0.12s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-fade-up-delay2 { animation: fadeUp 0.75s 0.24s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-fade-up-delay3 { animation: fadeUp 0.75s 0.36s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-soft-float { animation: softFloat 6s ease-in-out infinite; }

        .reveal-card {
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-up,
          .animate-fade-up-delay,
          .animate-fade-up-delay2,
          .animate-fade-up-delay3,
          .animate-soft-float {
            animation: none;
          }

          .reveal-card {
            opacity: 1 !important;
            transform: none !important;
          }

          html { scroll-behavior: auto; }
        }
      `}</style>

      <div
        className="min-h-screen overflow-x-hidden bg-[#f7f6f2] text-slate-900"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <header className="fixed inset-x-0 top-0 z-50">
          <nav
            className={`transition-all duration-300 ease-out ${
              isScrolled
                ? "border-b border-slate-200/80 bg-white/92 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
                : "bg-white/78 py-4 md:py-5 backdrop-blur-xl"
            }`}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
              <Link href="/" className="group flex shrink-0 items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white shadow-lg shadow-emerald-900/20 transition-transform duration-300 group-hover:scale-[1.04]">
                  <i className="ri-store-2-fill text-lg" />
                </div>

                <div className="leading-none">
                  <div className="text-base font-black tracking-tight text-slate-900 md:text-lg">
                    Pansa<span className="text-emerald-700">Store</span>
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Digital Marketplace
                  </div>
                </div>
              </Link>

              <div className="hidden items-center gap-6 md:flex">
                <Link href="/" className="text-sm font-black text-slate-500 transition-colors hover:text-emerald-700">
                  Beranda
                </Link>
                <Link
                  href="/cek-pesanan"
                  className="inline-flex items-center gap-1.5 text-sm font-black text-slate-500 transition-colors hover:text-emerald-700"
                >
                  <i className="ri-search-eye-line" />
                  Cek Pesanan
                </Link>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <Link
                  href="/cek-pesanan"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 md:hidden"
                  aria-label="Cek pesanan"
                >
                  <i className="ri-search-eye-line text-base" />
                </Link>

                <Link
                  href={primaryAccountHref}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition-all hover:bg-emerald-800 active:scale-95 md:text-sm"
                >
                  <i className={`${isLoggedIn ? "ri-dashboard-line" : "ri-user-3-line"} text-sm`} />
                  <span className="hidden sm:inline">{primaryAccountLabel}</span>
                </Link>

                {!isLoggedIn && (
                  <Link
                    href="/register"
                    className="hidden items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white transition-all hover:bg-emerald-600 active:scale-95 md:inline-flex"
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
          className="relative overflow-hidden bg-[#f7f6f2] px-4 pb-16 pt-28 md:pb-20"
          style={{ paddingTop: "clamp(104px, 16vw, 172px)" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_72%_82%_at_50%_48%,#000_58%,transparent_100%)]" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[310px] w-[460px] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-200/70 via-emerald-50/50 to-transparent blur-[90px] md:h-[430px] md:w-[920px]" />
          <div className="pointer-events-none absolute right-[-80px] top-[18%] h-56 w-56 rounded-full bg-amber-200/25 blur-3xl animate-soft-float" />
          <div className="pointer-events-none absolute left-[-60px] top-[32%] h-52 w-52 rounded-full bg-emerald-200/25 blur-3xl animate-soft-float" />

          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
              <div>
                <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800 md:text-xs">
                    Storefront digital lebih premium
                  </span>
                </div>

                <h1 className="animate-fade-up-delay mb-5 text-[2.8rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-5xl md:text-[5.2rem]">
                  Pilih produk
                  <br />
                  lebih cepat,
                  <br />
                  lebih jelas.
                </h1>

                <p className="animate-fade-up-delay2 mb-8 max-w-2xl text-sm font-semibold leading-8 text-slate-500 md:mb-10 md:text-xl">
                  Katalog dibuat agar nyaman discan, mudah dibandingkan, dan tetap terasa premium
                  di mobile maupun desktop.
                </p>

                <div className="animate-fade-up-delay3 relative max-w-2xl group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-5 md:pl-6">
                    <i className="ri-search-2-line text-xl text-slate-400 transition-colors duration-300 group-focus-within:text-emerald-700 md:text-2xl" />
                  </div>

                  <input
                    type="text"
                    placeholder="Cari game, voucher, akun, layanan digital..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-[28px] border-2 border-slate-200 bg-white px-12 py-4 pl-14 text-sm font-semibold text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-all placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 md:py-5 md:pl-16 md:text-base"
                    aria-label="Cari produk digital"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-400 transition-colors hover:text-slate-600"
                      aria-label="Hapus pencarian"
                    >
                      <i className="ri-close-circle-fill text-xl" />
                    </button>
                  )}
                </div>
              </div>

              <div className="animate-fade-up-delay3">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      icon: "ri-layout-grid-fill",
                      title: "Grid Katalog",
                      desc: "Lebih enak dipindai dan dibandingkan.",
                    },
                    {
                      icon: "ri-focus-3-fill",
                      title: "Fokus Produk",
                      desc: "Harga dan paket tampil lebih menonjol.",
                    },
                    {
                      icon: "ri-smartphone-fill",
                      title: "Mobile Nyaman",
                      desc: "Modal varian kini lebih aman di layar kecil.",
                    },
                    {
                      icon: "ri-magic-fill",
                      title: "Visual Depth",
                      desc: "Ada glow, layering, dan hierarchy yang lebih terasa.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
                        <i className={`${item.icon} text-xl text-emerald-700`} />
                      </div>
                      <div className="mb-1 text-lg font-black tracking-tight text-slate-900">
                        {item.title}
                      </div>
                      <p className="text-sm font-medium leading-6 text-slate-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <TrustBar />

        <section className="relative px-4 py-10 md:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/80">
                  Jelajahi produk
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Grid produk yang lebih hidup
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500 md:text-base">
                  Pilih kategori, buka detail, lalu lanjutkan ke checkout dari paket yang paling cocok.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-sm">
                {orderedProducts.length} produk ditampilkan
              </div>
            </div>

            <div className="hide-scrollbar -mx-4 mb-8 overflow-x-auto px-4">
              <div className="flex min-w-max gap-3">
                {categories.map((category) => {
                  const active = activeCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`rounded-full px-4 py-3 text-sm font-black transition-all ${
                        active
                          ? "bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.14)]"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {orderedProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {orderedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    featured={featuredIds.includes(product.id)}
                    onOpen={openProductDetail}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                  <i className="ri-search-line text-2xl" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-slate-950">
                  Produk tidak ditemukan
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-7 text-slate-500">
                  Coba ubah kata kunci pencarian atau pilih kategori lain agar hasil yang tampil lebih sesuai.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="px-4 pb-4 pt-2 md:pb-8">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_0.9fr]">
                <div className="relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
                  <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />

                  <div className="relative">
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                      Pengalaman lebih rapi
                    </div>
                    <h3 className="mt-4 text-2xl font-black tracking-tight md:text-4xl">
                      Storefront yang lebih enak dilihat dan lebih mudah dipakai.
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm font-medium leading-8 text-white/70 md:text-base">
                      Fokus utama ada pada grid produk, pemilihan paket, dan alur ke checkout agar pengunjung
                      tidak kehilangan konteks saat membandingkan pilihan.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-white/10">
                  {[
                    ["Grid responsif", "1–2 kolom mobile, lebih lapang di tablet dan desktop."],
                    ["Visual hierarchy", "Harga, stok, dan paket tampil dengan bobot yang jelas."],
                    ["Modal aman", "Bottom-sheet mobile dan dialog desktop lebih mudah dipindai."],
                    ["CTA kuat", "Aksi detail dan checkout tidak tenggelam di dalam card."],
                  ].map(([title, desc]) => (
                    <div key={title} className="bg-slate-950/80 px-5 py-5">
                      <div className="text-base font-black tracking-tight">{title}</div>
                      <p className="mt-2 text-sm font-medium leading-7 text-white/65">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />

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
