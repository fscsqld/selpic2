import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/fundraising',
  title: 'School Fundraising with Stickers',
  description:
    'Raise funds for your Australian school or club with Selpic sticker fundraising — simple packs, quality print, and partner support.',
  keywords: ['school fundraising', 'sticker fundraising', 'Selpic fundraising', 'Australia'],
})

export default function FundraisingLayout({ children }: { children: React.ReactNode }) {
  return children
}
