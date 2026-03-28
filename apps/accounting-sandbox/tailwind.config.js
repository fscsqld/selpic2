/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Accounting 모듈 전용 색상 (메인 홈페이지와 격리)
        accounting: {
          primary: '#2563eb',
          secondary: '#64748b',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    },
  },
  plugins: [],
  // 메인 홈페이지 CSS와 충돌 방지
  // important와 prefix는 제거 (독립 프로젝트이므로 불필요)
}

