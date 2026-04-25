import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/contact',
  title: 'Contact Selpic',
  description:
    'Contact Selpic for help with custom sticker orders, product questions, delivery timelines, and artwork guidance across Australia.',
  keywords: ['contact selpic', 'sticker support', 'custom label help'],
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
