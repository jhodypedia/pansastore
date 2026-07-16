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
  ["#059669", "#047857"],
  ["#2563EB", "#1D4ED8"],
  ["#7C3AED", "#6D28D9"],
  ["#DB2777", "#BE185D"],
  ["#D97706", "#B45309"],
  ["#0891B2", "#0E7490"],
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
  const productId = variant?.productId || product.id;
  const params = new URLSearchParams();
  if (variant?.id) params.set("variantId", variant.id);
  const query = params.toString();
  return `/checkout/${productId}${query ? `?${query}` : ""}`;
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
  { icon: "ri-shopping-bag-3-fill", value: "120.000+", label: "Transaksi Selesai" },
  { icon: "ri-star-fill", value: "4.98", label: "Rating Rata-Rata" },
  { icon: "ri-user-heart-fill", value: "45.000+", label: "Pelanggan Aktif" },
  { icon: "ri-timer-flash-fill", value: "< 3 Detik", label: "Kecepatan Proses" },
] as const;

const TESTIMONIALS = [
  {
    name: "Rizky Aditya",
    avatar: "RA",
    role: "Mobile Gamer",
    rating: 5,
    text: "Top up paling cepat yang pernah saya coba. Bayar QRIS langsung masuk dalam hitungan detik. Gak perlu khawatir soal keamanan.",
    color: ["#059669", "#047857"],
  },
  {
    name: "Siti Nur Haliza",
    avatar: "SN",
    role: "Content Creator",
    rating: 5,
    text: "Udah berlangganan lebih dari setahun. Harga konsisten murah, pelayanan responsif, dan sistemnya tidak pernah bermasalah. Recommended!",
    color: ["#7C3AED", "#6D28D9"],
  },
  {
    name: "Budi Santoso",
    avatar: "BS",
    role: "Reseller Digital",
    rating: 5,
    text: "Margin bagus buat dijual lagi. Admin fast response kalau ada kendala. Stok selalu tersedia, top up lancar terus.",
    color: ["#2563EB", "#1D4ED8"],
  },
] as const;

const MARQUEE_ITEMS = [
  "⚡ Proses Instan",
  "🔒 Transaksi Aman",
  "🎮 Games & Digital Lengkap",
  "🌙 Layanan 24/7 Nonstop",
  "💳 Multi Payment Method",
  "✅ 120 Ribu+ Transaksi Sukses",
  "⚡ Proses Instan",
  "🔒 Transaksi Aman",
  "🎮 Games & Digital Lengkap",
  "🌙 Layanan 24/7 Nonstop",
  "💳 Multi Payment Method",
  "✅ 120 Ribu+ Transaksi Sukses",
] as const;

function TrustBar() {
  return (
    <section className="py-12 md:py-16 bg-white border-y border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {TRUST_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 md:p-6 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(5,150,105,0.08)] transition-all duration-300"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                <i className={`${stat.icon} text-emerald-700 text-xl md:text-2xl`} />
              </div>
              <div className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                {stat.value}
              </div>
              <div className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.14em] mt-1.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoBanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-8 md:p-12 shadow-[0_30px_80px_-20px_rgba(6,78,59,0.45)]">
        <div className="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-12 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-300" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/90">
                Promo Spesial Hari Ini
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.05] mb-3">
              Diskon Hingga <span className="text-yellow-300">30%</span> untuk
              <br className="hidden md:block" />
              Member Baru
            </h2>

            <p className="text-sm md:text-base text-emerald-50/80 font-medium max-w-xl leading-relaxed">
              Daftar sekarang dan nikmati harga spesial untuk semua kategori produk digital
              dengan checkout otomatis yang cepat dan aman.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-emerald-800 shadow-lg transition-all duration-300 hover:bg-yellow-300 hover:text-emerald-900 active:scale-95"
            >
              <i className="ri-user-add-fill" />
              Daftar Gratis Sekarang
            </Link>
            <p className="text-[11px] font-semibold text-emerald-100/70 flex items-center gap-1.5">
              <i className="ri-shield-check-line" />
              Tanpa biaya pendaftaran
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-4">
            <i className="ri-star-smile-fill text-sm text-emerald-700" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
              Testimoni Pelanggan
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Dipercaya Puluhan Ribu
            <br className="hidden md:block" />
            Pelanggan Aktif
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_20px_50px_rgba(5,150,105,0.08)]"
            >
              <div className="flex items-center gap-1 text-yellow-400 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <i key={j} className="ri-star-fill text-sm" />
                ))}
              </div>

              <p className="text-sm font-medium leading-7 text-slate-600 min-h-[120px]">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
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
                <i className="ri-verified-badge-fill ml-auto text-lg text-emerald-600" />
              </div>
            </article>
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
      className={`w-full h-full flex flex-col items-center justify-center text-white ${className || ""}`}
      style={getGradientStyle(product.name)}
      aria-label={product.name}
    >
      <span className="text-3xl md:text-5xl font-black tracking-tighter drop-shadow-md opacity-90">
        {getInitials(product.name)}
      </span>
    </div>
  );
}

function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (product: Product) => void;
}) {
  const startingPrice = product.sellPrice;
  const variantCount = product.variants?.length ?? 0;
  const inStock = product.stock > 0;
  const previewVariant = product.variants?.find((v) => v.stock > 0) ?? product.variants?.[0] ?? null;

  return (
    <article className="reveal-card group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-[0_24px_60px_rgba(5,150,105,0.12)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-[#C8A24D] to-emerald-600 opacity-90" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <ProductImage
          product={product}
          square
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />

        <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm backdrop-blur-md">
            <i className="ri-price-tag-3-fill text-emerald-700" />
            {product.category || "Katalog"}
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-sm backdrop-blur-md ${
              inStock
                ? "border border-emerald-100 bg-emerald-50/95 text-emerald-800"
                : "border border-rose-100 bg-rose-50/95 text-rose-700"
            }`}
          >
            <i className={inStock ? "ri-checkbox-circle-fill" : "ri-close-circle-fill"} />
            {inStock ? "Ready Stock" : "Stok Habis"}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-xl">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              Harga mulai
            </div>
            <div className="text-2xl font-black tracking-tight">
              <span className="mr-1 text-sm text-white/70">Rp</span>
              {formatPrice(startingPrice)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5 md:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-black leading-tight tracking-tight text-slate-900 md:text-[1.18rem]">
              {product.name}
            </h3>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700/80">
              {product.type || previewVariant?.type || "Produk Digital"}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Paket
            </div>
            <div className="text-sm font-black text-slate-900">{variantCount || 1}</div>
          </div>
        </div>

        <p className="line-clamp-3 min-h-[78px] text-sm font-medium leading-7 text-slate-500">
          {product.description ||
            "Produk digital resmi dengan pengiriman cepat, aman, dan otomatis selama 24 jam."}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
              Varian
            </div>
            <div className="text-xs font-black text-slate-800">{variantCount || 1} pilihan</div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
              Garansi
            </div>
            <div className="truncate text-xs font-black text-slate-800">
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

        <div className="mt-auto pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={() => onOpen(product)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-800 active:scale-[0.98]"
            >
              <i className="ri-eye-line" />
              Lihat Detail
            </button>

            <Link
              href={getProductHref(product, previewVariant)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-black text-emerald-800 transition-all duration-300 hover:bg-emerald-100 sm:w-auto"
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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const scrollY = window.scrollY;
    const originalStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.position = originalStyle.position;
      document.body.style.top = originalStyle.top;
      document.body.style.width = originalStyle.width;
      document.body.style.overflow = originalStyle.overflow;
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const selectedPrice = selectedVariant?.price ?? product.sellPrice;
  const checkoutHref = getProductHref(product, selectedVariant);
  const variantList = product.variants && product.variants.length > 0 ? product.variants : [];

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] outline-none sm:h-auto sm:max-h-[92vh] sm:rounded-[32px]"
        >
          <div className="absolute left-1/2 top-3 z-20 h-1.5 w-12 -translate-x-1/2 rounded-full bg-slate-200 sm:hidden" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail produk"
            className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-900/75 text-white backdrop-blur-md transition-colors hover:bg-slate-900"
          >
            <i className="ri-close-line text-lg" />
          </button>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="relative hidden min-h-0 overflow-hidden lg:block">
              <ProductImage product={product} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]">
                  <i className="ri-shield-check-fill text-emerald-300" />
                  Checkout Aman · PansaStore
                </span>
                <h3 id={titleId} className="text-3xl font-black leading-tight tracking-tight">
                  {product.name}
                </h3>
                <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-white/80">
                  {product.description ||
                    "Produk digital resmi dengan pengiriman instan, pembayaran aman, dan pemrosesan otomatis selama 24 jam."}
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="border-b border-slate-100 bg-white px-4 pb-4 pt-6 sm:px-5 lg:hidden">
                <div className="mb-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <ProductImage product={product} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">
                  <i className="ri-shield-check-fill" />
                  Checkout Aman
                </span>

                <h3 id={titleId} className="mt-3 text-2xl font-black leading-tight tracking-tight text-slate-900 lg:hidden">
                  {product.name}
                </h3>

                <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                  {product.description ||
                    "Produk digital resmi dengan pengiriman instan, pembayaran aman, dan pemrosesan otomatis selama 24 jam."}
                </p>
              </div>

              <div
                className="modal-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6"
              >
                <div className="mb-5 flex flex-wrap gap-2">
                  {[
                    { icon: "ri-flashlight-line", label: "Proses Instan" },
                    { icon: "ri-shield-check-line", label: "Bergaransi" },
                    { icon: "ri-customer-service-2-line", label: "Support 24/7" },
                  ].map((chip) => (
                    <div
                      key={chip.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5"
                    >
                      <i className={`${chip.icon} text-xs text-emerald-700`} />
                      <span className="text-[11px] font-bold text-emerald-900">{chip.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Kategori
                      </div>
                      <div className="text-sm font-black text-slate-900">{product.category || "-"}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Paket
                      </div>
                      <div className="text-sm font-black text-slate-900">{product.variants?.length || 1}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Stok
                      </div>
                      <div className="text-sm font-black text-slate-900">{product.stock}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Pilih Paket
                    </p>
                    <p className="text-[11px] font-bold text-slate-400">
                      {product.variants?.length || 1} pilihan tersedia
                    </p>
                  </div>

                  {variantList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {variantList.map((variant) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        const outOfStock = variant.stock <= 0;

                        return (
                          <button
                            key={`${variant.productId || product.id}-${variant.id}`}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => onSelectVariant(variant)}
                            className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50 shadow-[0_0_0_4px_rgba(5,150,105,0.08)]"
                                : "border-slate-200 bg-white hover:border-emerald-300"
                            } ${outOfStock ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-black leading-tight text-slate-900 md:text-[15px]">
                                  {variant.name}
                                </div>
                                <div className="mt-1 text-xs font-bold text-emerald-700">
                                  {variant.duration}
                                </div>
                              </div>

                              {isSelected ? (
                                <i className="ri-checkbox-circle-fill shrink-0 text-xl text-emerald-600" />
                              ) : (
                                <i className="ri-checkbox-blank-circle-line shrink-0 text-xl text-slate-300" />
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
                      <div className="mt-1 text-sm font-medium text-slate-500">
                        Harga mulai dari Rp{formatPrice(product.sellPrice)}.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="safe-bottom shrink-0 border-t border-slate-100 bg-white p-4 sm:p-5">
                <div className="mb-4 rounded-[24px] bg-slate-900 px-5 py-4 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                        Total Pembayaran
                      </div>
                      <div className="text-3xl font-black tracking-tight">
                        <span className="mr-1 text-sm text-white/60">Rp</span>
                        {formatPrice(selectedPrice)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                        Status
                      </div>
                      <div className="text-sm font-black text-emerald-300">
                        {selectedVariant?.stock === 0 ? "Tidak tersedia" : "Siap diproses"}
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-emerald-600"
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

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-marquee {
          animation: marquee 28s linear infinite;
        }

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

        .glass-edge {
          box-shadow:
            0 1px 0 rgba(255,255,255,0.6) inset,
            0 10px 30px rgba(15,23,42,0.06);
        }

        .modal-scroll {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .safe-bottom {
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-marquee,
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
        className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-slate-900 flex flex-col"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <header className="fixed inset-x-0 top-0 z-50">
          <div
            className={`overflow-hidden bg-emerald-800 transition-all duration-300 ease-out ${
              isScrolled ? "h-0 py-0 opacity-0" : "h-auto py-2.5 opacity-100"
            }`}
          >
            <div className="flex w-max animate-marquee gap-8 whitespace-nowrap select-none">
              {MARQUEE_ITEMS.map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100"
                >
                  {item}
                  <span className="mx-2 text-emerald-500">•</span>
                </span>
              ))}
            </div>
          </div>

          <nav
            className={`transition-all duration-300 ease-out ${
              isScrolled
                ? "border-b border-slate-200 bg-white py-3 shadow-sm"
                : "bg-white/95 py-4 md:py-5 backdrop-blur-xl"
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
              <Link href="/" className="group flex items-center gap-2.5 shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white shadow-lg shadow-emerald-900/20 transition-all group-hover:scale-[1.03]">
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
              </div>
            </div>
          </nav>
        </header>

        <main className="flex-1 pt-[104px] md:pt-[118px]">
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
            <div className="animate-fade-up max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                  Marketplace Digital Terpercaya
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.05]">
                Belanja produk digital
                <br />
                <span className="text-emerald-700">cepat, aman, dan otomatis</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm md:text-base font-medium leading-7 text-slate-500">
                Cari produk favoritmu, pilih paket yang sesuai, lalu selesaikan pembayaran via QRIS
                tanpa ribet. Semua transaksi diproses otomatis selama 24 jam.
              </p>
            </div>

            <div className="animate-fade-up-delay mt-8 flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400">
                  <i className="ri-search-line text-lg" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari produk, kategori, atau paket..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 md:pb-0">
                {categories.map((category) => {
                  const active = activeCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`shrink-0 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.1em] transition-all ${
                        active
                          ? "border-emerald-700 bg-emerald-700 text-white shadow-md"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <TrustBar />
          <PromoBanner />

          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
            <div className="mb-6 md:mb-8 flex items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-3">
                  <i className="ri-layout-grid-fill text-sm text-emerald-700" />
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                    Produk Pilihan
                  </span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
                  Temukan produk digital terbaik
                </h2>
                <p className="mt-2 max-w-2xl text-sm md:text-base font-medium leading-7 text-slate-500">
                  Pilih paket yang paling sesuai, buka detail produk, lalu lanjutkan checkout dengan
                  cepat.
                </p>
              </div>

              <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
                <i className="ri-box-3-line text-emerald-700" />
                {filteredProducts.length} produk tampil
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onOpen={openProductDetail} />
                ))}
              </div>
            ) : (
              <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                  <i className="ri-search-line text-2xl" />
                </div>
                <h3 className="mt-5 text-xl font-black text-slate-900">Produk tidak ditemukan</h3>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-7 text-slate-500">
                  Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat katalog yang
                  tersedia.
                </p>
              </div>
            )}
          </section>

          <TestimonialsSection />
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:pr-8">
                <Link href="/" className="group inline-flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white shadow-lg shadow-emerald-900/20">
                    <i className="ri-store-2-fill text-lg" />
                  </div>
                  <div className="leading-none">
                    <div className="text-lg font-black tracking-tight text-slate-900">
                      Pansa<span className="text-emerald-700">Store</span>
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Digital Marketplace
                    </div>
                  </div>
                </Link>

                <p className="mt-4 max-w-sm text-sm font-medium leading-7 text-slate-500">
                  Tempat belanja produk digital yang cepat, aman, dan nyaman dipakai di semua
                  perangkat.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">
                    Proses Instan
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                    Aman
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                    Support 24/7
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-900">
                  Navigasi
                </h3>
                <div className="mt-4 space-y-3">
                  <Link
                    href="/"
                    className="block text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700"
                  >
                    Beranda
                  </Link>
                  <Link
                    href="/cek-pesanan"
                    className="block text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700"
                  >
                    Cek Pesanan
                  </Link>
                  <Link
                    href={primaryAccountHref}
                    className="block text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700"
                  >
                    {primaryAccountLabel}
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-900">
                  Kategori
                </h3>
                <div className="mt-4 space-y-3">
                  {categories.slice(1, 5).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className="block text-left text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-900">
                  Bantuan
                </h3>
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-500">
                    Pembayaran otomatis via QRIS
                  </p>
                  <p className="text-sm font-semibold text-slate-500">Pengiriman digital cepat</p>
                  <p className="text-sm font-semibold text-slate-500">
                    Layanan pelanggan responsif
                  </p>
                </div>

                <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white">
                      <i className="ri-customer-service-2-line" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        Butuh bantuan cepat?
                      </div>
                      <div className="mt-1 text-sm font-medium leading-6 text-slate-600">
                        Gunakan menu cek pesanan atau lanjut ke dashboard untuk memantau
                        transaksi.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-5 text-xs font-semibold text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>© 2026 PansaStore. Semua hak dilindungi.</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-shield-check-line text-emerald-700" />
                  Checkout aman
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-flashlight-line text-emerald-700" />
                  Pemrosesan cepat
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
          onClose={closeModal}
        />
      )}
    </>
  );
}
