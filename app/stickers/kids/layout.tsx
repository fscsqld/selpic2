import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stickers/kids',
  title: 'Kids Stickers & Name Labels',
  description:
    'Kids stickers and name labels from Selpic — fun designs, tough materials, and easy customization for lunchboxes, bottles, and school gear.',
  keywords: ['kids stickers', 'kids name labels', 'school labels', 'Selpic'],
})

export default function KidsStickersLayout({ children }: { children: React.ReactNode }) {
  return children
}
