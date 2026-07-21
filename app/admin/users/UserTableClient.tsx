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

  const isRowBusy = (userId: string) =>
    pendingAction?.userId === userId &&
    (pendingAction.type === "role" || pendingAction.type === "delete");

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

      if (!res.success) {
        toast.error(res.message, { id: toastId });
        return;
      }

      if (res.user) {
        setUsers((prev) => [res.user, ...prev]);
      }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Manajemen Pengguna
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Kelola akun internal, role akses, dan status pengguna aktif.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!!pendingAction}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[hsl(var(--primary))] hover:shadow-lg hover:shadow-emerald-900/10 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <i className="ri-user-add-fill text-lg"></i>
          Tambah Pengguna
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.01)] overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] font-black text-slate-400">
                Internal Directory
              </p>
              <p className="text-slate-800 font-bold mt-1">
                Total {sortedUsers.length} pengguna terdaftar
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Sinkron dengan database
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-b-3xl">
          <table className="min-w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50/70 border-b border-slate-200/60">
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
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
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
                  const rowBusy = isRowBusy(user.id);
                  const isRoleUpdating =
                    pendingAction?.type === "role" && pendingAction.userId === user.id;
                  const isDeleting =
                    pendingAction?.type === "delete" && pendingAction.userId === user.id;

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
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm border border-slate-200">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">
                              {user.name || "-"}
                            </p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">
                              ID: {user.id.slice(0, 10)}...
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

                        {rowBusy && (
                          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
                            Memproses
                          </p>
                        )}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeModal}
          ></div>

          <div className="relative bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden animate-fade-up ring-1 ring-black/5 border border-slate-100">
            <div className="px-8 pt-8 pb-4 shrink-0 bg-white z-10 border-b border-slate-100">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] font-black text-emerald-500">
                    Registrasi Internal
                  </p>
                  <h3 className="font-black text-2xl text-slate-900 tracking-tight mt-1">
                    Tambah Pengguna Baru
                  </h3>
                  <p className="text-slate-400 text-sm mt-1 font-medium">
                    Buat akun baru untuk anggota tim, operator, atau admin panel.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  disabled={isAdding}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            <form
              ref={formRef}
              onSubmit={handleAddSubmit}
              className="flex flex-col overflow-hidden"
            >
              <div className="overflow-y-auto px-8 py-6 space-y-5 custom-scrollbar flex-1">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    disabled={isAdding}
                    placeholder="Contoh: Jhodypedia"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))] transition-all duration-200 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    disabled={isAdding}
                    placeholder="nama@company.com"
                    autoComplete="email"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))] transition-all duration-200 disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Kata Sandi
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      disabled={isAdding}
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Minimal 6 karakter"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))] transition-all duration-200 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Tingkat Akses
                    </label>
                    <div className="relative">
                      <select
                        name="role"
                        required
                        disabled={isAdding}
                        defaultValue="USER"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))] transition-all cursor-pointer appearance-none disabled:opacity-60"
                      >
                        <option value="USER">Pengguna (USER)</option>
                        <option value="ADMIN">Administrator (ADMIN)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <i className="ri-arrow-down-s-line text-lg"></i>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                  <p className="text-xs font-bold text-emerald-700">
                    Akun baru akan langsung aktif dan bisa dipakai login setelah disimpan.
                  </p>
                </div>
              </div>

              <div className="px-8 py-5 mt-2 flex items-center justify-end gap-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isAdding}
                  className="px-5 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="bg-slate-900 text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[hsl(var(--primary))] hover:shadow-lg hover:shadow-emerald-900/10 active:scale-95 transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isAdding ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base"></i>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line text-lg"></i>
                      Simpan Akun
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
