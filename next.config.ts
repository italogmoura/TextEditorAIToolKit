import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Custom server handles this — disable Next.js built-in server
  // when running via server.ts

  // Desabilitar cache de filesystem do Turbopack em dev
  // Sem isso o .next/ cresce sem limite (chegou a 41 GB)
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
