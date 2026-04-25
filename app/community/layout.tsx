import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/community',
  title: 'Selpic Community',
  description:
    'Join the Selpic community to discover ideas, share creations, and stay updated on product launches and creative inspiration.',
  keywords: ['selpic community', 'creative sticker ideas', 'customer showcase'],
})

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children
}
