import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hero photos come from pubsinthesun.com's Supabase storage bucket.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sb.pubsinthesun.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
