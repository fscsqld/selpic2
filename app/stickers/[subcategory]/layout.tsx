import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

type Props = {
  children: React.ReactNode
  params: Promise<{ subcategory: string }>
}

function titleFromSlug(slug: string): string {
  const s = decodeURIComponent(slug || '')
    .trim()
    .replace(/[-_]+/g, ' ')
  if (!s) return 'Sticker Collection'
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subcategory } = await params
  const slug = (subcategory || '').trim().toLowerCase()
  const label = titleFromSlug(slug)
  return buildPublicMetadata({
    path: `/stickers/${encodeURIComponent(slug)}`,
    title: `${label} Stickers`,
    description: `Shop ${label} stickers and labels at Selpic with quality print and personalization options across Australia.`,
    keywords: [label, 'stickers', 'name labels', 'Selpic'],
  })
}

export default function DynamicStickersSubcategoryLayout({ children }: Props) {
  return children
}
