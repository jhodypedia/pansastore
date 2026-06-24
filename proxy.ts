import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const authRoutes = ["/login", "/register"]; // Tambahkan /register agar kalau sudah login tidak bisa register lagi

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isUserRoute = nextUrl.pathname.startsWith("/dashboard");

  if (isApiAuthRoute) return NextResponse.next();

  // 1. Jika sudah login tapi mencoba buka halaman login/register
  if (isAuthRoute) {
    if (isLoggedIn) {
      if (userRole === "ADMIN") return NextResponse.redirect(new URL("/admin", nextUrl));
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // 2. PENGECEKAN SUPER KETAT: Jika BELUM login, dilarang masuk admin & dashboard
  if (!isLoggedIn && (isAdminRoute || isUserRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 3. DINDING BAJA: USER biasa tidak boleh masuk Admin
  if (isAdminRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // 4. DINDING BAJA: ADMIN tidak perlu masuk ke dashboard User biasa
  if (isUserRoute && userRole === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};