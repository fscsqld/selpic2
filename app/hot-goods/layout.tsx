import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/hot-goods',
  title: 'Market S',
  description:
    'Shop Market S K-beauty and everyday care essentials at Selpic — sheet masks, curated packs, and Australia-wide shipping from Brisbane.',
  keywords: [
    'Market S',
    'K-beauty Australia',
    'sheet masks australia',
    'Selpic Market S',
  ],
})

export default function HotGoodsLayout({ children }: { children: React.ReactNode }) {
  return children
}
