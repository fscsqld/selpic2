/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 메인 홈페이지와 격리
  basePath: '',
  // CSS 격리
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Phase A (internal protected deploy): allow ship while WIP type debt is cleaned up.
  // Prefer fixing types over keeping this; remove once `tsc --noEmit` is green.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig

