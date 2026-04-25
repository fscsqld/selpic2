import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stickers',
  title: 'Custom Stickers',
  description:
    'Shop custom stickers at Selpic with waterproof finishes, premium print quality, and fast Australia-wide delivery for personal or business use.',
  keywords: ['custom stickers', 'waterproof stickers', 'sticker printing australia'],
})

export default function StickersLayout({ children }: { children: React.ReactNode }) {
  return children
}
