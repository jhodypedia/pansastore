"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { syncPremifyProducts } from "@/actions/sync";

interface SyncButtonProps {
  label?: string;
  icon?: string;
}

export default function SyncButton({ label = "Sinkronisasi API", icon = "ri-refresh-line" }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Menarik data katalog dari API...");

    try {
      const res = await syncPremifyProducts();
      if (res?.success) {
        toast.success(res.message, { id: toastId });
      } else {
        toast.error(res?.message || "Gagal sinkronisasi", { id: toastId });
      }
    } catch (error) {
      toast.error("Terjadi kesalahan pada server lokal.", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button 
      onClick={handleSync}
      disabled={isSyncing}
      className="bg-[hsl(var(--primary))] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-800 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200 w-full sm:w-auto flex items-center justify-center gap-2 relative z-20 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:transform-none"
    >
      <i className={`${isSyncing ? "ri-loader-4-line animate-spin" : icon} text-lg`}></i>
      {isSyncing ? "Memproses..." : label}
    </button>
  );
}