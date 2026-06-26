import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hanya perlu ini saja untuk mendukung modul murni Node.js seperti Prisma
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
