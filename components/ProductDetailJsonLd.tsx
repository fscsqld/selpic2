'use client'

import { useMemo } from 'react'
import type { Product } from '@/lib/store'

function getSiteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au').replace(/\/$/, '')
}

function toAbsoluteUrl(baseUrl: string, maybeUrl?: string): string | undefined {
  if (!maybeUrl) return undefined
  if (maybeUrl.startsWith('indexeddb://') || maybeUrl.startsWith('data:')) return undefined
  if (maybeUrl.startsWith('http://') || maybeUrl.startsWith('https://')) return maybeUrl
  const normalizedPath = maybeUrl.startsWith('/') ? maybeUrl : `/${maybeUrl}`
  return `${baseUrl.replace(/\/$/, '')}${normalizedPath}`
}

function categoryListPath(category: string): { path: string; name: string } {
  switch (category) {
    case 'Stickers':
      return { path: '/stickers', name: 'Stickers' }
    case 'Stamps':
      return { path: '/stamp', name: 'Stamps' }
    case 'PhoneCases':
      return { path: '/phone-cases', name: 'Phone Cases' }
    case 'HotGoods':
      return { path: '/hot-goods', name: 'Market S' }
    default:
      return { path: '/', name: 'Home' }
  }
}

export default function ProductDetailJsonLd({ product, productId }: { product: Product; productId: string }) {
  const json = useMemo(() => {
    const base = getSiteBase()
    const pageUrl = `${base}/products/${productId}`
    const img =
      toAbsoluteUrl(base, product.fallbackImage && isPublic(product.fallbackImage) ? product.fallbackImage : undefined) ||
      toAbsoluteUrl(base, product.image)
    const stockQty =
      typeof product.stockQuantity === 'number' ? Math.max(0, product.stockQuantity) : undefined
    const out = typeof stockQty === 'number' ? stockQty === 0 : !product.inStock

    const { path: catPath, name: catName } = categoryListPath(product.category)
    const catUrl = `${base}${catPath}`

    const breadcrumbItems =
      catPath === '/'
        ? [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
            { '@type': 'ListItem', position: 2, name: product.name, item: pageUrl }
          ]
        : [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
            { '@type': 'ListItem', position: 2, name: catName, item: catUrl },
            { '@type': 'ListItem', position: 3, name: product.name, item: pageUrl }
          ]

    const breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems
    }

    const brandName = product.brand?.trim()
    const productNode: Record<string, unknown> = {
      '@type': 'Product',
      name: product.name,
      description: (product.detailDescription || product.description || `${product.name} at Selpic`).slice(0, 5000),
      sku: productId,
      url: pageUrl,
      ...(img ? { image: [img] } : {}),
      ...(brandName ? { brand: { '@type': 'Brand', name: brandName } } : { brand: { '@type': 'Brand', name: 'Selpic' } }),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'AUD',
        price: Number(product.price).toFixed(2),
        availability: out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        url: pageUrl
      }
    }

    if (
      typeof product.rating === 'number' &&
      typeof product.reviews === 'number' &&
      product.reviews > 0
    ) {
      productNode.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(product.rating).toFixed(1),
        reviewCount: Math.max(1, Math.floor(product.reviews))
      }
    }

    return JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [breadcrumb, productNode]
    })
  }, [product, productId])

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

function isPublic(url: string): boolean {
  return !url.startsWith('indexeddb://') && !url.startsWith('data:')
}
