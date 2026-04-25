import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/terms',
  title: 'Terms and Conditions',
  description:
    'Review Selpic terms and conditions for ordering, payment, delivery, returns, and service usage across the storefront.',
  keywords: ['terms and conditions', 'selpic terms', 'order policy'],
})

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
