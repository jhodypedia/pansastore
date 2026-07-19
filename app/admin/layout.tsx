"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import NotificationBell from "@/components/NotificationBell";

interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  isLoading: boolean;
}

type DropdownType = "none" | "profile" | "notifications";

interface MenuItem {
  name: string;
  path: string;
  icon: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>("none");

  const [user, setUser] = useState<UserProfile>({
    name: "",
    email: "",
    role: "",
    avatar: null,
    isLoading: true,
  });

  const headerActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/user/profile");

        if (!response.ok) {
          throw new Error("Gagal mengambil data profil");
        }

        const data = await response.json();

        setUser({
          name: data.name || "Administrator",
          email: data.email || "admin@pansagroup.com",
          role: data.role || "ADMIN",
          avatar: data.avatar || null,
          isLoading: false,
        });
      } catch {
        setUser({
          name: "Administrator",
          email: "admin@pansagroup.com",
          role: "ADMIN",
          avatar: null,
          isLoading: false,
        });
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        headerActionsRef.current &&
        !headerActionsRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown("none");
      }
    }

    if (activeDropdown !== "none") {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown]);

  const handleLogout = () => {
    toast.loading("Memutuskan sesi aman...");
    window.location.href = "/api/auth/signout";
  };

  const getInitials = (name: string) => {
    if (!name) return "AD";

    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  };

  const isMenuActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const menuItems: MenuItem[] = [
    { name: "Ringkasan", path: "/admin", icon: "ri-dashboard-fill" },
    {
      name: "Transaksi",
      path: "/admin/transactions",
      icon: "ri-exchange-dollar-fill",
    },
    { name: "Katalog", path: "/admin/products", icon: "ri-box-3-fill" },
    { name: "Pengguna", path: "/admin/users", icon: "ri-group-fill" },
  ];

  const settingMenu: MenuItem[] = [
    {
      name: "Pengaturan API",
      path: "/admin/settings",
      icon: "ri-settings-4-fill",
    },
    {
      name: "WA Settings",
      path: "/admin/wa-settings",
      icon: "ri-whatsapp-fill",
    },
  ];

  const allMenus = [...menuItems, ...settingMenu];
  const currentPageTitle =
    allMenus.find((item) => isMenuActive(item.path))?.name || "Dashboard Admin";

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-emerald-600 selection:text-white relative overflow-x-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside
        className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.01)] transition-all duration-300 ease-in-out ${
          isSidebarOpen
            ? "w-72 translate-x-0"
            : "w-20 -translate-x-full lg:translate-x-0"
        }`}
      >
        <div
          className={`h-20 flex items-center border-b border-slate-100 transition-all duration-300 ${
            isSidebarOpen ? "px-6 justify-between" : "px-0 justify-center"
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-[hsl(var(--primary))] text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-900/10 shrink-0">
              <i className="ri-box-3-fill text-lg"></i>
            </div>
            <span
              className={`font-black text-base tracking-tight text-slate-900 whitespace-nowrap transition-all duration-300 ${
                isSidebarOpen
                  ? "opacity-100 max-w-full"
                  : "opacity-0 max-w-0 overflow-hidden"
              }`}
            >
              PANSA GROUP
            </span>
          </div>

          <button
            className="lg:hidden p-1 text-slate-400 hover:text-slate-900 rounded-lg"
            onClick={() => setIsSidebarOpen(false)}
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-7 scrollbar-none">
          <div>
            <div
              className={`text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 whitespace-nowrap transition-all duration-300 ${
                isSidebarOpen
                  ? "px-3 opacity-100"
                  : "opacity-0 h-0 overflow-hidden mb-0"
              }`}
            >
              Menu Utama
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = isMenuActive(item.path);

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() =>
                      window.innerWidth < 1024 && setIsSidebarOpen(false)
                    }
                    className={`flex items-center gap-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative ${
                      isActive
                        ? "bg-[hsl(var(--primary))] text-white shadow-md shadow-emerald-950/10"
                        : "text-slate-500 hover:bg-slate-50 hover:text-[hsl(var(--primary))]"
                    } ${isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center"}`}
                  >
                    <i
                      className={`${item.icon} text-xl transition-transform duration-200 group-hover:scale-110`}
                    ></i>
                    <span
                      className={`transition-all duration-300 whitespace-nowrap ${
                        isSidebarOpen
                          ? "opacity-100 max-w-full translate-x-0"
                          : "opacity-0 max-w-0 overflow-hidden -translate-x-4"
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <div
              className={`text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 whitespace-nowrap transition-all duration-300 ${
                isSidebarOpen
                  ? "px-3 opacity-100"
                  : "opacity-0 h-0 overflow-hidden mb-0"
              }`}
            >
              Sistem
            </div>

            <nav className="space-y-1">
              {settingMenu.map((item) => {
                const isActive = isMenuActive(item.path);

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() =>
                      window.innerWidth < 1024 && setIsSidebarOpen(false)
                    }
                    className={`flex items-center gap-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative ${
                      isActive
                        ? "bg-[hsl(var(--primary))] text-white shadow-md shadow-emerald-950/10"
                        : "text-slate-500 hover:bg-slate-50 hover:text-[hsl(var(--primary))]"
                    } ${isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center"}`}
                  >
                    <i
                      className={`${item.icon} text-xl transition-transform duration-200 group-hover:scale-110`}
                    ></i>
                    <span
                      className={`transition-all duration-300 whitespace-nowrap ${
                        isSidebarOpen
                          ? "opacity-100 max-w-full translate-x-0"
                          : "opacity-0 max-w-0 overflow-hidden -translate-x-4"
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out w-full max-w-full ${
          isSidebarOpen ? "lg:pl-72" : "lg:pl-20"
        }`}
      >
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="text-slate-500 hover:text-[hsl(var(--primary))] transition-all duration-200 p-2 rounded-xl hover:bg-slate-100 active:scale-95 cursor-pointer"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <i
                className={`ri-menu-2-line text-2xl block transition-transform duration-300 ${
                  isSidebarOpen ? "rotate-180" : "rotate-0"
                }`}
              ></i>
            </button>

            <h1 className="font-extrabold text-base text-slate-900 tracking-tight hidden sm:block">
              {currentPageTitle}
            </h1>
          </div>

          <div
            className="flex items-center gap-3 lg:gap-4 relative"
            ref={headerActionsRef}
          >
            <NotificationBell
              isOpen={activeDropdown === "notifications"}
              onToggle={() =>
                setActiveDropdown(
                  activeDropdown === "notifications" ? "none" : "notifications"
                )
              }
              onClose={() => setActiveDropdown("none")}
            />

            <div className="flex items-center gap-3 pl-3 lg:pl-4 border-l border-slate-200 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(
                    activeDropdown === "profile" ? "none" : "profile"
                  );
                }}
                className="flex items-center gap-3 focus:outline-none group text-left cursor-pointer z-50 relative"
              >
                <div className="text-right hidden md:block select-none">
                  {user.isLoading ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="h-4 w-24 bg-slate-200 animate-pulse rounded-md"></div>
                      <div className="h-2.5 w-16 bg-slate-200 animate-pulse rounded-md"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-[hsl(var(--primary))] transition-colors duration-200">
                        {user.name}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase flex items-center gap-1 justify-end">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                        {user.role}
                      </div>
                    </>
                  )}
                </div>

                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border transition-all duration-300 relative bg-cover bg-center ${
                    activeDropdown === "profile"
                      ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-md"
                      : "bg-emerald-50 text-[hsl(var(--primary))] border-emerald-100 group-hover:border-[hsl(var(--primary))]"
                  }`}
                  style={
                    user.avatar && !user.isLoading
                      ? { backgroundImage: `url(${user.avatar})` }
                      : {}
                  }
                >
                  {user.isLoading ? (
                    <i className="ri-loader-4-line animate-spin text-lg"></i>
                  ) : (
                    !user.avatar && getInitials(user.name)
                  )}

                  <div
                    className={`absolute -bottom-1 -right-1 bg-white border border-slate-200 rounded-full w-4 h-4 flex items-center justify-center text-[9px] transition-transform duration-300 ${
                      activeDropdown === "profile"
                        ? "rotate-180 text-[hsl(var(--primary))]"
                        : "rotate-0 text-slate-500"
                    }`}
                  >
                    <i className="ri-arrow-down-s-line"></i>
                  </div>
                </div>
              </button>

              {activeDropdown === "profile" && (
                <div className="absolute right-0 top-[120%] mt-2 w-64 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 animate-fade-up ring-1 ring-black/5">
                  <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-slate-200/60 rotate-45 rounded-sm"></div>

                  <div className="relative z-10">
                    <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Otorisasi Akun
                      </p>

                      {user.isLoading ? (
                        <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded mt-1"></div>
                      ) : (
                        <p
                          className="text-sm font-bold text-slate-900 truncate mt-1"
                          title={user.email}
                        >
                          {user.email}
                        </p>
                      )}
                    </div>

                    <div className="p-2">
                      <Link
                        href="/admin/profile"
                        onClick={() => setActiveDropdown("none")}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-emerald-50 hover:text-[hsl(var(--primary))] transition-all duration-150"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                          <i className="ri-user-settings-line text-lg text-slate-400"></i>
                        </div>
                        Pengaturan Profil
                      </Link>

                      <div className="h-px bg-slate-100 my-1 mx-2"></div>

                      <button
                        onClick={() => {
                          setActiveDropdown("none");
                          handleLogout();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 w-full text-left transition-all duration-150 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50/50 flex items-center justify-center shrink-0">
                          <i className="ri-logout-box-r-line text-lg text-red-400"></i>
                        </div>
                        Keluar Sistem
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10 flex-1 w-full max-w-full overflow-hidden relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
