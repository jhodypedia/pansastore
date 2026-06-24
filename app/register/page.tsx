"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { registerUser } from "@/actions/user";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // Tambahan field phone sesuai skema DB
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UX Tambahan: Toggle show/hide password seperti di halaman Login
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi Konfirmasi Password
    if (password !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Mendaftarkan akun baru...");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (phone) formData.append("phone", phone);
    formData.append("password", password);

    const res = await registerUser(formData);

    if (res?.error) {
      toast.error(res.error, { id: toastId });
      setIsLoading(false);
    } else {
      toast.success("Registrasi berhasil! Silakan masuk dengan akun baru Anda.", { id: toastId });
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4 selection:bg-emerald-600 selection:text-white py-10">
      
      {/* Premium Background Effects (Disinkronkan dengan tema halaman Login) */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-float"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-float delay-200"></div>

      <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 sm:p-10 relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] animate-fade-up">
        
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary,10_185_129))] bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-900/20 hover:scale-105 hover:-translate-y-1 transition-all duration-300 mb-6">
            <i className="ri-user-add-fill text-2xl"></i>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Buat Akun Baru</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">Bergabung dengan ekosistem PansaGroup.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* NAMA LENGKAP */}
          <div className="group">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-emerald-600 transition-colors">
              Nama Lengkap
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="ri-user-line text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
              </div>
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Pansa Studio"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* EMAIL */}
          <div className="group">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-emerald-600 transition-colors">
              Alamat Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="ri-mail-line text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
              </div>
              <input
                type="email"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pansagroup.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* NOMOR HP (Opsional menyesuaikan DB) */}
          <div className="group">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-emerald-600 transition-colors">
              Nomor WhatsApp <span className="text-slate-300 font-medium text-[9px] lowercase tracking-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="ri-whatsapp-line text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
              </div>
              <input
                type="number"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400 appearance-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081234567890"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PASSWORD */}
            <div className="group">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-emerald-600 transition-colors">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <i className="ri-lock-password-line text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                </button>
              </div>
            </div>

            {/* KONFIRMASI PASSWORD */}
            <div className="group">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-emerald-600 transition-colors">
                Konfirmasi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <i className="ri-shield-check-line text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  <i className={showConfirmPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 mt-6 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 hover:shadow-[0_10px_20px_rgba(5,150,105,0.2)] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:hover:transform-none disabled:active:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><i className="ri-loader-4-line animate-spin text-lg"></i> Mendaftarkan...</>
            ) : (
              <><i className="ri-user-add-line text-lg"></i> Daftar Sekarang</>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center pt-6 border-t border-slate-100 flex flex-col gap-4">
          <Link href="/login" className="text-[13px] font-medium text-slate-500 hover:text-emerald-600 transition-colors">
            Sudah punya akun? <span className="font-bold">Masuk di sini</span>
          </Link>
          <Link href="/" className="text-[12px] font-bold text-slate-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1.5 group w-fit mx-auto">
            <i className="ri-arrow-left-line group-hover:-translate-x-1 transition-transform"></i> Kembali ke Etalase Utama
          </Link>
        </div>
      </div>
    </div>
  );
}