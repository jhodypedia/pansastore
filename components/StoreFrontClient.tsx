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
  const isSyntheticVariant = !variant || variant.id === product.id;

  const params = new URLSearchParams();
  if (variant?.id && !isSyntheticVariant) {
    params.set("variantId", variant.id);
  }

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

const VALUE_POINTS = [
  {
    icon: "ri-flashlight-fill",
    title: "Serba Instan",
    desc: "Order diproses otomatis selama 24 jam dengan sistem yang stabil dan cepat.",
  },
  {
    icon: "ri-shield-check-fill",
    title: "Aman & Terpercaya",
    desc: "Checkout aman, metode pembayaran lengkap, dan dukungan transaksi yang rapi.",
  },
  {
    icon: "ri-stack-fill",
    title: "Paket Lengkap",
    desc: "Banyak pilihan paket, durasi, dan harga sehingga mudah disesuaikan kebutuhan.",
  },
] as const;

function TrustBar() {
  return (
    <section className="py-12 md:py-16 bg-white border-y border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {TRUST_STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{ animationDelay: `${i * 90}ms` }}
              className="reveal-card rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 md:p-6 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(5,150,105,0.08)] transition-all duration-300"
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
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 p-8 md:p-12 shadow-[0_30px_80px_-20px_rgba(6,78,59,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.14),transparent_26%)]" />
        <div className="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none animate-blob-float" />
        <div className="absolute -bottom-24 -left-12 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl pointer-events-none animate-blob-float-delay" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 mb-5 backdrop-blur">
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
              dengan checkout otomatis yang cepat, premium, dan aman.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-emerald-800 shadow-lg transition-all duration-300 hover:bg-yellow-300 hover:text-emerald-900 hover:scale-[1.03] active:scale-95"
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
          {TESTIMONIALS.map((t, i) => (
            <article
              key={t.name}
              style={{ animationDelay: `${i * 110}ms` }}
              className="reveal-card rounded-[28px] border border-slate-200 bg-white p-6 md:p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_20px_50px_rgba(5,150,105,0.08)]"
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

function WhyUsSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 md:gap-10 items-start">
          <div className="reveal-card rounded-[32px] border border-slate-200 bg-slate-950 p-7 md:p-10 text-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.55)] overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.12),transparent_24%)]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <i className="ri-vip-crown-2-fill text-yellow-300" />
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/80">
                  Super Store Experience
                </span>
              </div>

              <h2 className="mt-5 text-3xl md:text-5xl font-black leading-[1.06] tracking-tight">
                Store digital yang terasa cepat,
                <span className="text-emerald-300"> aman</span>, dan premium.
              </h2>

              <p className="mt-4 max-w-xl text-sm md:text-base leading-7 text-white/70 font-medium">
                Fokus kami bukan hanya harga murah, tetapi juga pengalaman belanja yang rapi,
                jelas, otomatis, dan nyaman dipakai kapan saja.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                    Uptime Service
                  </div>
                  <div className="mt-1 text-2xl font-black">99.9%</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                    Support
                  </div>
                  <div className="mt-1 text-2xl font-black">24/7</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {VALUE_POINTS.map((item, i) => (
              <article
                key={item.title}
                style={{ animationDelay: `${i * 90}ms` }}
                className="reveal-card rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_30px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-4">
                  <i className={`${item.icon} text-xl`} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500 font-medium">{item.desc}</p>
              </article>
            ))}
          </div>
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
    <article className="reveal-card group product-card-spotlight relative flex h-full flex-col overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-all duration-500 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-[0_28px_70px_rgba(5,150,105,0.12)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-[#D8B15D] to-emerald-600 opacity-90" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <ProductImage
          product={product}
          square
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/5 to-transparent" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.20),transparent_38%)]" />

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
  const [showCheckoutBar, setShowCheckoutBar] = useState(false);

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

  useEffect(() => {
    if (selectedVariant) {
      const timer = setTimeout(() => setShowCheckoutBar(true), 60);
      return () => clearTimeout(timer);
    }
    setShowCheckoutBar(false);
  }, [selectedVariant?.id]);

  const selectedPrice = selectedVariant?.price ?? product.sellPrice;
  const checkoutHref = getProductHref(product, selectedVariant);
  const variantList = product.variants && product.variants.length > 0 ? product.variants : [];
  const hasVariants = variantList.length > 0;
  const canCheckout = !hasVariants || showCheckoutBar;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="modal-backdrop absolute inset-0 bg-slate-950/75 backdrop-blur-md"
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
          className="modal-panel relative flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] outline-none sm:h-auto sm:max-h-[92vh] sm:rounded-[32px]"
        >
          <div className="absolute left-1/2 top-3 z-20 h-1.5 w-12 -translate-x-1/2 rounded-full bg-slate-200 sm:hidden" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail produk"
            className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-900/75 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-slate-900"
          >
            <i className="ri-close-line text-lg" />
          </button>

          <div className="modal-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr]">
              <div className="relative min-h-[260px] overflow-hidden lg:min-h-[560px]">
                <ProductImage product={product} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent lg:bg-gradient-to-r lg:from-slate-950/10 lg:via-transparent lg:to-transparent" />
                <div className="shine-sweep absolute inset-0" />

                <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-6">
                  <span className="chip-pop inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]">
                    <i className="ri-shield-check-fill text-emerald-300" />
                    Checkout Aman · PansaStore
                  </span>
                  <h3 id={titleId} className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                    {product.name}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-white/80">
                    {product.description ||
                      "Produk digital resmi dengan pengiriman instan, pembayaran aman, dan pemrosesan otomatis selama 24 jam."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col px-4 py-5 sm:px-5 sm:py-6 md:px-6">
                <div className="mb-5 flex flex-wrap gap-2">
                  {[
                    { icon: "ri-flashlight-line", label: "Proses Instan" },
                    { icon: "ri-shield-check-line", label: "Bergaransi" },
                    { icon: "ri-customer-service-2-line", label: "Support 24/7" },
                  ].map((chip, i) => (
                    <div
                      key={chip.label}
                      style={{ animationDelay: `${i * 80}ms` }}
                      className="chip-pop inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5"
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
                    {hasVariants && (
                      <p className="text-[11px] font-bold text-slate-400">
                        {variantList.length} pilihan tersedia
                      </p>
                    )}
                  </div>

                  {hasVariants ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {variantList.map((variant, index) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        const outOfStock = variant.stock <= 0;

                        return (
                          <button
                            key={`${variant.productId || product.id}-${variant.id}`}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => onSelectVariant(variant)}
                            style={{ animationDelay: `${index * 60}ms` }}
                            className={`variant-pop w-full rounded-[24px] border p-4 text-left transition-all duration-300 ${
                              isSelected
                                ? "scale-[1.02] border-emerald-600 bg-emerald-50 shadow-[0_0_0_4px_rgba(5,150,105,0.10)]"
                                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
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
                                <i className="ri-checkbox-circle-fill checkmark-pop shrink-0 text-xl text-emerald-600" />
                              ) : (
                                <i className="ri-checkbox-blank-circle-line shrink-0 text-xl text-slate-300 transition-colors" />
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

                  {hasVariants && !selectedVariant && (
                    <p className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-600">
                      <i className="ri-information-line" />
                      Pilih salah satu paket di atas untuk melanjutkan checkout.
                    </p>
                  )}
                </div>

                <div className="h-4 shrink-0 lg:hidden" />
              </div>
            </div>
          </div>

          <div className="safe-bottom shrink-0 border-t border-slate-100 bg-white p-4 sm:p-5">
            <div
              className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                canCheckout ? "mb-4 max-h-40 opacity-100" : "mb-0 max-h-0 opacity-0"
              }`}
            >
              <div className="rounded-[24px] bg-slate-900 px-5 py-4 text-white">
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
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-200"
              >
                Tutup
              </button>

              {canCheckout ? (
                <Link
                  href={checkoutHref}
                  className="checkout-btn-pop inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-600 hover:shadow-lg active:scale-[0.98]"
                >
                  <i className="ri-lightning-fill" />
                  Lanjut ke Checkout
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-black text-slate-400"
                >
                  Pilih paket dahulu
                </button>
              )}
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
  const [mouseGlow, setMouseGlow] = useState({ x: 50, y: 20 });
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
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f8fafc; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 28s linear infinite; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeUp 0.7s ease-out forwards; }
        .animate-fade-up-delay { animation: fadeUp 0.7s 0.12s ease-out both; }
        .animate-fade-up-delay2 { animation: fadeUp 0.7s 0.24s ease-out both; }
        .animate-fade-up-delay3 { animation: fadeUp 0.7s 0.36s ease-out both; }

        .reveal-card { transition: opacity 0.6s ease, transform 0.6s ease; }

        .glass-edge {
          box-shadow:
            0 1px 0 rgba(255,255,255,0.7) inset,
            0 10px 30px rgba(15,23,42,0.06);
        }

        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-14px, 18px) scale(1.06); }
        }
        .animate-blob-float { animation: blobFloat 8s ease-in-out infinite; }
        .animate-blob-float-delay { animation: blobFloat 10s ease-in-out 1.2s infinite; }

        @keyframes shineSweep {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          20% { opacity: .08; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }
        .shine-sweep::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0.26) 50%, transparent 55%);
          animation: shineSweep 5.5s linear infinite;
        }

        @keyframes chipPop {
          from { opacity: 0; transform: translateY(10px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chip-pop { animation: chipPop .45s ease both; }

        @keyframes variantPop {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .variant-pop { animation: variantPop .4s ease both; }

        @keyframes checkPop {
          0% { transform: scale(.7); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .checkmark-pop { animation: checkPop .28s ease; }

        @keyframes checkoutPop {
          from { opacity: 0; transform: translateY(8px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .checkout-btn-pop { animation: checkoutPop .35s ease both; }

        .modal-backdrop { animation: fadeUp .25s ease-out both; }
        .modal-panel { animation: fadeUp .32s cubic-bezier(0.16,1,0.3,1) both; }

        .safe-bottom { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }

        .hero-grid {
          background-image:
            linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 88%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 88%);
        }

        .spotlight-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at var(--mx,50%) var(--my,20%), rgba(255,255,255,0.22), transparent 22%),
            radial-gradient(circle at 80% 12%, rgba(250,204,21,0.12), transparent 18%),
            radial-gradient(circle at 18% 80%, rgba(16,185,129,0.14), transparent 22%);
          pointer-events: none;
        }

        .product-card-spotlight::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity .35s ease;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.35), transparent 34%);
          pointer-events: none;
        }
        .product-card-spotlight:hover::before { opacity: 1; }

        @media (prefers-reduced-motion: reduce) {
          .animate-marquee,
          .animate-blob-float,
          .animate-blob-float-delay,
          .shine-sweep::before,
          .chip-pop,
          .variant-pop,
          .checkmark-pop,
          .checkout-btn-pop,
          .animate-fade-up,
          .animate-fade-up-delay,
          .animate-fade-up-delay2,
          .animate-fade-up-delay3 {
            animation: none !important;
          }
          .reveal-card,
          .modal-panel,
          .modal-backdrop {
            transition: none !important;
          }
        }
      `}</style>

      <div className="relative overflow-hidden bg-slate-50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_48%)]" />
          <div className="absolute left-0 top-24 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
          <div className="absolute right-0 top-12 h-80 w-80 rounded-full bg-yellow-200/20 blur-3xl" />
        </div>

        <header
          className={`sticky top-0 z-40 transition-all duration-300 ${
            isScrolled
              ? "border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
              : "bg-transparent"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between py-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white shadow-[0_12px_30px_rgba(5,150,105,0.28)]">
                  <i className="ri-store-3-fill text-xl" />
                </div>
                <div>
                  <div className="text-base font-black tracking-tight text-slate-900">PansaStore</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Super Digital Store
                  </div>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2 py-2 backdrop-blur glass-edge">
                {["Promo", "Populer", "Kategori", "Testimoni"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {item}
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={primaryAccountHref}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <i className="ri-user-line" />
                  {primaryAccountLabel}
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section
          className="relative"
          onMouseMove={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setMouseGlow({ x, y });
          }}
        >
          <div className="hero-grid absolute inset-0 pointer-events-none" />
          <div
            className="spotlight-shell absolute inset-0 pointer-events-none"
            style={
              {
                ["--mx" as any]: `${mouseGlow.x}%`,
                ["--my" as any]: `${mouseGlow.y}%`,
              } as React.CSSProperties
            }
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 md:pt-16 pb-10 md:pb-16 relative z-10">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 backdrop-blur glass-edge animate-fade-up">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                    Store Otomatis • Aman • Premium
                  </span>
                </div>

                <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.96] text-slate-950 animate-fade-up-delay">
                  Belanja Produk
                  <span className="block text-emerald-700">Digital Super Cepat</span>
                  <span className="block">Dengan Vibe Premium</span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm sm:text-base md:text-lg leading-8 text-slate-600 font-medium animate-fade-up-delay2">
                  PansaStore menghadirkan pengalaman belanja digital yang instan, aman,
                  dan terasa seperti super store modern — lengkap dengan banyak pilihan paket,
                  pembayaran cepat, dan pemrosesan otomatis 24/7.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3 animate-fade-up-delay3">
                  <a
                    href="#katalog"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(5,150,105,0.26)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-600"
                  >
                    <i className="ri-flashlight-fill" />
                    Jelajahi Katalog
                  </a>
                  <Link
                    href={primaryAccountHref}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-800 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <i className="ri-dashboard-line" />
                    {primaryAccountLabel}
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {[
                    "QRIS & metode pembayaran lengkap",
                    "Checkout cepat dan otomatis",
                    "Cocok untuk user & reseller",
                  ].map((point) => (
                    <div
                      key={point}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-xs font-bold text-slate-700 backdrop-blur glass-edge"
                    >
                      <i className="ri-check-line text-emerald-700" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative animate-fade-up-delay2">
                <div className="relative rounded-[36px] border border-white/60 bg-white/70 p-4 sm:p-5 backdrop-blur-xl shadow-[0_30px_80px_-28px_rgba(15,23,42,0.25)] glass-edge">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-[28px] bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white relative overflow-hidden">
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                        Live Metrics
                      </div>
                      <div className="mt-3 text-3xl font-black">99.9%</div>
                      <div className="mt-1 text-sm font-medium text-white/70">Uptime Sistem</div>
                    </div>

                    <div className="rounded-[28px] bg-gradient-to-br from-emerald-50 to-white p-5 border border-emerald-100">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700/70">
                        Proses
                      </div>
                      <div className="mt-3 text-3xl font-black text-slate-900">&lt; 3s</div>
                      <div className="mt-1 text-sm font-medium text-slate-500">Rata-rata transaksi</div>
                    </div>

                    <div className="col-span-2 rounded-[30px] border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Kategori Populer
                          </div>
                          <div className="mt-2 text-xl font-black text-slate-900">
                            Games, Voucher, Premium App
                          </div>
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg">
                          <i className="ri-vip-diamond-fill text-2xl" />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        {[
                          ["Aman", "Pembayaran"],
                          ["Cepat", "Checkout"],
                          ["Lengkap", "Pilihan"],
                        ].map(([a, b]) => (
                          <div key={a} className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3 text-center">
                            <div className="text-sm font-black text-slate-900">{a}</div>
                            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{b}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -left-4 top-8 hidden md:block rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                      <i className="ri-shield-check-fill text-xl" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">Checkout Aman</div>
                      <div className="text-[11px] font-medium text-slate-500">Transaksi terenkripsi</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-4 bottom-10 hidden md:block rounded-2xl border border-yellow-100 bg-white px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
                      <i className="ri-flashlight-fill text-xl" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">Instant Delivery</div>
                      <div className="text-[11px] font-medium text-slate-500">Cepat & otomatis</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 backdrop-blur glass-edge">
              <div className="flex min-w-max animate-marquee gap-10 whitespace-nowrap px-6 py-4">
                {MARQUEE_ITEMS.map((item, idx) => (
                  <div key={`${item}-${idx}`} className="text-sm font-black tracking-wide text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <TrustBar />
        <WhyUsSection />

        <section id="katalog" className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-8 md:mb-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 mb-4">
                  <i className="ri-store-2-fill text-sm text-emerald-700" />
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                    Katalog Produk
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 leading-tight">
                  Temukan paket terbaik
                  <br className="hidden md:block" />
                  untuk kebutuhan digital Anda
                </h2>
                <p className="mt-3 max-w-2xl text-sm md:text-base leading-7 text-slate-500 font-medium">
                  Cari produk favorit, pilih kategori, lalu checkout dalam beberapa klik.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.05)] w-full max-w-xl">
                <div className="flex items-center gap-3 px-3">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <i className="ri-search-2-line text-xl" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari game, voucher, premium app, atau nama paket..."
                    className="w-full bg-transparent py-4 outline-none text-sm md:text-base font-semibold text-slate-900 placeholder:text-slate-400"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="h-10 w-10 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      aria-label="Reset pencarian"
                    >
                      <i className="ri-close-line text-xl" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="sticky top-[76px] z-20 mb-8">
              <div className="hide-scrollbar overflow-x-auto rounded-[26px] border border-slate-200 bg-white/85 p-2 backdrop-blur-xl shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
                <div className="flex w-max gap-2">
                  {categories.map((category) => {
                    const active = activeCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={`rounded-2xl px-4 py-3 text-sm font-black transition-all duration-300 ${
                          active
                            ? "bg-emerald-700 text-white shadow-[0_14px_30px_rgba(5,150,105,0.22)]"
                            : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm font-bold text-slate-500">
                Menampilkan <span className="text-slate-900">{filteredProducts.length}</span> produk
                {activeCategory !== "SEMUA" ? (
                  <> di kategori <span className="text-emerald-700">{activeCategory}</span></>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Top Seller",
                  "Auto Process",
                  "Harga Kompetitif",
                ].map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600"
                  >
                    <i className="ri-sparkling-2-fill text-emerald-700" />
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-10 md:p-16 text-center shadow-sm">
                <div className="mx-auto mb-5 h-20 w-20 rounded-[26px] bg-slate-100 flex items-center justify-center text-slate-400">
                  <i className="ri-search-eye-line text-4xl" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                  Produk tidak ditemukan
                </h3>
                <p className="mt-3 max-w-xl mx-auto text-sm md:text-base leading-7 text-slate-500 font-medium">
                  Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat produk yang tersedia.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("SEMUA");
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-black text-white transition-all hover:bg-emerald-700"
                >
                  <i className="ri-refresh-line" />
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onOpen={openProductDetail} />
                ))}
              </div>
            )}
          </div>
        </section>

        <PromoBanner />
        <TestimonialsSection />

        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="rounded-[36px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 md:p-12 text-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.55)] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.10),transparent_24%)]" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    <i className="ri-award-fill text-yellow-300" />
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/80">
                      Premium Commerce Experience
                    </span>
                  </div>
                  <h2 className="mt-5 text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
                    Siap belanja digital
                    <br className="hidden md:block" />
                    dengan rasa super store?
                  </h2>
                  <p className="mt-4 text-sm md:text-base leading-7 text-white/70 font-medium">
                    Jelajahi katalog, pilih paket yang paling cocok, dan nikmati checkout yang cepat,
                    modern, serta meyakinkan dari awal sampai selesai.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="#katalog"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-900 transition-all hover:bg-yellow-300"
                  >
                    <i className="ri-shopping-bag-3-fill" />
                    Mulai Belanja
                  </a>
                  <Link
                    href={primaryAccountHref}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-sm font-black text-white backdrop-blur transition-all hover:bg-white/10"
                  >
                    <i className="ri-user-line" />
                    {primaryAccountLabel}
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

        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 md:hidden">
          <a
            href="#katalog"
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-[0_20px_40px_rgba(15,23,42,0.28)]"
          >
            <i className="ri-search-eye-line" />
            Jelajahi Produk Sekarang
          </a>
        </div>
      </div>
    </>
  );
}
