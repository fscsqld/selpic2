'use client'

import { useMemo } from 'react'

type SeoProduct = {
  id?: string
  name?: string
  description?: string
  image?: string
  price?: number
  category?: string
  brand?: string
  inStock?: boolean
  rating?: number
  reviews?: number
}

function toAbsoluteUrl(baseUrl: string, maybeUrl?: string): string | undefined {
  if (!maybeUrl) return undefined
  if (maybeUrl.startsWith('http://') || maybeUrl.startsWith('https://')) return maybeUrl
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedPath = maybeUrl.startsWith('/') ? maybeUrl : `/${maybeUrl}`
  return `${normalizedBase}${normalizedPath}`
}

export default function SeoProductJsonLd({
  pageName,
  pagePath,
  products
}: {
  pageName: string
  pagePath: string
  products: SeoProduct[]
}) {
  const json = useMemo(() => {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au').replace(/\/$/, '')
    const pageUrl = `${siteUrl}${pagePath.startsWith('/') ? pagePath : `/${pagePath}`}`

    const itemListElement = (products || [])
      .filter((p) => p && p.name && typeof p.price === 'number')
      .slice(0, 50)
      .map((p, idx) => {
        const productUrl = `${siteUrl}/products/${p.id || idx + 1}`
        const imageUrl = toAbsoluteUrl(siteUrl, p.image)
        return {
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': 'Product',
            name: p.name,
            description: p.description || `${p.name} by Selpic`,
            ...(imageUrl ? { image: [imageUrl] } : {}),
            ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
            category: p.category || pageName,
            url: productUrl,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'AUD',
              price: Number(p.price).toFixed(2),
              availability:
                p.inStock === false
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock',
              url: productUrl
            },
            ...(typeof p.rating === 'number' && typeof p.reviews === 'number' && p.reviews > 0
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: Number(p.rating).toFixed(1),
                    reviewCount: Math.max(1, Math.floor(p.reviews))
                  }
                }
              : {})
          }
        }
      })

    const payload = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: pageName,
          url: pageUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: 'Selpic',
            url: siteUrl
          }
        },
        {
          '@type': 'ItemList',
          name: `${pageName} Product List`,
          numberOfItems: itemListElement.length,
          itemListElement
        }
      ]
    }

    return JSON.stringify(payload)
  }, [pageName, pagePath, products])

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

