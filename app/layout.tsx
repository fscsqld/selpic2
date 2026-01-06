import type { Metadata } from 'next'
import './globals.css'

import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: 'SelPic2',
  description: '커스터마이징 스티커 쇼핑몰',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-dvh">
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

