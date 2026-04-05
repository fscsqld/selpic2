const path = require('path')

/**
 * Supabase URL/anon must be available to the browser bundle and middleware for Storage + Auth.
 * Vercel/Supabase docs sometimes use SUPABASE_URL / SUPABASE_ANON_KEY only; map them so fetch
 * does not target undefined hosts when NEXT_PUBLIC_* was omitted.
 */
function resolvePublicSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim()
}

function resolvePublicSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim()
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: resolvePublicSupabaseUrl(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: resolvePublicSupabaseAnonKey(),
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