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
    .replace(/\b(private|sharing|lifetime|garansi|official|premium|akun|account|member|voucher)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return base || cleaned;
};

const prettifyBaseName = (name: string) =>
  name
    .replace(/\b\d+\s*(Hari|Bulan|Tahun|Minggu)\b/gi, "")
    .replace(/\b(Private|Sharing|Lifetime|Garansi|Official|Premium|Akun|Account|Member|Voucher)\b/gi, "")
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

  return Array.from(grouped.entries()).map(([baseName, items]) => {
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
  "🔒 Transaksi Aman 256-bit SSL",
  "🎮 Games & Digital Lengkap",
  "🌙 Layanan 24/7 Nonstop",
  "💳 Multi Payment Method",
  "✅ 120 Ribu+ Transaksi Sukses",
  "⚡ Proses Instan",
  "🔒 Transaksi Aman 256-bit SSL",
  "🎮 Games & Digital Lengkap",
  "🌙 Layanan 24/7 Nonstop",
  "💳 Multi Payment Method",
  "✅ 120 Ribu+ Transaksi Sukses",
] as const;

function TrustBar() {
  return (
    <section className="py-12 md:py-16 bg-white border-y border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {TRUST_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center group">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-800 group-hover:border-emerald-800 transition-all duration-300 shadow-sm">
                <i className={`${stat.icon} text-emerald-700 text-xl md:text-2xl group-hover:text-white transition-colors duration-300`} />
              </div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
              <div className="text-[11px] md:text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-900/20">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 right-32 w-20 h-20 rounded-full bg-emerald-500/20 pointer-events-none" />

        <div className="relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300" />
            </span>
            <span className="text-white/90 text-[10px] font-black tracking-widest uppercase">Promo Spesial Hari Ini</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">
            Diskon Hingga <span className="text-yellow-300">30%</span>
            <br className="hidden md:block" />
            untuk Member Baru!
          </h2>

          <p className="text-emerald-100/80 text-sm font-medium max-w-sm">
            Daftar sekarang dan nikmati harga spesial untuk semua kategori produk digital.
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-center md:items-end gap-3">
          <Link
            href="/register"
            className="bg-white text-emerald-800 px-8 py-3.5 rounded-2xl text-sm font-black hover:bg-yellow-300 hover:text-emerald-900 active:scale-95 transition-all duration-300 shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ri-user-add-fill" /> Daftar Gratis Sekarang
          </Link>
          <p className="text-emerald-200/60 text-[10px] font-semibold flex items-center gap-1">
            <i className="ri-shield-check-line" /> Tidak perlu kartu kredit
          </p>
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
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2 mb-4">
            <i className="ri-star-smile-fill text-emerald-700 text-sm" />
            <span className="text-emerald-800 text-[11px] font-black tracking-widest uppercase">Testimoni Pelanggan</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
            Dipercaya Puluhan Ribu
            <br className="hidden md:block" />
            Pelanggan Aktif
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white border border-slate-200 rounded-3xl p-6 md:p-7 flex flex-col gap-4 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center gap-1 text-yellow-400">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <i key={j} className="ri-star-fill text-sm" />
                ))}
              </div>

              <p className="text-slate-600 text-sm font-medium leading-relaxed flex-1">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${t.color[0]}, ${t.color[1]})` }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">{t.name}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">{t.role}</div>
                </div>
                <div className="ml-auto">
                  <i className="ri-verified-badge-fill text-emerald-600 text-lg" />
                </div>
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
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4"
      aria-hidden={false}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-2xl bg-white flex flex-col rounded-t-[28px] sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden outline-none"
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200 sm:hidden z-10" />

        <div className="relative w-full h-52 sm:h-60 overflow-hidden flex-shrink-0">
          <ProductImage product={product} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail produk"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white/25 transition-colors z-20"
          >
            <i className="ri-close-line text-lg" />
          </button>

          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <i className="ri-shield-check-fill text-emerald-400 text-sm" />
            <span className="text-white/85 text-[11px] font-bold">
              Transaksi dijamin aman · PansaStore
            </span>
          </div>

          <div className="absolute bottom-10 left-4 right-14">
            <span className="inline-block bg-white/15 backdrop-blur-md border border-white/25 text-white text-[9px] font-black tracking-[0.12em] uppercase px-2.5 py-1 rounded-lg mb-2">
              {product.category || "Katalog"}
            </span>
            <h3
              id={titleId}
              className="text-white text-xl sm:text-2xl font-black tracking-tight leading-tight"
            >
              {product.name}
            </h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 min-h-0">
          <div className="flex flex-wrap gap-2">
            {[
              { icon: "ri-flashlight-line", label: "Proses Instan" },
              { icon: "ri-shield-check-line", label: "Bergaransi" },
              { icon: "ri-customer-service-2-line", label: "24/7 Support" },
            ].map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5"
              >
                <i className={`${chip.icon} text-emerald-700 text-xs`} />
                <span className="text-emerald-900 text-[11px] font-bold">{chip.label}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 tracking-[0.12em] uppercase mb-2">
              Deskripsi
            </p>
            <p className="text-sm text-slate-600 font-medium leading-7 bg-slate-50 border border-slate-100 rounded-2xl p-4">
              {product.description ||
                "Produk digital resmi dengan pengiriman instan setelah konfirmasi pembayaran. Dijamin valid dan diproses otomatis selama 24 jam."}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 tracking-[0.12em] uppercase mb-3">
              Pilih Paket
            </p>

            {product.variants && product.variants.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const outOfStock = variant.stock <= 0;

                  return (
                    <button
                      key={`${variant.productId || product.id}-${variant.id}`}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => onSelectVariant(variant)}
                      className={`text-left rounded-2xl p-4 border transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 shadow-[0_0_0_4px_rgba(5,150,105,0.08)]"
                          : "border-slate-200 bg-white hover:border-emerald-300"
                      } ${outOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-black text-slate-900 leading-snug">
                          {variant.name}
                        </span>
                        {isSelected && (
                          <i className="ri-checkbox-circle-fill text-emerald-600 text-lg shrink-0" />
                        )}
                      </div>

                      <div className="text-xs text-emerald-700 font-bold mt-2">{variant.duration}</div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {variant.type}
                        </span>
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-md">
                          Garansi {variant.warranty}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Harga
                          </div>
                          <div className="text-emerald-800 font-black text-lg tracking-tight">
                            <span className="text-xs mr-1">Rp</span>
                            {formatPrice(variant.price)}
                          </div>
                        </div>

                        <div
                          className={`text-[10px] font-bold ${
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Produk tanpa varian</div>
                <div className="text-slate-500 text-sm mt-1">
                  Harga mulai dari Rp{formatPrice(product.sellPrice)}.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">
                Total
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                <span className="text-sm mr-1 text-slate-500">Rp</span>
                {formatPrice(selectedPrice)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">
                Status
              </div>
              <div className="text-sm font-bold text-emerald-700">
                {selectedVariant?.stock === 0 ? "Tidak tersedia" : "Siap diproses"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black transition-colors"
            >
              Tutup
            </button>

            <Link
              href={checkoutHref}
              className="w-full rounded-2xl px-5 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-black transition-colors text-center flex items-center justify-center gap-2"
            >
              <i className="ri-lightning-fill" />
              Lanjut ke Checkout
            </Link>
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
    if (window.innerWidth < 768) return;

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
        .animate-marquee { animation: marquee 28s linear infinite; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeUp 0.7s ease-out forwards; }
        .animate-fade-up-delay { animation: fadeUp 0.7s 0.15s ease-out both; }
        .animate-fade-up-delay2 { animation: fadeUp 0.7s 0.3s ease-out both; }
        .animate-fade-up-delay3 { animation: fadeUp 0.7s 0.45s ease-out both; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-hover:hover .shimmer-inner {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 1s ease-in-out;
        }

        .reveal-card {
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-marquee,
          .animate-fade-up,
          .animate-fade-up-delay,
          .animate-fade-up-delay2,
          .animate-fade-up-delay3 { animation: none; }
          .reveal-card { opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <div
        className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-x-hidden"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <header className="fixed top-0 inset-x-0 z-50">
          <div
            className={`bg-emerald-800 overflow-hidden transition-all duration-300 ease-out ${
              isScrolled ? "h-0 py-0 opacity-0" : "h-auto py-2.5 opacity-100"
            }`}
            style={{ willChange: "height, opacity" }}
          >
            <div className="flex gap-8 animate-marquee whitespace-nowrap w-max select-none">
              {MARQUEE_ITEMS.map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  className="text-emerald-100 text-[11px] font-bold tracking-widest uppercase flex items-center gap-2"
                >
                  {item}
                  <span className="text-emerald-500 mx-2">•</span>
                </span>
              ))}
            </div>
          </div>

          <nav
            className={`inset-x-0 transition-all duration-300 ease-out ${
              isScrolled
                ? "bg-white border-b border-slate-200 py-3 shadow-sm"
                : "bg-white/95 backdrop-blur-xl py-4 md:py-5"
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-900/20 group-hover:shadow-emerald-900/30 transition-shadow shrink-0">
                  <i className="ri-store-2-fill text-base md:text-lg" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-black text-base md:text-lg tracking-tight text-slate-900">
                    Pansa<span className="text-emerald-700">Store</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                    Digital Marketplace
                  </span>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <Link href="/" className="text-sm font-bold text-slate-500 hover:text-emerald-700 transition-colors">
                  Beranda
                </Link>
                <Link
                  href="/cek-pesanan"
                  className="text-sm font-bold text-slate-500 hover:text-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <i className="ri-search-eye-line" /> Cek Pesanan
                </Link>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <Link
                  href="/cek-pesanan"
                  className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                  aria-label="Cek pesanan"
                >
                  <i className="ri-search-eye-line text-base" />
                </Link>

                <Link
                  href={primaryAccountHref}
                  className="bg-slate-900 hover:bg-emerald-800 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all duration-300 shadow-sm flex items-center gap-2 active:scale-95"
                >
                  <i className={`${isLoggedIn ? "ri-dashboard-line" : "ri-user-3-line"} text-sm`} />
                  <span className="hidden sm:inline">{primaryAccountLabel}</span>
                </Link>

                {!isLoggedIn && (
                  <Link
                    href="/register"
                    className="hidden md:flex bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-300 shadow-sm items-center gap-2 active:scale-95"
                  >
                    <i className="ri-user-add-line text-sm" /> Daftar
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </header>

        <div
          className="relative pt-32 pb-16 md:pt-48 md:pb-24 overflow-hidden flex flex-col items-center justify-center px-4 bg-white"
          style={{ paddingTop: "clamp(112px, 18vw, 200px)" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] md:w-[900px] h-[350px] md:h-[500px] bg-gradient-to-b from-emerald-100/70 via-emerald-50/30 to-transparent rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-4xl mx-auto relative z-10 text-center w-full">
            <div className="animate-fade-up inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] md:text-xs font-black mb-6 shadow-sm select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <i className="ri-shield-check-fill text-emerald-600 text-sm" />
              <span className="uppercase tracking-wider">Transaksi Aman · SSL 256-bit Terenkripsi</span>
            </div>

            <h1 className="animate-fade-up-delay text-[2.6rem] sm:text-5xl md:text-[5.5rem] font-black text-slate-900 tracking-tight leading-[1.08] mb-5 md:mb-6">
              Top Up & Produk
              <br />
              Digital{" "}
              <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-500">
                Tercepat.
                <svg className="absolute -bottom-1 md:-bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6 C50 2, 150 2, 198 6" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="animate-fade-up-delay2 text-slate-500 text-sm md:text-xl max-w-xl mx-auto font-semibold mb-10 md:mb-12 leading-relaxed">
              Platform distribusi produk digital terpercaya dengan sistem otomatis 24 jam. Selesai dalam hitungan detik.
            </p>

            <div className="animate-fade-up-delay3 max-w-2xl mx-auto relative group w-full">
              <div className="absolute inset-y-0 left-0 pl-5 md:pl-6 flex items-center pointer-events-none z-10">
                <i className="ri-search-2-line text-slate-400 text-xl md:text-2xl group-focus-within:text-emerald-700 transition-colors duration-300" />
              </div>

              <input
                type="text"
                placeholder="Cari game, voucher, atau layanan digital..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-12 py-4 md:pl-16 md:py-5 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all font-semibold text-sm md:text-base shadow-lg shadow-slate-900/5"
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

            <div className="animate-fade-up-delay3 flex flex-wrap items-center justify-center gap-2 mt-5">
              <span className="text-xs text-slate-400 font-semibold">Populer:</span>
              {categories.slice(1, 5).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-all"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <TrustBar />
        <PromoBanner />

        <div id="catalog" className="sticky top-0 z-40 bg-[#F8FAFC]/97 backdrop-blur-xl border-y border-slate-200/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-0 md:px-6">
            <div className="flex overflow-x-auto py-3 md:py-4 gap-2 md:gap-2.5 px-4 md:px-0 hide-scrollbar items-center">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-[11px] md:text-xs font-black transition-all duration-200 active:scale-95 border cursor-pointer shrink-0 ${
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 md:pt-14 pb-20 md:pb-28 min-h-[50vh]">
          <div className="flex items-end justify-between mb-6 md:mb-10">
            <div>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <span className="w-8 h-8 md:w-9 md:h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                  <i className="ri-apps-2-fill text-emerald-700 text-base md:text-lg" />
                </span>
                {activeCategory === "SEMUA" ? "Semua Produk" : activeCategory}
              </h2>

              {filteredProducts.length > 0 && (
                <p className="text-xs text-slate-400 font-semibold mt-1.5 ml-0.5">
                  {filteredProducts.length} produk tersedia
                </p>
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="ri-ghost-2-line text-3xl text-slate-300" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">Produk Tidak Ditemukan</h3>
              <p className="text-sm text-slate-400 font-medium">Coba kata kunci atau kategori lain</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("SEMUA");
                }}
                className="mt-4 text-xs font-black text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
              {filteredProducts.map((product, idx) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProductDetail(product)}
                  style={{ transitionDelay: `${Math.min(idx * 40, 300)}ms` }}
                  className="reveal-card shimmer-hover group relative flex flex-col bg-white border border-slate-200/80 rounded-2xl md:rounded-[22px] overflow-hidden hover:border-emerald-600/60 hover:shadow-[0_16px_40px_rgba(4,120,87,0.10)] hover:-translate-y-1.5 z-10 cursor-pointer text-left"
                >
                  <div className="aspect-square sm:aspect-[4/5] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100/60 shrink-0">
                    <div className="shimmer-inner absolute inset-0 z-20 pointer-events-none" />
                    <ProductImage
                      product={product}
                      square
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />

                    <div className="hidden md:flex absolute inset-0 bg-slate-900/15 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-400 z-10 items-center justify-center">
                      <div className="translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400 delay-75 bg-white text-emerald-800 px-4 py-2 rounded-full text-[11px] font-black shadow-xl flex items-center gap-1.5">
                        <i className="ri-flashlight-line" /> Beli Sekarang
                      </div>
                    </div>
                  </div>

                  <div className="p-3 md:p-4 flex flex-col flex-1">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-700 transition-colors duration-300">
                      {product.category || "Umum"}
                    </p>

                    <h3 className="text-xs md:text-[13px] font-black text-slate-900 leading-snug mb-2 line-clamp-2">
                      {product.name}
                    </h3>

                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                        <i className="ri-stack-fill text-[11px]" />
                        {(product.variants?.length || 0) > 0 ? `${product.variants?.length} paket` : "1 paket"}
                      </span>
                    </div>

                    <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                          Mulai dari
                        </div>
                        <div className="text-emerald-800 font-black text-sm md:text-[15px] tracking-tight">
                          <span className="text-[10px] mr-0.5">Rp</span>
                          {formatPrice(product.sellPrice)}
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-700 group-hover:border-emerald-700 group-hover:text-white transition-all shrink-0">
                        <i className="ri-arrow-right-up-line text-sm" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <TestimonialsSection />

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
