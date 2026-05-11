import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: config => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  turbopack: {
    resolveAlias: {
      "accounts": "./src/lib/empty-module.js"
    }
  }
};

export default nextConfig;
