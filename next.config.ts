import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Autorise l'envoi de PDF (jusqu'à 5 Mo) et de CSV via les Server Actions
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
