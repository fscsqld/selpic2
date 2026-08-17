import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/promo-codes',
  title: 'Promo Codes',
  description:
    'View and manage your Selpic promo codes and community rewards for checkout discounts on custom stickers and name labels.',
  keywords: ['selpic promo code', 'discount code', 'community reward'],
})

export default function PromoCodesLayout({ children }: { children: React.ReactNode }) {
  return children
}
