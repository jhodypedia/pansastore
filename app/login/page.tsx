"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Checkbox
    if (!agreedToTerms) {
      toast.error("Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Memverifikasi otorisasi...");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      toast.error("Akses Ditolak. Kredensial tidak valid.", { id: toastId });
      setIsLoading(false);
    } else {
      toast.success("Otorisasi Berhasil. Memuat Dashboard...", { id: toastId });
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4 selection:bg-emerald-600 selection:text-white">
      
      {/* Premium Background Effects (Sesuai tema Green Forest) */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-float"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-float delay-200"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 sm:p-10 relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] animate-fade-up">
        
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary))] text-white rounded-2xl shadow-lg shadow-emerald-900/20 hover:scale-105 hover:-translate-y-1 transition-all duration-300 mb-6">
            <i className="ri-box-3-fill text-2xl"></i>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Otorisasi Sistem</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">Silakan masuk untuk mengakses PansaGroup Dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="group">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-[hsl(var(--primary))] transition-colors">
              Alamat Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="ri-mail-line text-slate-400 group-focus-within:text-[hsl(var(--primary))] transition-colors"></i>
              </div>
              <input
                type="email"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] transition-all placeholder:text-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pansagroup.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input dengan Toggle */}
          <div className="group">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-[hsl(var(--primary))] transition-colors">
              Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="ri-lock-password-line text-slate-400 group-focus-within:text-[hsl(var(--primary))] transition-colors"></i>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] transition-all placeholder:text-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[hsl(var(--primary))] transition-colors focus:outline-none"
                tabIndex={-1}
              >
                <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
              </button>
            </div>
          </div>

          {/* Checkbox Term of Service */}
          <div className="flex items-start gap-3 pt-2">
            <div className="flex items-center h-5 mt-0.5">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 border border-slate-300 rounded text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]/30 focus:ring-2 transition-all cursor-pointer bg-slate-50 disabled:opacity-50"
              />
            </div>
            <label htmlFor="terms" className="text-xs font-medium text-slate-500 leading-relaxed cursor-pointer select-none">
              Saya menyetujui{" "}
              <Link href="/terms" className="font-bold text-slate-900 hover:text-[hsl(var(--primary))] transition-colors">
                Syarat & Ketentuan
              </Link>{" "}
              serta{" "}
              <Link href="/privacy" className="font-bold text-slate-900 hover:text-[hsl(var(--primary))] transition-colors">
                Kebijakan Privasi
              </Link>{" "}
              layanan PansaGroup.
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 mt-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-[hsl(var(--primary))] hover:shadow-[0_10px_20px_rgba(5,150,105,0.2)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--primary))] transition-all duration-300 disabled:opacity-70 disabled:hover:transform-none disabled:active:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><i className="ri-loader-4-line animate-spin text-lg"></i> Memverifikasi...</>
            ) : (
              <><i className="ri-shield-keyhole-fill text-lg"></i> Akses Dashboard</>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <Link href="/" className="text-[13px] font-bold text-slate-400 hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-center gap-1.5 group">
            <i className="ri-arrow-left-line group-hover:-translate-x-1 transition-transform"></i> Kembali ke Etalase Utama
          </Link>
        </div>
      </div>
    </div>
  );
}