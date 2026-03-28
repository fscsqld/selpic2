/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 메인 홈페이지와 격리
  basePath: '',
  // CSS 격리
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig

