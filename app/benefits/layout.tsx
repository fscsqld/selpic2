import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/benefits',
  title: 'Member Benefits',
  description:
    'Learn about Selpic member benefits, VIP grades, and rewards for customers shopping custom stickers and labels in Australia.',
  keywords: ['Selpic benefits', 'VIP stickers', 'member rewards australia'],
})

export default function BenefitsLayout({ children }: { children: React.ReactNode }) {
  return children
}
