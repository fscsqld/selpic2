/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 메인 홈페이지와 격리
  basePath: '',
  // CSS 격리
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // tsc --noEmit is green (2026-08-27); do not re-enable ignoreBuildErrors.
  eslint: {
    // Prefer fixing lint over permanent ignore; leave on until eslint debt is cleared.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig

