import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stickers/set',
  title: 'Sticker Sets & Label Bundles',
  description:
    'Sticker sets and label bundles from Selpic — coordinated packs with personalization options for families and gifts across Australia.',
  keywords: ['sticker sets', 'label bundles', 'name label sets', 'Selpic'],
})

export default function SetStickersLayout({ children }: { children: React.ReactNode }) {
  return children
}
