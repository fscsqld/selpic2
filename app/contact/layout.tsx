import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/contact',
  title: 'Contact Selpic',
  description:
    'Contact Selpic in Australia for Market S orders, custom name stickers, shipping, and returns. Based in Brisbane — email, phone, or use the form on this page.',
  keywords: [
    'contact selpic',
    'Market S support',
    'name sticker help',
    'Selpic Australia',
  ],
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
