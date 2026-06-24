import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  
  // Ambil data detail user dari database berdasarkan email di session
  const user = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pengaturan Akun</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">Kelola data profil dan keamanan akun Anda.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <ProfileForm user={user} />
      </div>
    </div>
  );
}