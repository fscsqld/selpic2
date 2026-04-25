import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/help',
  title: 'Help Center',
  description:
    'Find answers about ordering, file setup, shipping, and product options in the Selpic help center for faster support.',
  keywords: ['selpic help', 'ordering guide', 'sticker faq'],
})

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
