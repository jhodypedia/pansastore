"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { addUser, deleteUser, updateUserRole } from "@/actions/users";

export default function UserTableClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === FUNGSI: TAMBAH PENGGUNA ===
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("Membuat akun baru...");

    const formData = new FormData(e.currentTarget);
    const res = await addUser(formData);

    if (res.success && res.user) {
      setUsers([res.user, ...users]);
      toast.success(res.message, { id: toastId });
      setIsModalOpen(false); 
    } else {
      toast.error(res.message || "Gagal menambah pengguna", { id: toastId });
    }
    setIsSubmitting(false);
  };

  // === FUNGSI: UBAH LEVEL AKSES (ROLE) ===
  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "EMPLOYEE" : "ADMIN";
    if (!window.confirm(`Yakin ingin mengubah hak akses pengguna ini menjadi ${newRole}?`)) return;

    const toastId = toast.loading("Memperbarui hak akses...");
    const res = await updateUserRole(userId, newRole);

    if (res.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(res.message, { id: toastId });
    } else {
      toast.error(res.message, { id: toastId });
    }
  };

  // === FUNGSI: HAPUS PENGGUNA PERMANEN ===
  const handleDelete = async (userId: string) => {
    if (!window.confirm("AKSI PERMANEN: Apakah Anda yakin ingin menghapus pengguna ini?")) return;

    const toastId = toast.loading("Menghapus akun pengguna...");
    const res = await deleteUser(userId);

    if (res.success) {
      setUsers(users.filter(u => u.id !== userId));
      toast.success(res.message, { id: toastId });
    } else {
      toast.error(res.message, { id: toastId });
    }
  };

  return (
    <div className="w-full relative z-10">
      
      {/* Tombol Tambah Pengguna */}
      <div className="flex justify-end mb-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[hsl(var(--primary))] hover:shadow-lg hover:shadow-emerald-900/10 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer"
        >
          <i className="ri-user-add-fill text-lg"></i> Tambah Pengguna
        </button>
      </div>

      {/* Tabel Utama Responsif */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.01)] overflow-hidden flex flex-col">
        <div className="overflow-x-auto rounded-3xl">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50/70 border-b border-slate-200/60">
                  <tr>
                    <th className="px-8 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Tanggal Daftar</th>
                    <th className="px-8 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</th>
                    <th className="px-8 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Alamat Email</th>
                    <th className="px-8 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Hak Akses</th>
                    <th className="px-8 py-4.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                          <i className="ri-group-line text-2xl text-slate-300"></i>
                        </div>
                        <p className="font-bold text-slate-700">Belum Ada Pengguna</p>
                        <p className="text-xs text-slate-400 mt-1">Gunakan tombol di atas untuk mendaftarkan akun internal baru.</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                        <td className="px-8 py-5 text-slate-500 font-semibold">
                          {new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-8 py-5 font-black text-slate-900">{user.name || "-"}</td>
                        <td className="px-8 py-5 text-slate-600 font-semibold">{user.email}</td>
                        <td className="px-8 py-5">
                          <button 
                            onClick={() => handleRoleChange(user.id, user.role)}
                            title="Klik untuk mengubah level akses"
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center w-max gap-1.5 group active:scale-95 cursor-pointer ${
                              user.role === 'ADMIN' 
                                ? 'bg-emerald-50 text-[hsl(var(--primary))] border border-emerald-100 hover:bg-[hsl(var(--primary))] hover:text-white hover:shadow-sm' 
                                : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
                            }`}
                          >
                            <i className={user.role === 'ADMIN' ? 'ri-shield-star-fill text-sm' : 'ri-user-3-fill text-sm'}></i>
                            {user.role}
                          </button>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center">
                            <button 
                              onClick={() => handleDelete(user.id)}
                              className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-500/10 transition-all flex items-center justify-center active:scale-95 cursor-pointer" 
                              title="Hapus Akun Permanen"
                            >
                              <i className="ri-delete-bin-fill text-base"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL EDIT & ADD PENGGUNA BARU (HIGH-END DESIGN OVERLAY)       */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Smooth Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          ></div>
          
          {/* Modal Card Structure */}
          <div className="relative bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden animate-fade-up ring-1 ring-black/5 border border-slate-100">
            
            {/* Header Modal - Sticky */}
            <div className="px-8 pt-8 pb-4 shrink-0 bg-white z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-2xl text-slate-900 tracking-tight">Registrasi Internal</h3>
                  <p className="text-slate-400 text-sm mt-1 font-medium">Tambahkan anggota tim atau manajemen baru ke sistem.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleAddSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto px-8 py-3 space-y-5 custom-scrollbar flex-1">
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Nama Lengkap</label>
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    placeholder="Contoh: Jhodypedia"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))] transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Alamat Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    required 
                    placeholder="nama@company.com"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))] transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Kata Sandi</label>
                    <input 
                      type="password" 
                      name="password" 
                      required 
                      placeholder="••••••••"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))] transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Tingkat Akses (Role)</label>
                    <div className="relative">
                      <select 
                        name="role" 
                        required
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[hsl(var(--primary))] transition-all cursor-pointer appearance-none"
                      >
                        <option value="EMPLOYEE">Karyawan (EMPLOYEE)</option>
                        <option value="ADMIN">Administrator (ADMIN)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <i className="ri-arrow-down-s-line text-lg"></i>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Modal - Sticky */}
              <div className="px-8 py-5 mt-4 flex items-center justify-end gap-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-slate-900 text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[hsl(var(--primary))] hover:shadow-lg hover:shadow-emerald-900/10 active:scale-95 transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <><i className="ri-loader-4-line animate-spin text-base"></i> Menyimpan</>
                  ) : (
                    <><i className="ri-check-line text-lg"></i> Simpan Akun</>
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