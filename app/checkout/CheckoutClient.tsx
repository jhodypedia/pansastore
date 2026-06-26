"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Plus_Jakarta_Sans } from "next/font/google";
import { processCheckout } from "@/actions/checkout";
import QRISInvoice from "@/components/QRISInvoice"; 

// Menggunakan font Plus Jakarta Sans untuk tampilan modern, bersih, dan premium
const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

interface CheckoutClientProps {
  product: any;
  variantId?: string;
  variantName: string;
  price: number;
  defaultEmail?: string;
  defaultPhone?: string;
}

export default function CheckoutClient({
  product,
  variantId,
  variantName,
  price,
  defaultEmail = "",
  defaultPhone = "",
}: CheckoutClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // ==========================================
  // SMART DETECTOR: DETEKSI TIPE PRODUK
  // ==========================================
  const productType = product?.type?.toUpperCase() || "";
  const isInviteType = productType.includes("INVITE");

  // ==========================================
  // AUTO-FILL LOGIC:
  // ==========================================
  const [targetId, setTargetId] = useState(isInviteType ? defaultEmail : "");
  const [whatsapp, setWhatsapp] = useState(defaultPhone);

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitasi input: Hanya angka agar aman dari typo/karakter aneh
    setWhatsapp(e.target.value.replace(/[^0-9]/g, ""));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTargetId = isInviteType ? targetId : whatsapp;

    if (isInviteType && !finalTargetId) {
      toast.error("Harap isi Alamat Email tujuan.");
      return;
    }

    if (!whatsapp) {
      toast.error("Harap isi Nomor WhatsApp Anda.");
      return;
    }

    setIsLoading(true);
    setLoadingStep(1);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1000);

    const formData = new FormData();
    formData.append("productId", product.id);
    if (variantId) formData.append("variantId", variantId);
    formData.append("targetId", finalTargetId);
    formData.append("whatsapp", whatsapp);
    formData.append("method", "qris"); 

    try {
      const res = await processCheckout(formData);
      clearInterval(stepInterval);

      if (res.success && res.payment) {
        setLoadingStep(4);
        toast.success("Invoice berhasil dibuat!", { icon: "🔒" });

        // Tampilkan QRIS secara halus setelah animasi selesai
        setTimeout(() => {
          setInvoiceData(res.payment);
        }, 600);
      } else {
        toast.error(res.message || "Gagal memproses transaksi.");
        setIsLoading(false);
        setLoadingStep(0);
      }
    } catch (error) {
      clearInterval(stepInterval);
      toast.error("Koneksi bermasalah. Silakan coba kembali.");
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const getButtonLabel = () => {
    switch (loadingStep) {
      case 1: return "Mengamankan Data...";
      case 2: return "Mendaftarkan Invoice...";
      case 3: return "Menerbitkan QRIS...";
      case 4: return "Menyiapkan Pembayaran...";
      default: return "Bayar Sekarang";
    }
  };

  // ==========================================
  // RENDER VIEW: TAMPILAN INVOICE QRIS
  // ==========================================
  if (invoiceData) {
    return (
      // FIX SCROLL: Ditambahkan overflow-x-hidden pada parent utama
      <div className={`${fontSans.variable} min-h-screen bg-[#F7F5EF] font-sans selection:bg-emerald-200 selection:text-emerald-900 pb-20 overflow-x-hidden`}>
        <nav className="bg-[#F7F5EF]/85 backdrop-blur-xl border-b border-emerald-900/10 py-4 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-emerald-900/70 bg-emerald-900/[0.04] px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-emerald-900/10 shadow-sm">
              <i className="ri-shield-keyhole-fill text-emerald-700"></i> Menunggu Pembayaran
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 md:pt-14">
          <QRISInvoice paymentData={invoiceData} />
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER VIEW: TAMPILAN CHECKOUT FORM UTAMA
  // ==========================================
  return (
    // FIX SCROLL: Ditambahkan overflow-x-hidden pada parent utama
    <div className={`${fontSans.variable} min-h-screen bg-[#F7F5EF] font-sans selection:bg-emerald-200 selection:text-emerald-900 pb-20 overflow-x-hidden`}>
      
      {/* NAVIGATION */}
      <nav className="bg-[#F7F5EF]/85 backdrop-blur-xl border-b border-emerald-900/10 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-full bg-[#0A1F1A] flex items-center justify-center text-emerald-300 shadow-sm group-hover:-translate-x-0.5 transition-transform">
              <i className="ri-arrow-left-line text-lg"></i>
            </span>
          </Link>
          <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-emerald-900/70 bg-emerald-900/[0.04] px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-emerald-900/10 shadow-sm">
            <i className="ri-shield-keyhole-fill text-emerald-700"></i> Checkout Terenkripsi
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 md:pt-14">
        <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700/80 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 motion-safe:animate-pulse"></span>
          Invoice Belum Dibayar
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold text-[#0A1F1A] tracking-tight mb-2">
          Selesaikan Pesanan Anda
        </h1>
        <p className="text-sm md:text-base text-emerald-900/60 font-medium mb-10 md:mb-14 max-w-lg">
          {isInviteType
            ? "Lengkapi alamat email dan kontak pengiriman untuk pesanan Anda."
            : "Sistem otomatis aktif. Masukkan nomor WhatsApp Anda untuk menerima detail akses pesanan."}
        </p>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          
          {/* RINGKASAN TRANSKASI */}
          <div className="order-1 lg:order-2 lg:col-span-5 relative">
            <div className="relative lg:sticky lg:top-[96px] rounded-[28px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(10,31,26,0.35)]">
              <div className="h-[3px] w-full bg-gradient-to-r from-emerald-600 via-[#C8A24D] to-emerald-600" />

              <div className="bg-[#0A1F1A] p-6 md:p-8 text-white relative overflow-hidden">
                {/* Elemen glow/blur yang sering memicu bug scroll horizontal di HP */}
                <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-emerald-600/20 blur-[80px] pointer-events-none" />

                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="font-bold text-lg">Ringkasan Pesanan</h3>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300/70 border border-emerald-300/20 rounded-full px-2.5 py-1">
                    Invoice
                  </span>
                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 md:p-5 mb-6 relative z-10">
                  <div className="flex gap-4 items-center mb-4 pb-4 border-b border-dashed border-[#C8A24D]/25">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 border border-white/5">
                      <i className={`${isInviteType ? "ri-mail-star-fill" : "ri-key-2-fill"} text-2xl text-emerald-400`}></i>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] md:text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest mb-0.5">
                        {product.category || "Premium App"}
                      </div>
                      <div className="font-bold text-sm md:text-base truncate">{product.name}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm font-medium text-white/60">
                    <span>Paket Pilihan</span>
                    <span className="font-bold text-white text-right max-w-[150px] truncate">
                      {variantName}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8 relative z-10">
                  <div className="text-white/40 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">
                    Total Pembayaran
                  </div>
                  <div className="text-3xl md:text-[2.5rem] leading-none font-extrabold text-emerald-400 tracking-tight">
                    <span className="text-base md:text-lg mr-1 text-emerald-300/80">Rp</span>
                    {price.toLocaleString("id-ID")}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative z-10 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 shadow-[0_14px_24px_-6px_rgba(5,150,105,0.4)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-80 disabled:hover:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <i className="ri-loader-4-line motion-safe:animate-spin text-xl"></i>
                      <span aria-live="polite">{getButtonLabel()}</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-qr-code-line text-xl"></i> Bayar dengan QRIS
                    </>
                  )}
                </button>
                
                <div className="mt-6 flex items-center justify-center gap-1.5 text-[9px] md:text-[10px] font-bold text-white/35 uppercase tracking-widest relative z-10">
                  <i className="ri-shield-check-fill text-emerald-500"></i> Sistem Pembayaran Terenkripsi
                </div>
              </div>

              {isLoading && (
                <div className="seal-stamp pointer-events-none absolute top-5 right-5 w-12 h-12 rounded-full border-2 border-[#C8A24D] flex items-center justify-center bg-[#0A1F1A]">
                  <i className="ri-lock-2-fill text-[#C8A24D] text-base"></i>
                </div>
              )}
            </div>
          </div>

          {/* FORM INPUT INFORMASI TUJUAN */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-6 md:space-y-8">
            
            {isInviteType ? (
              <div className="bg-white p-6 md:p-8 rounded-[28px] border border-emerald-900/10 shadow-[0_4px_24px_rgba(10,31,26,0.04)]">
                <div className="flex items-center gap-3 mb-6 border-b border-emerald-900/[0.06] pb-4">
                  <div className="w-9 h-9 rounded-full border border-emerald-700/30 text-emerald-800 flex items-center justify-center font-bold text-base">
                    1
                  </div>
                  <h3 className="font-bold text-lg text-[#0A1F1A]">Alamat Email Tujuan</h3>
                </div>

                <div>
                  <label htmlFor="targetId" className="block text-[11px] font-bold text-emerald-900/40 uppercase tracking-widest mb-2">
                    Email Penerima Premium
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="ri-mail-send-line text-emerald-700/50 text-lg"></i>
                    </div>
                    <input
                      id="targetId"
                      type="email"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Contoh: emailkamu@gmail.com"
                      className="w-full pl-12 pr-4 py-4 bg-[#F7F5EF] border border-emerald-900/10 rounded-2xl text-sm font-semibold text-[#0A1F1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 focus:border-emerald-700 transition-all placeholder:font-medium placeholder:text-emerald-900/30 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[10px] md:text-[11px] font-semibold text-amber-700 mt-2.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 flex items-start gap-1.5">
                    <i className="ri-error-warning-fill mt-0.5 shrink-0"></i>
                    Link undangan (Invite) premium akan dikirimkan langsung ke email ini. Pastikan alamat email tepat.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-emerald-50 to-[#F7F5EF] p-6 md:p-8 rounded-[28px] border border-emerald-900/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-600 via-[#C8A24D] to-emerald-600" />
                <div className="flex items-center gap-3 mb-4 border-b border-emerald-900/10 pb-4">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <i className="ri-information-fill"></i>
                  </div>
                  <h3 className="font-bold text-lg text-[#0A1F1A]">Sistem Pengiriman Otomatis</h3>
                </div>

                <div className="text-emerald-900/70 text-sm font-medium leading-relaxed space-y-3">
                  <p>
                    Produk ini berjenis <span className="font-bold bg-emerald-700/10 text-emerald-800 px-2 py-0.5 rounded-md uppercase text-xs">{product.type || "Akun Private"}</span>. Pengisian alamat email/ID tidak diperlukan.
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="ri-checkbox-circle-fill text-emerald-600 mt-0.5"></i>
                    Detail akun kredensial (Username & Password) atau Kode Serial unik akan otomatis terkirim terenkripsi aman langsung ke nomor WhatsApp Anda sesaat setelah pembayaran divalidasi.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white p-6 md:p-8 rounded-[28px] border border-emerald-900/10 shadow-[0_4px_24px_rgba(10,31,26,0.04)]">
              <div className="flex items-center gap-3 mb-6 border-b border-emerald-900/[0.06] pb-4">
                <div className="w-9 h-9 rounded-full border border-emerald-700/30 text-emerald-800 flex items-center justify-center font-bold text-base">
                  {isInviteType ? "2" : "1"}
                </div>
                <h3 className="font-bold text-lg text-[#0A1F1A]">Kontak WhatsApp</h3>
              </div>

              <div>
                <label htmlFor="whatsapp" className="block text-[11px] font-bold text-emerald-900/40 uppercase tracking-widest mb-2">
                  Nomor WhatsApp Anda
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="ri-whatsapp-line text-emerald-600 text-lg"></i>
                  </div>
                  <input
                    id="whatsapp"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={whatsapp}
                    onChange={handleWhatsappChange}
                    required
                    disabled={isLoading}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-12 pr-4 py-4 bg-[#F7F5EF] border border-emerald-900/10 rounded-2xl text-sm font-semibold text-[#0A1F1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 focus:border-emerald-700 transition-all placeholder:font-medium placeholder:text-emerald-900/30 disabled:opacity-50"
                  />
                </div>
                <p className="text-[10px] md:text-[11px] text-emerald-900/45 mt-2.5 font-medium">
                  {isInviteType
                    ? "Digunakan sebagai tujuan pengiriman notifikasi invoice transaksi dan status pesanan."
                    : "PENTING: Invoice beserta detail Akun/Voucher Premium Anda akan dikirimkan secara langsung dan rahasia ke nomor WhatsApp ini."}
                </p>
              </div>
            </div>

          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes sealStamp {
          0% { transform: scale(2) rotate(-12deg); opacity: 0; }
          60% { transform: scale(0.85) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .seal-stamp {
          animation: sealStamp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .seal-stamp { animation: none; }
        }
      `}</style>
    </div>
  );
}
