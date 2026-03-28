import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SELPIC A : AI Analyzer',
  description: 'AI-powered bank statement analyzer for Australian banks. Automatically categorize transactions and generate accounting reports.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}

