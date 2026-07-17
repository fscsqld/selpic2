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
// Stable default for local dev: a timestamp here changes on every `next dev` restart and triggers
// StorefrontDeployVersionGuard → full reload during useLayoutEffect, which races React and causes
// removeChild NotFoundError on localhost. Bump NEXT_PUBLIC_DEPLOY_VERSION manually when you need a bust.
const NEXT_PUBLIC_DEPLOY_VERSION = stripSupabaseEnvValue(
  process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_DEPLOY_VERSION ||
    'dev-local'
)
const NEXT_PUBLIC_SITE_URL = stripSupabaseEnvValue(process.env.NEXT_PUBLIC_SITE_URL || '')

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
  allowedDevOrigins: ['192.168.1.104'],
  // iPad Safari compatibility: ensure swiper client bundle is transpiled for older WebKit engines.
  transpilePackages: ['swiper'],
  /** New id per deploy so `/_next/static/<buildId>/…` URLs change (stronger than manual ?v= on chunks). */
  generateBuildId: async () =>
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    `local-${Date.now()}`,
  env: {
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEPLOY_VERSION,
  },
  webpack: (config, { isServer, dev }) => {
    // Do NOT alias `@/lib/*` into apps/accounting-sandbox — that couples the
    // storefront bundle to accounting and has broken emails/builds. Accounting
    // runs as its own app; integrate only via HTTP (/api/accounting/*).
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    // Force fresh compilation in local dev when devices (tablet) keep stale static chunks aggressively.
    if (dev) {
      config.cache = false
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
    const securityHeaders =
      process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/:path*',
              headers: [
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
              ],
            },
          ]
        : []

    return [
      ...securityHeaders,
      {
        // Strong no-cache for HTML/API shells. Do NOT send Clear-Site-Data on document navigations:
        // browsers may wipe localStorage/sessionStorage while React is hydrating (removeChild errors).
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
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
      },
      {
        source: '/api/site-config/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' }
        ]
      }
    ]
  },
  async redirects() {
    return []
  },
}

module.exports = nextConfig