import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/custom-design',
  title: 'Custom Design Service',
  description:
    'Work with Selpic custom design services to turn your ideas into ready-to-print sticker and merchandise designs with practical guidance.',
  keywords: ['custom design service', 'sticker artwork help', 'design to print'],
})

export default function CustomDesignLayout({ children }: { children: React.ReactNode }) {
  return children
}
