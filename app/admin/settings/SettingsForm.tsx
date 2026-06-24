"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { updateSettings } from "@/actions/setting";

export default function SettingsForm({ setting }: { setting: any }) {
  const [isLoading, setIsLoading] = useState(false);
  
  // State khusus untuk mengontrol visual Toggle Switch
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(
    setting?.isRegisterOpen !== false
  );

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
          <i className="ri-link-m text-[hsl(var(--primary))]"></i> Integrasi API Gateway & Provider
        </h3>
        
        <div className="space-y-5">
          {/* PREMIFY */}
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

          {/* PAKASIR API KEY */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pakasir API Key</label>
            <input 
              type="text" 
              name="pakasirApiKey"
              defaultValue={setting?.pakasirApiKey || ""}
              placeholder="Masukkan API Key Gateway Pakasir..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">Dapatkan token autentikasi ini melalui pengaturan profil di dashboard Pakasir Anda.</p>
          </div>

          {/* PAKASIR PROJECT SLUG */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pakasir Project Slug</label>
            <input 
              type="text" 
              name="pakasirProjectSlug"
              defaultValue={setting?.pakasirProjectSlug || ""}
              placeholder="Contoh: pansas-tore-12345"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">Slug proyek unik yang tertera di URL atau detail proyek pada dashboard Pakasir Anda.</p>
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
            <label className="block text-sm font-bold text-slate-700 mb-3">Status Pendaftaran Akun</label>
            
            {/* Input hidden untuk mengirim nilai ke server */}
            <input type="hidden" name="isRegisterOpen" value={isRegisterOpen.toString()} />
            
            {/* Tampilan Visual Toggle Switch */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
              <button
                type="button"
                role="switch"
                aria-checked={isRegisterOpen}
                onClick={() => setIsRegisterOpen(!isRegisterOpen)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-opacity-75 ${
                  isRegisterOpen ? "bg-[hsl(var(--primary))]" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Pendaftaran</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                    isRegisterOpen ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              
              <div className="flex flex-col">
                <span className={`text-sm font-extrabold ${isRegisterOpen ? "text-[hsl(var(--primary))]" : "text-slate-500"}`}>
                  {isRegisterOpen ? "PENDAFTARAN BUKA" : "PENDAFTARAN DITUTUP"}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {isRegisterOpen 
                    ? "Publik dapat mendaftar akun baru secara bebas." 
                    : "Hanya admin yang dapat membuat akun via database."}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* TOMBOL SIMPAN */}
      <div className="pt-6 flex justify-end border-t border-slate-100">
        <button 
          type="submit" 
          disabled={isLoading}
          className="bg-[hsl(var(--primary))] text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition-all duration-300 shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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
