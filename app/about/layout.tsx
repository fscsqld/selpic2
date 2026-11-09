import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/about',
  title: 'About Selpic',
  description:
    'Selpic is based in Brisbane, Australia. We offer Market S K-beauty essentials and personalised name stickers, with careful fulfilment and clear customer support.',
  keywords: [
    'about selpic',
    'Market S Australia',
    'name stickers australia',
    'K-beauty Brisbane',
  ],
})

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
