import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Stripe SDK references __dirname for its CA cert bundle
      config.node = { ...config.node, __dirname: true }
    }
    return config
  },
}

export default nextConfig
