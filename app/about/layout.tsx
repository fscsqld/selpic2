import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/about',
  title: 'About Selpic',
  description:
    'Learn about Selpic in Australia, our quality standards for custom stickers and labels, and our commitment to fast turnaround and reliable support.',
  keywords: ['about selpic', 'custom stickers australia', 'label printing australia'],
})

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
