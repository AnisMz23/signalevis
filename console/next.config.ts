import type { NextConfig } from "next";

// Console entièrement dynamique (session par utilisateur) : pas de Cache Components.
const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;
