"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { updateProfile } from "@/actions/profile";

export default function ProfileForm({ user }: { user: any }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Memperbarui data profil...");

    const formData = new FormData(e.currentTarget);
    const res = await updateProfile(formData);

    if (res.success) {
      toast.success(res.message, { id: toastId });
      // Reset input password setelah berhasil
      const form = e.target as HTMLFormElement;
      const oldPassInput = form.querySelector('input[name="oldPassword"]') as HTMLInputElement;
      const newPassInput = form.querySelector('input[name="password"]') as HTMLInputElement;
      if (oldPassInput) oldPassInput.value = "";
      if (newPassInput) newPassInput.value = "";
    } else {
      toast.error(res.message, { id: toastId });
    }
    
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          Alamat Email (Permanen)
        </label>
        <input 
          type="email" 
          disabled
          defaultValue={user.email}
          className="w-full px-4 py-3.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed font-medium"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
          Nama Lengkap
        </label>
        <input 
          type="text" 
          name="name"
          defaultValue={user.name || ""}
          placeholder="Nama administrator"
          required
          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] transition-all"
        />
      </div>

      <div className="pt-6 border-t border-slate-100 space-y-5">
        <h3 className="text-sm font-black text-slate-900 tracking-tight">Kredensial Keamanan</h3>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Kata Sandi Lama
          </label>
          <input 
            type="password" 
            name="oldPassword"
            placeholder="Wajib diisi jika ingin mengganti sandi baru"
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Kata Sandi Baru
          </label>
          <input 
            type="password" 
            name="password"
            placeholder="Masukkan kata sandi baru minimum 6 karakter"
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] transition-all"
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={isLoading}
          className="bg-[hsl(var(--primary))] text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-emerald-800 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <><i className="ri-loader-4-line animate-spin"></i> Menyimpan...</>
          ) : (
            <><i className="ri-shield-check-fill text-lg"></i> Perbarui Kredensial</>
          )}
        </button>
      </div>
    </form>
  );
}