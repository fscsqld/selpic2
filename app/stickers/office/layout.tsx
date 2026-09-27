import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stickers/office',
  title: 'Office Stickers & Labels',
  description:
    'Office stickers and labels from Selpic for desks, files, and workplace personalization with crisp print and durable finishes.',
  keywords: ['office stickers', 'office labels', 'desk labels', 'Selpic'],
})

export default function OfficeStickersLayout({ children }: { children: React.ReactNode }) {
  return children
}
