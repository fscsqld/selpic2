import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/hot-goods',
  title: 'Trending Products',
  description:
    'Explore trending and limited products from Selpic, including popular sticker and merchandise options updated for current demand.',
  keywords: ['trending stickers', 'limited edition products', 'selpic market s'],
})

export default function HotGoodsLayout({ children }: { children: React.ReactNode }) {
  return children
}
