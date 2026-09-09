import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      // Appwrite Storage (photo binaries) — endpoint configured via env.
      {
        protocol: "https",
        hostname: "*.appwrite.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "syd.cloud.appwrite.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
