import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/refund',
  title: 'Refund Policy',
  description:
    'Check Selpic refund policy and return conditions for custom products, order issues, and support escalation steps.',
  keywords: ['refund policy', 'return policy', 'selpic support'],
})

export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return children
}
