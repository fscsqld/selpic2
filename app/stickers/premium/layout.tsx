import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stickers/premium',
  title: 'Premium Stickers & Labels',
  description:
    'Premium stickers and waterproof name labels from Selpic with higher-end finishes and sharp personalization for school and gifts.',
  keywords: ['premium stickers', 'waterproof name labels', 'Selpic australia'],
})

export default function PremiumStickersLayout({ children }: { children: React.ReactNode }) {
  return children
}
