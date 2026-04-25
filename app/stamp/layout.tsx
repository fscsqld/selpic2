import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stamp',
  title: 'Custom Stamps',
  description:
    'Create custom stamps with Selpic for office, personal, and business workflows, with durable materials and clear impressions.',
  keywords: ['custom stamps', 'stamp printing', 'office stamp australia'],
})

export default function StampLayout({ children }: { children: React.ReactNode }) {
  return children
}
