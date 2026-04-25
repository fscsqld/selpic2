import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stamp',
  title: 'Custom Stamps & Labeling Tools',
  description:
    'Create custom stamps and practical labeling tools with Selpic for office, home, and business workflows with clear, durable impressions.',
  keywords: ['custom stamps', 'labeling tools', 'stamp printing', 'office stamp australia'],
})

export default function StampLayout({ children }: { children: React.ReactNode }) {
  return children
}
