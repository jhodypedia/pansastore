"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { updateSettings } from "@/actions/setting";

export default function SettingsForm({ setting }: { setting: any }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Menyimpan pengaturan sistem...");

    const formData = new FormData(e.currentTarget);
    const res = await updateSettings(formData);

    if (res.success) {
      toast.success(res.message, { id: toastId });
    } else {
      toast.error(res.message, { id: toastId });
    }
    
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* SEKSI 1: INTEGRASI API */}
      <div className="border-b border-slate-100 pb-8">
        <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
          <i className="ri-link-m text-[hsl(var(--primary))]"></i> Integrasi API
        </h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Premify API Key</label>
            <input 
              type="text" 
              name="premifyApiKey"
              defaultValue={setting?.premifyApiKey || ""}
              placeholder="Masukkan API Key Premify Anda..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">Kunci ini digunakan untuk mengambil data katalog produk dan melakukan proses pesanan otomatis (H2H).</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">DompetX API Key</label>
            <input 
              type="text" 
              name="dompetxApiKey"
              defaultValue={setting?.dompetxApiKey || ""}
              placeholder="Masukkan API Key Gateway Pembayaran..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
            />
          </div>
        </div>
      </div>

      {/* SEKSI 2: HARGA & AKSES PUBLIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <i className="ri-price-tag-3-fill text-[hsl(var(--primary))]"></i> Harga & Keuntungan
          </h3>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Global Markup (Rp)</label>
            <input 
              type="number" 
              name="globalMarkup"
              defaultValue={setting?.globalMarkup || 0}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">Keuntungan otomatis (Rupiah) yang ditambahkan ke harga modal Premify saat sinkronisasi katalog.</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <i className="ri-shield-user-fill text-[hsl(var(--primary))]"></i> Akses Publik
          </h3>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Status Pendaftaran Akun</label>
            <select 
              name="isRegisterOpen"
              defaultValue={setting?.isRegisterOpen !== false ? "true" : "false"}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all cursor-pointer"
            >
              <option value="true">🟢 BUKA - Publik dapat mendaftar</option>
              <option value="false">🔴 TUTUP - Pendaftaran ditolak</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">Jika ditutup, halaman register akan otomatis menolak pembuatan akun pengguna baru.</p>
          </div>
        </div>
      </div>

      {/* TOMBOL SIMPAN */}
      <div className="pt-6 flex justify-end border-t border-slate-100">
        <button 
          type="submit" 
          disabled={isLoading}
          className="bg-[hsl(var(--primary))] text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-emerald-800 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <><i className="ri-loader-4-line animate-spin"></i> Menyimpan...</>
          ) : (
            <><i className="ri-save-3-fill text-lg"></i> Simpan Pengaturan</>
          )}
        </button>
      </div>
    </form>
  );
}