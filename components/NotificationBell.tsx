"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface NotificationBellProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function NotificationBell({ isOpen, onToggle, onClose }: NotificationBellProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (data.success) {
          setCount(data.count);
        }
      } catch (error) {
        console.error("Gagal mengambil notifikasi");
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling 10 detik
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Tombol Bel */}
      <button 
        onClick={(e) => {
          e.stopPropagation(); // Cegah bentrok klik
          onToggle();
        }}
        className={`transition-all duration-200 p-2 rounded-xl relative cursor-pointer active:scale-95 z-50 ${
          isOpen ? "bg-emerald-50 text-[hsl(var(--primary))]" : "text-slate-400 hover:text-[hsl(var(--primary))] hover:bg-slate-50"
        }`}
      >
        <i className="ri-notification-3-fill text-2xl"></i>
        {count > 0 && (
          <span className="absolute top-2 right-2 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* Dropdown Notifikasi */}
      {isOpen && (
        <div className="absolute right-0 top-[120%] mt-2 w-72 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 animate-fade-up ring-1 ring-black/5">
          <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-slate-200/60 rotate-45 rounded-sm"></div>
          
          <div className="relative z-10">
            <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notifikasi</p>
              {count > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {count} Baru
                </span>
              )}
            </div>
            
            <div className="p-2 max-h-[300px] overflow-y-auto">
              {count > 0 ? (
                <Link 
                  href="/admin/transactions"
                  onClick={onClose}
                  className="flex gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <i className="ri-exchange-dollar-fill text-amber-500 text-lg group-hover:scale-110 transition-transform"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Menunggu Pembayaran</p>
                    <p className="text-xs text-slate-500 mt-0.5">Ada {count} transaksi berstatus PENDING yang butuh perhatian.</p>
                  </div>
                </Link>
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="ri-check-double-line text-slate-300 text-xl"></i>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Semua Beres!</p>
                  <p className="text-xs text-slate-500 mt-1">Tidak ada notifikasi baru saat ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}