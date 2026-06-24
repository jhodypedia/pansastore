"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Variant {
  id: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) => {
  const words = name.trim().split(" ");
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const PALETTE = [
  ["#059669", "#047857"],
  ["#2563EB", "#1D4ED8"],
  ["#7C3AED", "#6D28D9"],
  ["#DB2777", "#BE185D"],
  ["#D97706", "#B45309"],
  ["#0891B2", "#0E7490"],
];

const getGradientStyle = (name: string) => {
  const idx = (name.charCodeAt(0) || 0) % PALETTE.length;
  return {
    background: `linear-gradient(135deg, ${PALETTE[idx][0]} 0%, ${PALETTE[idx][1]} 100%)`,
  };
};

// ─── Static Data ──────────────────────────────────────────────────────────────
const TRUST_STATS = [
  { icon: "ri-shopping-bag-3-fill", value: "120.000+", label: "Transaksi Selesai" },
  { icon: "ri-star-fill", value: "4.98", label: "Rating Rata-Rata" },
  { icon: "ri-user-heart-fill", value: "45.000+", label: "Pelanggan Aktif" },
  { icon: "ri-timer-flash-fill", value: "< 3 Detik", label: "Kecepatan Proses" },
];

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
];

const MARQUEE_ITEMS = [
  "⚡ Proses Instan", "🔒 Transaksi Aman 256-bit SSL", "🎮 Games & Digital Lengkap",
  "🌙 Layanan 24/7 Nonstop", "💳 Multi Payment Method", "✅ 120 Ribu+ Transaksi Sukses",
  "⚡ Proses Instan", "🔒 Transaksi Aman 256-bit SSL", "🎮 Games & Digital Lengkap",
  "🌙 Layanan 24/7 Nonstop", "💳 Multi Payment Method", "✅ 120 Ribu+ Transaksi Sukses",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MarqueeBanner() {
  return (
    <div className="bg-emerald-800 overflow-hidden py-2.5 select-none">
      <div className="flex gap-8 animate-marquee whitespace-nowrap w-max">
        {MARQUEE_ITEMS.map((item, i) => (
          <span key={i} className="text-emerald-100 text-[11px] font-bold tracking-widest uppercase flex items-center gap-2">
            {item}
            <span className="text-emerald-500 mx-2">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <section className="py-12 md:py-16 bg-white border-y border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {TRUST_STATS.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-800 group-hover:border-emerald-800 transition-all duration-300 shadow-sm">
                <i className={`${stat.icon} text-emerald-700 text-xl md:text-2xl group-hover:text-white transition-colors duration-300`}></i>
              </div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
              <div className="text-[11px] md:text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">{stat.label}</div>
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
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 right-32 w-20 h-20 rounded-full bg-emerald-500/20 pointer-events-none" />

        <div className="relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300"></span>
            </span>
            <span className="text-white/90 text-[10px] font-black tracking-widest uppercase">Promo Spesial Hari Ini</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">
            Diskon Hingga <span className="text-yellow-300">30%</span><br className="hidden md:block" /> untuk Member Baru!
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
            <i className="ri-user-add-fill"></i> Daftar Gratis Sekarang
          </Link>
          <p className="text-emerald-200/60 text-[10px] font-semibold flex items-center gap-1">
            <i className="ri-shield-check-line"></i> Tidak perlu kartu kredit
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
            <i className="ri-star-smile-fill text-emerald-700 text-sm"></i>
            <span className="text-emerald-800 text-[11px] font-black tracking-widest uppercase">Testimoni Pelanggan</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
            Dipercaya Puluhan Ribu<br className="hidden md:block" /> Pelanggan Aktif
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-3xl p-6 md:p-7 flex flex-col gap-4 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center gap-1 text-yellow-400">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <i key={j} className="ri-star-fill text-sm"></i>
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
                  <i className="ri-verified-badge-fill text-emerald-600 text-lg"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StorefrontClient({ initialProducts }: { initialProducts: Product[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("SEMUA");
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reveal animation
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (window.innerWidth < 768) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "50px" }
    );

    // Reset and observe
    document.querySelectorAll(".reveal-card").forEach((el) => {
      (el as HTMLElement).style.opacity = "0";
      (el as HTMLElement).style.transform = "translateY(24px)";
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [activeCategory, searchQuery, initialProducts]); // eslint-disable-line

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariant(product.variants?.[0] ?? null);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    document.body.style.overflow = "";
  };

  const categories = useMemo(() => {
    const cats = initialProducts.map((p) => p.category).filter(Boolean) as string[];
    return ["SEMUA", ...Array.from(new Set(cats))].sort();
  }, [initialProducts]);

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchCat = activeCategory === "SEMUA" || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [initialProducts, searchQuery, activeCategory]);

  return (
    <>
      {/* ── Global Styles ── */}
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
          to   { opacity: 1; transform: translateY(0); }
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

      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-x-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

        {/* ── FIXED HEADER (Marquee + Navbar bersatu) ── */}
        <header className="fixed top-0 inset-x-0 z-50">
          {/* Marquee — sembunyikan saat scroll */}
          <div className={`bg-emerald-800 overflow-hidden transition-all duration-300 ease-out ${isScrolled ? "h-0 py-0 opacity-0" : "h-auto py-2.5 opacity-100"}`} style={{ willChange: "height, opacity" }}>
            <div className="flex gap-8 animate-marquee whitespace-nowrap w-max select-none">
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={i} className="text-emerald-100 text-[11px] font-bold tracking-widest uppercase flex items-center gap-2">
                  {item}
                  <span className="text-emerald-500 mx-2">•</span>
                </span>
              ))}
            </div>
          </div>

        {/* ── NAVBAR ── */}
        <nav className={`inset-x-0 transition-all duration-300 ease-out ${
          isScrolled
            ? "bg-white border-b border-slate-200 py-3 shadow-sm"
            : "bg-white/95 backdrop-blur-xl py-4 md:py-5"
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-900/20 group-hover:shadow-emerald-900/30 transition-shadow shrink-0">
                <i className="ri-store-2-fill text-base md:text-lg"></i>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-black text-base md:text-lg tracking-tight text-slate-900">
                  Pansa<span className="text-emerald-700">Store</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Digital Marketplace</span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-bold text-slate-500 hover:text-emerald-700 transition-colors">Beranda</Link>
              <Link href="/cek-pesanan" className="text-sm font-bold text-slate-500 hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                <i className="ri-search-eye-line"></i> Cek Pesanan
              </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/cek-pesanan"
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
              >
                <i className="ri-search-eye-line text-base"></i>
              </Link>
              <Link
                href="/login"
                className="bg-slate-900 hover:bg-emerald-800 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all duration-300 shadow-sm flex items-center gap-2 active:scale-95"
              >
                <i className="ri-user-3-line text-sm"></i>
                <span className="hidden sm:inline">Masuk</span>
              </Link>
              <Link
                href="/register"
                className="hidden md:flex bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-300 shadow-sm items-center gap-2 active:scale-95"
              >
                <i className="ri-user-add-line text-sm"></i> Daftar
              </Link>
            </div>
          </div>
        </nav>
        </header>

        {/* ── HERO SECTION ── */}
        <div className="relative pt-32 pb-16 md:pt-48 md:pb-24 overflow-hidden flex flex-col items-center justify-center px-4 bg-white" style={{ paddingTop: "clamp(112px, 18vw, 200px)" }}>
          {/* Grid texture */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] md:w-[900px] h-[350px] md:h-[500px] bg-gradient-to-b from-emerald-100/70 via-emerald-50/30 to-transparent rounded-full filter blur-[100px] pointer-events-none" />

          <div className="max-w-4xl mx-auto relative z-10 text-center w-full">
            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] md:text-xs font-black mb-6 shadow-sm select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <i className="ri-shield-check-fill text-emerald-600 text-sm"></i>
              <span className="uppercase tracking-wider">Transaksi Aman · SSL 256-bit Terenkripsi</span>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-up-delay text-[2.6rem] sm:text-5xl md:text-[5.5rem] font-black text-slate-900 tracking-tight leading-[1.08] mb-5 md:mb-6">
              Top Up & Produk<br />
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

            {/* Search */}
            <div className="animate-fade-up-delay3 max-w-2xl mx-auto relative group w-full">
              <div className="absolute inset-y-0 left-0 pl-5 md:pl-6 flex items-center pointer-events-none z-10">
                <i className="ri-search-2-line text-slate-400 text-xl md:text-2xl group-focus-within:text-emerald-700 transition-colors duration-300"></i>
              </div>
              <input
                type="text"
                placeholder="Cari game, voucher, atau layanan digital..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-5 py-4 md:pl-16 md:py-5 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all font-semibold text-sm md:text-base shadow-lg shadow-slate-900/5"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <i className="ri-close-circle-fill text-xl"></i>
                </button>
              )}
            </div>

            {/* Quick categories */}
            <div className="animate-fade-up-delay3 flex flex-wrap items-center justify-center gap-2 mt-5">
              <span className="text-xs text-slate-400 font-semibold">Populer:</span>
              {categories.slice(1, 5).map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-all"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── TRUST BAR ── */}
        <TrustBar />

        {/* ── PROMO BANNER ── */}
        <PromoBanner />

        {/* ── CATEGORY FILTER ── */}
        <div id="catalog" className="sticky top-0 z-40 bg-[#F8FAFC]/97 backdrop-blur-xl border-y border-slate-200/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-0 md:px-6">
            <div className="flex overflow-x-auto py-3 md:py-4 gap-2 md:gap-2.5 px-4 md:px-0 hide-scrollbar items-center">
              {categories.map((category) => (
                <button
                  key={category}
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

        {/* ── PRODUCT GRID ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 md:pt-14 pb-20 md:pb-28 min-h-[50vh]">
          <div className="flex items-end justify-between mb-6 md:mb-10">
            <div>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <span className="w-8 h-8 md:w-9 md:h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                  <i className="ri-apps-2-fill text-emerald-700 text-base md:text-lg"></i>
                </span>
                {activeCategory === "SEMUA" ? "Semua Produk" : activeCategory}
              </h2>
              {filteredProducts.length > 0 && (
                <p className="text-xs text-slate-400 font-semibold mt-1.5 ml-0.5">{filteredProducts.length} produk tersedia</p>
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="ri-ghost-2-line text-3xl text-slate-300"></i>
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">Produk Tidak Ditemukan</h3>
              <p className="text-sm text-slate-400 font-medium">Coba kata kunci atau kategori lain</p>
              <button
                onClick={() => { setSearchQuery(""); setActiveCategory("SEMUA"); }}
                className="mt-4 text-xs font-black text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
              {filteredProducts.map((product, idx) => (
                <div
                  key={product.id}
                  onClick={() => openProductDetail(product)}
                  style={{ transitionDelay: `${Math.min(idx * 40, 300)}ms` }}
                  className="reveal-card shimmer-hover group relative flex flex-col bg-white border border-slate-200/80 rounded-2xl md:rounded-[22px] overflow-hidden hover:border-emerald-600/60 hover:shadow-[0_16px_40px_rgba(4,120,87,0.10)] hover:-translate-y-1.5 z-10 cursor-pointer"
                >
                  {/* Product Image */}
                  <div className="aspect-square sm:aspect-[4/5] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100/60 shrink-0">
                    <div className="shimmer-inner absolute inset-0 z-20 pointer-events-none" />
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center text-white group-hover:scale-105 transition-transform duration-700 ease-out relative"
                        style={getGradientStyle(product.name)}
                      >
                        <span className="text-3xl md:text-5xl font-black tracking-tighter drop-shadow-md opacity-90">
                          {getInitials(product.name)}
                        </span>
                      </div>
                    )}
                    {/* Buy overlay – desktop only */}
                    <div className="hidden md:flex absolute inset-0 bg-slate-900/15 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-400 z-10 items-center justify-center">
                      <div className="translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400 delay-75 bg-white text-emerald-800 px-4 py-2 rounded-full text-[11px] font-black shadow-xl flex items-center gap-1.5">
                        <i className="ri-flashlight-line"></i> Beli Sekarang
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 md:p-4 flex flex-col flex-1">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-700 transition-colors duration-300">
                      {product.category || "Umum"}
                    </p>
                    <h3 className="text-xs md:text-[13px] font-black text-slate-900 leading-snug mb-3 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <div className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Mulai dari</div>
                        <div className="text-emerald-800 font-black text-sm md:text-[15px] tracking-tight">
                          <span className="text-[10px] mr-0.5">Rp</span>
                          {product.sellPrice.toLocaleString("id-ID")}
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-700 group-hover:border-emerald-700 group-hover:text-white transition-all duration-300 transform group-hover:-rotate-45 shadow-sm shrink-0">
                        <i className="ri-arrow-right-line text-xs"></i>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── TESTIMONIALS ── */}
        <TestimonialsSection />

        {/* ── QUICK VIEW MODAL ── */}
        {selectedProduct && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            className="sm:items-center sm:p-4"
          >
            {/* Backdrop */}
            <div
              style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)" }}
              onClick={closeModal}
            />

            {/* Modal Shell */}
            <div
              style={{
                position: "relative",
                background: "#fff",
                width: "100%",
                maxWidth: "640px",
                display: "flex",
                flexDirection: "column",
                borderRadius: "24px 24px 0 0",
                boxShadow: "0 -8px 48px rgba(0,0,0,0.18)",
                maxHeight: "90vh",
                overflow: "hidden",
              }}
              className="sm:rounded-3xl sm:shadow-2xl sm:mx-auto"
            >
              {/* Drag pill mobile */}
              <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 40, height: 4, borderRadius: 9999, background: "#e2e8f0", zIndex: 10 }} className="sm:hidden" />

              {/* ── HERO IMAGE */}
              <div style={{ position: "relative", width: "100%", height: 200, flexShrink: 0, overflow: "hidden" }} className="sm:h-52">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", ...getGradientStyle(selectedProduct.name) }}>
                    <span style={{ fontSize: 64, fontWeight: 900, color: "white", opacity: 0.9, letterSpacing: "-2px" }}>
                      {getInitials(selectedProduct.name)}
                    </span>
                  </div>
                )}
                {/* Gradient overlay */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)" }} />

                {/* Close button */}
                <button
                  onClick={closeModal}
                  style={{
                    position: "absolute", top: 14, right: 14,
                    width: 34, height: 34,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.18)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 20,
                  }}
                >
                  <i className="ri-close-line" style={{ fontSize: 18, lineHeight: 1 }}></i>
                </button>

                {/* Trust badge */}
                <div style={{ position: "absolute", bottom: 14, left: 16, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ri-shield-check-fill" style={{ color: "#34d399", fontSize: 13 }}></i>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 700 }}>Transaksi dijamin aman · PansaStore</span>
                </div>

                {/* Category + title */}
                <div style={{ position: "absolute", bottom: 38, left: 16, right: 56 }}>
                  <span style={{
                    display: "inline-block",
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    padding: "3px 10px",
                    borderRadius: 8,
                    marginBottom: 6,
                  }}>
                    {selectedProduct.category || "Katalog"}
                  </span>
                  <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0 }}>
                    {selectedProduct.name}
                  </h3>
                </div>
              </div>

              {/* ── SCROLLABLE BODY */}
              <div
                style={{
                  flex: 1,
                  overflowY: "scroll",
                  padding: "18px 20px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  WebkitOverflowScrolling: "touch",
                  minHeight: 0,
                }}
              >
                {/* Info chips */}
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {[
                    { icon: "ri-flashlight-line", label: "Proses Instan" },
                    { icon: "ri-shield-check-line", label: "Bergaransi" },
                    { icon: "ri-customer-service-2-line", label: "24/7 Support" },
                  ].map((chip) => (
                    <div key={chip.label} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: "#f0fdf4", border: "1px solid #bbf7d0",
                      borderRadius: 99, padding: "5px 12px",
                    }}>
                      <i className={chip.icon} style={{ color: "#059669", fontSize: 12 }}></i>
                      <span style={{ color: "#065f46", fontSize: 11, fontWeight: 700 }}>{chip.label}</span>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>Deskripsi</p>
                  <p style={{ fontSize: 13, color: "#475569", fontWeight: 500, lineHeight: 1.7, background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 14, padding: "13px 15px", margin: 0 }}>
                    {selectedProduct.description || "Produk digital resmi dengan pengiriman instan setelah konfirmasi pembayaran. Dijamin 100% valid atau uang kembali penuh."}
                  </p>
                </div>

                {/* Variants */}
                <div style={{ paddingBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, marginTop: 0 }}>Pilih Paket</p>

                  {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {selectedProduct.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        const outOfStock = v.stock === 0;
                        return (
                          <div
                            key={v.id}
                            onClick={() => !outOfStock && setSelectedVariant(v)}
                            style={{
                              border: isSelected ? "2px solid #059669" : "1.5px solid #e2e8f0",
                              borderRadius: 16,
                              padding: "13px 13px 11px",
                              background: isSelected ? "#f0fdf4" : outOfStock ? "#f8fafc" : "#fff",
                              opacity: outOfStock ? 0.5 : 1,
                              cursor: outOfStock ? "not-allowed" : "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: 7,
                              boxShadow: isSelected ? "0 0 0 4px rgba(5,150,105,0.08)" : "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <span style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{v.name}</span>
                              {isSelected && <i className="ri-checkbox-circle-fill" style={{ color: "#059669", fontSize: 18, flexShrink: 0 }}></i>}
                            </div>
                            <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>{v.duration}</span>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 6 }}>{v.type}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, background: "#fffbeb", color: "#b45309", border: "1px solid #fef3c7", padding: "2px 8px", borderRadius: 6 }}>
                                Garansi {v.warranty}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 9, marginTop: 2 }}>
                              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
                                {outOfStock ? "Stok Habis" : `${v.stock} unit`}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 900, color: "#065f46" }}>Rp {v.price.toLocaleString("id-ID")}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      border: "2px solid #059669", borderRadius: 16, padding: "15px 16px",
                      background: "#f0fdf4", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Paket Reguler</div>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: 2 }}>Pengiriman otomatis · Instan</div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 900, color: "#065f46" }}>Rp {selectedProduct.sellPrice.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── STICKY FOOTER CTA */}
              <div style={{
                flexShrink: 0,
                padding: "14px 20px 20px",
                background: "#fff",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Total Bayar</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#065f46", letterSpacing: "-0.5px", margin: "2px 0 0" }}>
                    Rp {(selectedVariant ? selectedVariant.price : selectedProduct.sellPrice).toLocaleString("id-ID")}
                  </p>
                </div>
                <Link
                  href={`/checkout?product=${selectedProduct.id}${selectedVariant ? `&variant=${selectedVariant.id}` : ""}`}
                  style={{
                    background: "linear-gradient(135deg, #065f46 0%, #059669 100%)",
                    color: "#fff",
                    padding: "13px 24px",
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 16px rgba(5,150,105,0.35)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="ri-shopping-bag-3-fill" style={{ fontSize: 16 }}></i>
                  Ambil Paket
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer className="bg-white border-t border-slate-100 pt-14 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
              {/* Brand */}
              <div className="lg:col-span-1">
                <Link href="/" className="flex items-center gap-2.5 mb-5">
                  <div className="w-9 h-9 bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                    <i className="ri-store-2-fill text-base"></i>
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-black text-lg tracking-tight text-slate-900">
                      Pansa<span className="text-emerald-700">Store</span>
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Digital Marketplace</span>
                  </div>
                </Link>
                <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-medium mb-5">
                  Platform top up dan distribusi produk digital terpercaya di Indonesia. Proses instan, harga terbaik, layanan 24 jam.
                </p>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 w-fit">
                  <i className="ri-lock-password-fill text-emerald-700 text-sm"></i>
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">SSL 256-bit Secured</span>
                </div>
              </div>

              {/* Sitemap */}
              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-[11px] md:text-xs mb-4">Navigasi</h4>
                <ul className="space-y-3">
                  {[
                    { href: "/", label: "Beranda", icon: "ri-home-4-line" },
                    { href: "/cek-pesanan", label: "Lacak Pesanan", icon: "ri-search-eye-line" },
                    { href: "/register", label: "Daftar Akun", icon: "ri-user-add-line" },
                    { href: "/login", label: "Masuk", icon: "ri-login-box-line" },
                  ].map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-slate-500 hover:text-emerald-700 text-xs md:text-sm font-semibold transition-colors flex items-center gap-2">
                        <i className={`${item.icon} text-slate-300`}></i> {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-[11px] md:text-xs mb-4">Dukungan</h4>
                <ul className="space-y-3">
                  {[
                    { href: "/terms", label: "Syarat & Ketentuan", icon: "ri-file-text-line" },
                    { href: "/privacy", label: "Kebijakan Privasi", icon: "ri-shield-user-line" },
                    { href: "/faq", label: "FAQ", icon: "ri-question-answer-line" },
                  ].map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-slate-500 hover:text-emerald-700 text-xs md:text-sm font-semibold transition-colors flex items-center gap-2">
                        <i className={`${item.icon} text-slate-300`}></i> {item.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <a href="mailto:support@pansastore.id" className="text-slate-500 hover:text-emerald-700 text-xs md:text-sm font-semibold transition-colors flex items-center gap-2">
                      <i className="ri-mail-send-line text-slate-300"></i> support@pansastore.id
                    </a>
                  </li>
                </ul>
              </div>

              {/* Payment */}
              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-[11px] md:text-xs mb-4">Metode Pembayaran</h4>
                <div className="flex flex-wrap gap-2">
                  {["QRIS", "OVO", "DANA", "GoPay", "ShopeePay", "Transfer Bank"].map((method) => (
                    <span key={method} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600">
                      {method}
                    </span>
                  ))}
                </div>
                <div className="mt-5">
                  <h4 className="text-slate-900 font-black uppercase tracking-widest text-[11px] md:text-xs mb-3">Ikuti Kami</h4>
                  <div className="flex items-center gap-2">
                    {[
                      { icon: "ri-instagram-line", href: "#" },
                      { icon: "ri-twitter-x-line", href: "#" },
                      { icon: "ri-whatsapp-line", href: "#" },
                    ].map((s) => (
                      <a
                        key={s.icon}
                        href={s.href}
                        className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-emerald-800 hover:border-emerald-800 hover:text-white transition-all duration-200"
                      >
                        <i className={`${s.icon} text-base`}></i>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-slate-400 text-[11px] font-semibold text-center sm:text-left">
                &copy; {new Date().getFullYear()} PansaStore. Seluruh hak cipta dilindungi.
              </p>
              <div className="flex items-center gap-4">
                <Link href="/terms" className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold transition-colors">Syarat</Link>
                <Link href="/privacy" className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold transition-colors">Privasi</Link>
                <span className="text-slate-300 text-[11px]">•</span>
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
                  <i className="ri-heart-fill text-emerald-500 text-xs"></i> Made in Indonesia
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}