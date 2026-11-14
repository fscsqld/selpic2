import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/hot-goods',
  title: 'K-Beauty',
  description:
    'Shop K-beauty essentials at Selpic — sheet masks, curated care packs, and Australia-wide shipping from Brisbane.',
  keywords: [
    'K-beauty Australia',
    'sheet masks australia',
    'Korean skincare Australia',
    'Brisbane',
    'Selpic',
  ],
})

export default function HotGoodsLayout({ children }: { children: React.ReactNode }) {
  return children
}
