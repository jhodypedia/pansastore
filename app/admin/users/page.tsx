import prisma from "@/lib/prisma";
import UserTableClient from "./UserTableClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6 w-full animate-fade-up max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kelola Pengguna
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Manajemen penuh akun admin, pengguna, dan akses sistem.
          </p>
        </div>
      </div>

      <UserTableClient initialUsers={users} />
    </div>
  );
}
