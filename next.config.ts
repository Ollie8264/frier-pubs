import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hero photos come from pubsinthesun.com's Supabase storage buckets
    // (they moved from a custom hostname to direct Supabase URLs).
    remotePatterns: [
      { protocol: "https", hostname: "sb.pubsinthesun.com", pathname: "/**" },
      { protocol: "https", hostname: "szfypeyeyvbgrwysoarl.supabase.co", pathname: "/**" },
    ],
  },
};

export default nextConfig;
