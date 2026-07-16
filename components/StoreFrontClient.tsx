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

  if (!productId) return "#";

  const params = new URLSearchParams();
  if (variant?.id) params.set("variant", variant.id);

  const qs = params.toString();
  return `/checkout/${encodeURIComponent(productId)}${qs ? `?${qs}` : ""}`;
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
      <span className="text-2xl md:text-5xl font-black tracking-tighter drop-shadow-md opacity-90">
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
    <article className="reveal-card group relative rounded-[22px] sm:rounded-[30px] border border-slate-200 bg-white overflow-hidden shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(5,150,105,0.08)] hover:border-emerald-200 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-[#C8A24D] to-emerald-600 opacity-90" />

      <div className="relative aspect-[1/1] sm:aspect-[4/3] overflow-hidden bg-slate-100">
        <ProductImage
          product={product}
          square
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap gap-1.5 sm:top-4 sm:left-4 sm:right-4 sm:gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm">
            <i className="ri-price-tag-3-fill text-emerald-700" />
            {product.category || "Katalog"}
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.12em] shadow-sm ${
              inStock
                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                : "bg-rose-50 text-rose-700 border border-rose-100"
            }`}
          >
            <i className={inStock ? "ri-checkbox-circle-fill" : "ri-close-circle-fill"} />
            {inStock ? "Ready" : "Habis"}
          </span>
        </div>

        <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-3 text-white">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] font-black text-white/70 mb-1">
              Harga mulai
            </div>
            <div className="text-base sm:text-2xl font-black tracking-tight">
              <span className="text-[10px] sm:text-sm mr-1 text-white/70">Rp</span>
              {formatPrice(startingPrice)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3.5 sm:p-5 md:p-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-[15px] sm:text-lg md:text-xl font-black tracking-tight text-slate-900 leading-tight line-clamp-2">
              {product.name}
            </h3>
            <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700/80 mt-1">
              {product.type || previewVariant?.type || "Produk Digital"}
            </p>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 px-2.5 py-2 text-right shrink-0">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] font-black text-slate-400">
              Paket
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-900">{variantCount || 1}</div>
          </div>
        </div>

        <p className="hidden sm:block text-sm leading-7 font-medium text-slate-500 line-clamp-3 min-h-[84px]">
          {product.description ||
            "Produk digital resmi dengan pengiriman cepat, aman, dan otomatis selama 24 jam."}
        </p>

        <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 p-2 sm:p-3">
            <div className="text-[8px] sm:text-[10px] uppercase tracking-[0.12em] font-black text-slate-400 mb-1">
              Varian
            </div>
            <div className="text-[10px] sm:text-xs font-black text-slate-800">{variantCount || 1}</div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 p-2 sm:p-3">
            <div className="text-[8px] sm:text-[10px] uppercase tracking-[0.12em] font-black text-slate-400 mb-1">
              Garansi
            </div>
            <div className="text-[10px] sm:text-xs font-black text-slate-800 truncate">
              {previewVariant?.warranty || "-"}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 p-2 sm:p-3">
            <div className="text-[8px] sm:text-[10px] uppercase tracking-[0.12em] font-black text-slate-400 mb-1">
              Stok
            </div>
            <div className="text-[10px] sm:text-xs font-black text-slate-800">{product.stock}</div>
          </div>
        </div>

        <div className="mt-4 sm:mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={() => onOpen(product)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-slate-900 px-3 py-3 sm:px-4 sm:py-3.5 text-[11px] sm:text-sm font-black text-white transition-all duration-300 hover:bg-emerald-800 active:scale-[0.98]"
          >
            <i className="ri-eye-line" />
            Lihat Detail
          </button>

          <Link
            href={getProductHref(product, previewVariant)}
            className="inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 sm:px-4 sm:py-3.5 text-[11px] sm:text-sm font-black text-emerald-800 transition-all duration-300 hover:bg-emerald-100"
          >
            <i className="ri-shopping-bag-3-line" />
            Beli
          </Link>
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

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollYRef.current);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const selectedPrice = selectedVariant?.price ?? product.sellPrice;
  const checkoutHref = getProductHref(product, selectedVariant);
  const isAvailable = (selectedVariant?.stock ?? product.stock) > 0;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-md" onClick={onClose} />

      <div className="absolute inset-0 overflow-hidden">
        <div className="min-h-full flex items-end justify-center sm:items-center sm:p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="relative w-full max-w-5xl h-[92dvh] sm:h-auto sm:max-h-[92dvh] overflow-hidden rounded-t-[28px] sm:rounded-[32px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] outline-none"
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200 sm:hidden z-10" />

            <div className="grid h-full grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative hidden lg:block min-h-[680px] overflow-hidden">
                <ProductImage product={product} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />

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
                    <i className="ri-shield-check-fill text-emerald-300" />
                    Checkout Aman · PansaStore
                  </span>
                  <h3 id={titleId} className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                    {product.name}
                  </h3>
                  <p
                    id={descId}
                    className="mt-3 max-w-xl text-sm md:text-base font-medium leading-7 text-white/80"
                  >
                    {product.description ||
                      "Produk digital resmi dengan pengiriman instan, pembayaran aman, dan pemrosesan otomatis selama 24 jam."}
                  </p>
                </div>
              </div>

              <div className="flex min-h-0 flex-col">
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-4 sm:p-5 lg:hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] mb-3 text-emerald-800">
                        <i className="ri-shield-check-fill text-emerald-700" />
                        Checkout Aman
                      </span>
                      <h3 id={titleId} className="text-xl font-black tracking-tight text-slate-900 leading-tight">
                        {product.name}
                      </h3>
                      <p
                        id={descId}
                        className="mt-2 text-sm font-medium leading-7 text-slate-500"
                      >
                        {product.description ||
                          "Produk digital resmi dengan pengiriman instan, pembayaran aman, dan pemrosesan otomatis selama 24 jam."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Tutup detail produk"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                    >
                      <i className="ri-close-line text-lg" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 md:p-6">
                  <div className="flex flex-wrap gap-2 mb-5">
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
                        {product.variants?.length || 1} pilihan tersedia
                      </p>
                    </div>

                    {product.variants && product.variants.length > 0 ? (
                      <div className="space-y-3 pb-2">
                        {product.variants.map((variant) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const outOfStock = variant.stock <= 0;

                          return (
                            <button
                              key={`${variant.productId || product.id}-${variant.id}`}
                              type="button"
                              disabled={outOfStock}
                              onClick={() => onSelectVariant(variant)}
                              className={`w-full text-left rounded-[22px] sm:rounded-[24px] border p-4 transition-all ${
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
                                  <div className="text-lg sm:text-xl font-black tracking-tight text-emerald-800">
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

                <div className="border-t border-slate-100 bg-white p-4 sm:p-5 sticky bottom-0">
                  <div className="rounded-[24px] bg-slate-900 px-5 py-4 text-white mb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.14em] font-black text-white/55">
                          Total Pembayaran
                        </div>
                        <div className="text-2xl sm:text-3xl font-black tracking-tight">
                          <span className="text-sm mr-1 text-white/60">Rp</span>
                          {formatPrice(selectedPrice)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.14em] font-black text-white/55">
                          Status
                        </div>
                        <div className={`text-sm font-black ${isAvailable ? "text-emerald-300" : "text-rose-300"}`}>
                          {isAvailable ? "Siap diproses" : "Tidak tersedia"}
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
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white transition-colors ${
                        isAvailable ? "bg-emerald-700 hover:bg-emerald-600" : "pointer-events-none bg-slate-300"
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
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white shadow-lg shadow-emerald-900/20">
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
            </div>

            <p className="max-w-md text-sm font-medium leading-7 text-slate-500">
              Marketplace digital dengan proses cepat, tampilan produk yang rapi,
              dan checkout yang dibuat nyaman untuk mobile maupun desktop.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 mb-4">
              Navigasi
            </div>
            <div className="space-y-3">
              <Link href="/" className="block text-sm font-bold text-slate-600 hover:text-emerald-700 transition-colors">
                Beranda
              </Link>
              <Link href="/cek-pesanan" className="block text-sm font-bold text-slate-600 hover:text-emerald-700 transition-colors">
                Cek Pesanan
              </Link>
              <Link href="/login" className="block text-sm font-bold text-slate-600 hover:text-emerald-700 transition-colors">
                Masuk
              </Link>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 mb-4">
              Layanan
            </div>
            <div className="space-y-3 text-sm font-medium text-slate-500 leading-7">
              <p>Produk digital resmi.</p>
              <p>Checkout cepat dan aman.</p>
              <p>Dukungan pelanggan 24/7.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-400">
            © {new Date().getFullYear()} PansaStore. All rights reserved.
          </div>
          <div className="text-sm font-semibold text-slate-400">
            Built for fast digital checkout
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
        className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-slate-900"
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

        <section className="relative overflow-hidden bg-white px-4 pt-[150px] md:pt-[180px] pb-14 md:pb-20">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.025)_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:radial-gradient(ellipse_72%_82%_at_50%_48%,#000_60%,transparent_100%)] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] md:w-[820px] h-[280px] md:h-[420px] bg-gradient-to-b from-emerald-100/80 via-emerald-50/40 to-transparent rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-end">
              <div>
                <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-6">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                    Platform top up & produk digital terpercaya
                  </span>
                </div>

                <h1 className="animate-fade-up-delay text-[2.5rem] sm:text-5xl md:text-[5.2rem] font-black tracking-tight leading-[1.02] text-slate-900 mb-5">
                  Top up instan,
                  <br />
                  harga hemat,
                  <br />
                  transaksi aman.
                </h1>

                <p className="animate-fade-up-delay2 max-w-2xl text-sm md:text-xl font-semibold leading-relaxed text-slate-500 mb-8 md:mb-10">
                  Nikmati pengalaman belanja produk digital yang cepat, modern, dan terpercaya
                  dengan proses otomatis 24 jam.
                </p>

                <div className="animate-fade-up-delay3 max-w-2xl relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 md:pl-6 flex items-center pointer-events-none z-10">
                    <i className="ri-search-2-line text-slate-400 text-xl md:text-2xl transition-colors duration-300 group-focus-within:text-emerald-700" />
                  </div>

                  <input
                    type="text"
                    placeholder="Cari game, voucher, akun premium, atau layanan digital..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-[28px] border-2 border-slate-200 bg-white pl-14 pr-12 py-4 md:pl-16 md:py-5 text-sm md:text-base font-semibold text-slate-900 placeholder:text-slate-400 shadow-[0_18px_50px_rgba(15,23,42,0.06)] glass-edge transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600"
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

              <div className="animate-fade-up-delay3 hidden lg:block">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[28px] border border-slate-200 bg-white/90 backdrop-blur-sm p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <i className="ri-flashlight-fill text-emerald-700 text-xl" />
                    </div>
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-1">
                      Proses Super Cepat
                    </div>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      Pembayaran diverifikasi otomatis dan pesanan diproses real-time.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white/90 backdrop-blur-sm p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <i className="ri-shield-check-fill text-emerald-700 text-xl" />
                    </div>
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-1">
                      Aman & Bergaransi
                    </div>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      Transaksi terlindungi dan semua produk ditampilkan dengan detail jelas.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white/90 backdrop-blur-sm p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <i className="ri-layout-grid-fill text-emerald-700 text-xl" />
                    </div>
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-1">
                      Katalog Rapi
                    </div>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      Produk dikelompokkan agar pilihan paket lebih mudah dibandingkan.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white/90 backdrop-blur-sm p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <i className="ri-customer-service-2-fill text-emerald-700 text-xl" />
                    </div>
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-1">
                      Support 24/7
                    </div>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      Tim siap membantu kapan pun kamu butuh bantuan transaksi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TrustBar />
        <PromoBanner />

        <section className="py-14 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 md:mb-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-4">
                  <i className="ri-store-3-fill text-sm text-emerald-700" />
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                    Pilihan Produk
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                  Temukan Produk
                  <br className="hidden md:block" />
                  Favoritmu Sekarang
                </h2>
                <div className="mt-3 h-1.5 w-28 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300" />
              </div>

              <div className="text-sm font-bold text-slate-400">
                {filteredProducts.length} produk ditemukan
              </div>
            </div>

            <div className="hide-scrollbar overflow-x-auto -mx-4 px-4 mb-8">
              <div className="flex gap-3 min-w-max">
                {categories.map((category) => {
                  const isActive = activeCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`px-4 py-3 rounded-full text-sm font-black transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-[0_16px_30px_rgba(15,23,42,0.12)]"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 md:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onOpen={openProductDetail} />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <i className="ri-search-line text-2xl text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                  Produk tidak ditemukan
                </h3>
                <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-7">
                  Coba gunakan kata kunci lain atau pilih kategori berbeda untuk menemukan produk yang Anda cari.
                </p>
              </div>
            )}
          </div>
        </section>

        <TestimonialsSection />
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
