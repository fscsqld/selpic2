import type { Metadata } from 'next'
import { readCatalogProducts } from '@/lib/server/catalogStore'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au').replace(/\/$/, '')

function absoluteImageUrl(image?: string): string | undefined {
  if (!image) return undefined
  if (image.startsWith('http://') || image.startsWith('https://')) return image
  if (image.startsWith('/')) return `${siteUrl}${image}`
  return undefined
}

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const canonical = `${siteUrl}/products/${encodeURIComponent(id)}`

  const catalog = await readCatalogProducts()
  const p = catalog.find((x) => x.id === id)

  const pageTitle = p ? `${p.name} | Selpic` : 'Product | Selpic'
  const description = p
    ? (p.description || '').replace(/\s+/g, ' ').trim().slice(0, 160) || `${p.name} — Selpic`
    : 'View product details, pricing, and availability at Selpic.'
  const ogImage = absoluteImageUrl(p?.image)

  return {
    /** `absolute` avoids stacking with root `metadata.title.template` (`%s | Selpic`). */
    title: { absolute: pageTitle },
    description,
    alternates: { canonical },
    openGraph: {
      title: pageTitle,
      description,
      url: canonical,
      siteName: 'Selpic',
      type: 'product',
      locale: 'en_AU',
      ...(ogImage ? { images: [{ url: ogImage }] } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {})
    },
    robots: { index: true, follow: true }
  }
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
