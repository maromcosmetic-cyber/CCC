import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maromcosmetic.com',
      },
    ],
  },
};

export default nextConfig;
