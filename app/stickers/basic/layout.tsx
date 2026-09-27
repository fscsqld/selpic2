import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

/** Parent stickers/layout sets hub SEO; this layout overrides canonical for /stickers/basic. */
export const metadata: Metadata = buildPublicMetadata({
  path: '/stickers/basic',
  title: 'Basic Name Labels & Stickers',
  description:
    'Shop Basic stickers and name labels at Selpic — durable materials, clear print, and easy personalization for everyday use in Australia.',
  keywords: ['basic stickers', 'name labels', 'school labels australia', 'Selpic'],
})

export default function BasicStickersLayout({ children }: { children: React.ReactNode }) {
  return children
}
