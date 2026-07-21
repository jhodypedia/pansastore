"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { addUser, deleteUser, updateUserRole } from "@/actions/users";

type UserRole = "ADMIN" | "USER";

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: string | Date;
};

type PendingAction =
  | { type: "add"; userId?: undefined }
  | { type: "role"; userId: string }
  | { type: "delete"; userId: string }
  | null;

export default function UserTableClient({
  initialUsers,
}: {
  initialUsers: UserItem[];
}) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isAdding = pendingAction?.type === "add";

  const sortedUsers = useMemo(() => {
    return [...users].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [users]);

  const closeModal = () => {
    if (isAdding) return;
    setIsModalOpen(false);
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAdding) return;

    setPendingAction({ type: "add" });
    const toastId = toast.loading("Membuat akun baru...");

    try {
      const formData = new FormData(e.currentTarget);
      const res = await addUser(formData);

      if (!res.success || !("user" in res) || !res.user) {
        toast.error(res.message || "Gagal menambah pengguna.", { id: toastId });
        return;
      }

      const createdUser: UserItem = res.user;
      setUsers((prev) => [createdUser, ...prev]);

      toast.success(res.message, { id: toastId });
      formRef.current?.reset();
      setIsModalOpen(false);
    } catch {
      toast.error("Terjadi kesalahan saat menambah pengguna.", { id: toastId });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRoleChange = async (userId: string, currentRole: UserRole) => {
    if (pendingAction) return;

    const newRole: UserRole = currentRole === "ADMIN" ? "USER" : "ADMIN";

    const confirmed = window.confirm(
      `Yakin ingin mengubah hak akses pengguna ini menjadi ${newRole}?`
    );
    if (!confirmed) return;

    setPendingAction({ type: "role", userId });
    const toastId = toast.loading("Memperbarui hak akses...");

    try {
      const res = await updateUserRole(userId, newRole);

      if (!res.success) {
        toast.error(res.message, { id: toastId });
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast.success(res.message, { id: toastId });
    } catch {
      toast.error("Terjadi kesalahan saat memperbarui hak akses.", {
        id: toastId,
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (pendingAction) return;

    const confirmed = window.confirm(
      "AKSI PERMANEN: Apakah Anda yakin ingin menghapus pengguna ini?"
    );
    if (!confirmed) return;

    setPendingAction({ type: "delete", userId });
    const toastId = toast.loading("Menghapus akun pengguna...");

    try {
      const res = await deleteUser(userId);

      if (!res.success) {
        toast.error(res.message, { id: toastId });
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success(res.message, { id: toastId });
    } catch {
      toast.error("Terjadi kesalahan saat menghapus pengguna.", {
        id: toastId,
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="w-full relative z-10">
      <div className="mb-5 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.22em] font-black text-emerald-600">
              User Management
            </p>
            <h1 className="mt-2 text-[32px] leading-none font-black tracking-tight text-slate-900 sm:text-[40px]">
              Kelola Pengguna
            </h1>
            <p className="mt-3 text-[15px] leading-7 font-medium text-slate-500 sm:text-base">
              Tambah akun internal, ubah hak akses, dan hapus pengguna langsung
              dari satu panel yang lebih rapi.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!!pendingAction}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--primary))] active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <i className="ri-user-add-line text-lg"></i>
            Tambah Pengguna
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] font-black text-slate-400">
              Internal Directory
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {sortedUsers.length} pengguna terdaftar
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Monitoring akun internal secara real-time.
            </p>
          </div>

          <div className="hidden sm:flex h-11 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 text-xs font-bold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            Sinkron dengan database
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {sortedUsers.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-300">
              <i className="ri-group-line text-2xl"></i>
            </div>
            <p className="text-slate-800 font-bold">Belum Ada Pengguna</p>
            <p className="mt-1 text-sm text-slate-400">
              Gunakan tombol di atas untuk menambahkan akun baru.
            </p>
          </div>
        ) : (
          sortedUsers.map((user) => {
            const isRoleUpdating =
              pendingAction?.type === "role" && pendingAction.userId === user.id;
            const isDeleting =
              pendingAction?.type === "delete" &&
              pendingAction.userId === user.id;

            return (
              <div
                key={user.id}
                className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-base font-black text-slate-700">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-900">
                        {user.name || "-"}
                      </p>
                      <p className="truncate text-sm font-medium text-slate-500">
                        {user.email}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                        ID: {user.id}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={!!pendingAction}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 transition-all duration-200 hover:bg-red-500 hover:text-white disabled:opacity-60"
                    title="Hapus Akun Permanen"
                  >
                    {isDeleting ? (
                      <i className="ri-loader-4-line animate-spin"></i>
                    ) : (
                      <i className="ri-delete-bin-line"></i>
                    )}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Tanggal
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {new Date(user.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Hak Akses
                    </p>
                    <button
                      onClick={() => handleRoleChange(user.id, user.role)}
                      disabled={!!pendingAction}
                      className={`mt-1 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 disabled:opacity-60 ${
                        user.role === "ADMIN"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isRoleUpdating ? (
                        <i className="ri-loader-4-line animate-spin"></i>
                      ) : (
                        <i
                          className={
                            user.role === "ADMIN"
                              ? "ri-shield-star-line"
                              : "ri-user-3-line"
                          }
                        ></i>
                      )}
                      {isRoleUpdating ? "Proses..." : user.role}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block rounded-[30px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Tanggal Daftar
                </th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Nama Lengkap
                </th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Alamat Email
                </th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Hak Akses
                </th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Tindakan
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-16 text-center text-slate-400"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                      <i className="ri-group-line text-2xl text-slate-300"></i>
                    </div>
                    <p className="font-bold text-slate-700">Belum Ada Pengguna</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Gunakan tombol di atas untuk mendaftarkan akun internal baru.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const isRoleUpdating =
                    pendingAction?.type === "role" &&
                    pendingAction.userId === user.id;
                  const isDeleting =
                    pendingAction?.type === "delete" &&
                    pendingAction.userId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      <td className="px-8 py-5 text-slate-500 font-semibold">
                        {new Date(user.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm border border-slate-200">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 truncate">
                              {user.name || "-"}
                            </p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5 truncate max-w-[180px]">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-5 text-slate-600 font-semibold">
                        {user.email}
                      </td>

                      <td className="px-8 py-5">
                        <button
                          onClick={() => handleRoleChange(user.id, user.role)}
                          disabled={!!pendingAction}
                          title="Klik untuk mengubah level akses"
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center w-max gap-2 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                            user.role === "ADMIN"
                              ? "bg-emerald-50 text-[hsl(var(--primary))] border border-emerald-100 hover:bg-[hsl(var(--primary))] hover:text-white hover:shadow-sm"
                              : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200"
                          }`}
                        >
                          {isRoleUpdating ? (
                            <i className="ri-loader-4-line animate-spin text-sm"></i>
                          ) : (
                            <i
                              className={
                                user.role === "ADMIN"
                                  ? "ri-shield-star-fill text-sm"
                                  : "ri-user-3-fill text-sm"
                              }
                            ></i>
                          )}
                          {isRoleUpdating ? "Memperbarui..." : user.role}
                        </button>
                      </td>

                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={!!pendingAction}
                            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-500/10 transition-all flex items-center justify-center active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Hapus Akun Permanen"
                          >
                            {isDeleting ? (
                              <i className="ri-loader-4-line animate-spin text-base"></i>
                            ) : (
                              <i className="ri-delete-bin-fill text-base"></i>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeModal}
          ></div>

          <div className="relative w-full max-w-md overflow-hidden rounded-t-[30px] sm:rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] max-h-[90dvh]">
            <div className="border-b border-slate-100 px-5 pt-5 pb-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
                    Registrasi Internal
                  </p>
                  <h3 className="mt-2 text-3xl leading-none font-black tracking-tight text-slate-900">
                    Tambah Pengguna
                  </h3>
                  <p className="mt-2 text-sm leading-6 font-medium text-slate-500">
                    Buat akun baru untuk admin atau pengguna internal.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  disabled={isAdding}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            <form
              ref={formRef}
              onSubmit={handleAddSubmit}
              className="flex max-h-[90dvh] flex-col"
            >
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 sm:px-6">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    disabled={isAdding}
                    placeholder="Contoh: Jhodypedia"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-semibold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    disabled={isAdding}
                    autoComplete="email"
                    placeholder="nama@company.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-semibold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    disabled={isAdding}
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-semibold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Tingkat Akses
                  </label>
                  <div className="relative">
                    <select
                      name="role"
                      required
                      disabled={isAdding}
                      defaultValue="USER"
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-bold text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
                    >
                      <option value="USER">Pengguna (USER)</option>
                      <option value="ADMIN">Administrator (ADMIN)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                      <i className="ri-arrow-down-s-line text-lg"></i>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-bold leading-5 text-emerald-700">
                    Akun baru akan langsung aktif dan bisa dipakai login setelah
                    disimpan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isAdding}
                  className="h-12 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-bold text-white transition hover:bg-[hsl(var(--primary))] disabled:opacity-70"
                >
                  {isAdding ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base"></i>
                      Menyimpan
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line text-base"></i>
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
