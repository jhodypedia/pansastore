import prisma from "@/lib/prisma";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Ambil pengaturan pertama (karena kita menggunakan sistem 1 baris konfigurasi global)
  const setting = await prisma.appSetting.findFirst();
  
  return (
    <div className="space-y-6 animate-fade-up max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pengaturan Sistem</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">Konfigurasi API Pihak Ketiga dan aturan global PansaStore.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        {/* Panggil Client Component Form di sini */}
        <SettingsForm setting={setting} />
      </div>
    </div>
  );
}