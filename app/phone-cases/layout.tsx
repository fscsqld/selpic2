import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/phone-cases',
  title: 'Custom Phone Cases',
  description:
    'Design custom phone cases with Selpic using your own artwork, photos, or brand graphics with quality materials and vivid color print.',
  keywords: ['custom phone case', 'personalized phone case', 'phone case printing australia'],
})

export default function PhoneCasesLayout({ children }: { children: React.ReactNode }) {
  return children
}
