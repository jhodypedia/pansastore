import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
