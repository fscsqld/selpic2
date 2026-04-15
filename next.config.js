const path = require('path')
const webpack = require('webpack')

/** Strip BOM / wrapping quotes (common Vercel copy-paste mistakes). */
function stripSupabaseEnvValue(s) {
  if (!s || typeof s !== 'string') return ''
  let t = s.trim().replace(/^\uFEFF/, '')
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim()
  }
  return t.trim()
}

/**
 * Force-inject Supabase public env into the JS bundle (server + client + middleware).
 * Vercel: set for each environment (Production, Preview, Development) as needed.
 */
const NEXT_PUBLIC_SUPABASE_URL = stripSupabaseEnvValue(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
)

const NEXT_PUBLIC_SUPABASE_ANON_KEY = stripSupabaseEnvValue(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
)
const NEXT_PUBLIC_DEPLOY_VERSION = stripSupabaseEnvValue(
  process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_DEPLOY_VERSION || 'dev-local'
)

if (process.env.VERCEL === '1' && !NEXT_PUBLIC_SUPABASE_URL) {
  console.warn(
    '[next.config.js] Vercel build: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL are both empty. Add to Project → Environment Variables (enable Preview if you use git branch URLs), then redeploy.'
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
    NEXT_PUBLIC_DEPLOY_VERSION,
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
    // Hard-inline public Supabase env into the browser bundle (avoids empty/undefined fetch URL).
    if (!isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(NEXT_PUBLIC_SUPABASE_URL),
          'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(NEXT_PUBLIC_SUPABASE_ANON_KEY),
        })
      )
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
        // Home is CMS-driven on the client; avoid long-lived CDN HTML cache so mobile/desktop
        // do not keep an old prerender shell / RSC payload while JS bundles are already updated.
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, no-cache, must-revalidate' }
        ]
      },
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