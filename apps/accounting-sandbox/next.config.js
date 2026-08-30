/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  // 메인 홈페이지와 격리
  basePath: '',
  // CSS 격리
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Monorepo: prefer this app root for file tracing (avoids picking repo-root lockfile).
  outputFileTracingRoot: path.join(__dirname),
  // tsc --noEmit is green (2026-08-27); do not re-enable ignoreBuildErrors.
  // ESLint: next lint reports warnings only (0 errors) — do not re-enable ignoreDuringBuilds.
}

module.exports = nextConfig

