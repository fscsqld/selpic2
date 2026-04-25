import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/privacy',
  title: 'Privacy Policy',
  description:
    'Read Selpic privacy policy covering data collection, account information handling, and customer rights for online purchases.',
  keywords: ['privacy policy', 'selpic privacy', 'customer data policy'],
})

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
