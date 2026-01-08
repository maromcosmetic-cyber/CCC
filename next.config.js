/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mendable/firecrawl-js', 'undici'],
  experimental: {
    serverComponentsExternalPackages: ['@mendable/firecrawl-js', 'undici'],
  },
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'maromcosmetic.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig


