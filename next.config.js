const path = require('path')

/**
 * Force-inject Supabase public env into the JS bundle (server + client + middleware).
 * Vercel build must have at least one of NEXT_PUBLIC_* or SUPABASE_* per line below.
 */
const NEXT_PUBLIC_SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).trim()

const NEXT_PUBLIC_SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim()

if (process.env.VERCEL === '1' && !NEXT_PUBLIC_SUPABASE_URL) {
  console.warn(
    '[next.config.js] Production build on Vercel: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL are both empty. Set either in Project → Settings → Environment Variables, then redeploy.'
  )
}
if (process.env.VERCEL === '1' && NEXT_PUBLIC_SUPABASE_URL && !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[next.config.js] NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY missing at build time.'
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    if (!isServer && config.output) {
      // Dev/slow disks: avoid spurious ChunkLoadError on large layout chunks
      config.output.chunkLoadTimeout = 180000
    }
    return config
  },
  // Silence Turbopack vs webpack config warnings when using `next build --webpack`
  turbopack: {},
  images: {
    unoptimized: true
  },
  devIndicators: {
    position: 'bottom-right'
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    // In development, long-lived immutable caching on /_next/static can cause
    // stale chunks after HMR → ChunkLoadError / timeout loading app/layout.js.
    const longCache =
      process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/_next/static/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable'
                }
              ]
            },
            {
              source: '/uploads/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable'
                }
              ]
            },
            {
              source: '/images/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable'
                }
              ]
            },
            {
              source: '/videos/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable'
                }
              ]
            }
          ]
        : []

    return [
      ...longCache,
      {
        // Dynamic checkout/cart pages must stay real-time
        source: '/checkout',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' }
        ]
      },
      {
        source: '/cart',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' }
        ]
      },
      {
        // Payment/order-related APIs should never be cached
        source: '/api/orders/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' }
        ]
      },
      {
        source: '/api/catalog/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' }
        ]
      }
    ]
  },
}

module.exports = nextConfig