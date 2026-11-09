import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/help',
  title: 'Help Centre',
  description:
    'Find answers about Market S skincare, name stickers, shipping, returns, payments, and AICIS registration in the Selpic Help Centre.',
  keywords: [
    'selpic help',
    'Market S FAQ',
    'name sticker shipping',
    'refund policy australia',
  ],
})

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
