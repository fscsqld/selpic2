import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stickers',
  title: 'Custom Stickers & Labels',
  description:
    'Shop custom stickers and personalized labels at Selpic with waterproof finishes, premium print quality, and fast Australia-wide delivery.',
  keywords: [
    'custom stickers',
    'personalized labels',
    'waterproof labels',
    'sticker printing australia',
  ],
})

export default function StickersLayout({ children }: { children: React.ReactNode }) {
  return children
}
