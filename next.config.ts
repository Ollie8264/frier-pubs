import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hero photos come from pubsinthesun.com's Supabase storage buckets
    // (they moved from a custom hostname to direct Supabase URLs). Plus
    // Wikipedia/Wikimedia for historic pubs we don't have PITS photos of.
    remotePatterns: [
      { protocol: "https", hostname: "sb.pubsinthesun.com", pathname: "/**" },
      { protocol: "https", hostname: "szfypeyeyvbgrwysoarl.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/**" },
    ],
  },
};

export default nextConfig;
