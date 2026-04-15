import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Required: Stripe and Hostaway webhook handlers need the raw body
  // This is handled via the route config (no global bodyParser disable needed in App Router)
  experimental: {
    serverComponentsExternalPackages: ['twilio'],
  },
}

export default nextConfig
