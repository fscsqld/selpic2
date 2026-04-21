import type { MetadataRoute } from 'next'
import { readCatalogProducts } from '@/lib/server/catalogStore'

/**
 * Static public routes + `/products/[id]` from `data/catalog/products.json`.
 * The JSON file is updated when an admin (products:write) saves the catalog while logged in,
 * if CATALOG_SYNC_SECRET / NEXT_PUBLIC_CATALOG_SYNC_SECRET are set.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au').replace(/\/$/, '')
  const now = new Date()
  const catalog = await readCatalogProducts()
  const latestCatalogUpdate = catalog
    .map((p) => (p.updatedAt ? Date.parse(p.updatedAt) : NaN))
    .filter((v) => Number.isFinite(v))
    .reduce((max, v) => Math.max(max, v), 0)
  const catalogLastModified = latestCatalogUpdate ? new Date(latestCatalogUpdate) : now

  const paths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'] }[] = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/stickers', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/stickers/custom', priority: 0.85, changeFrequency: 'monthly' },
    { path: '/stickers/customize', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/stickers/basic', priority: 0.75, changeFrequency: 'weekly' },
    { path: '/stickers/kids', priority: 0.75, changeFrequency: 'weekly' },
    { path: '/stickers/office', priority: 0.75, changeFrequency: 'weekly' },
    { path: '/stickers/premium', priority: 0.75, changeFrequency: 'weekly' },
    { path: '/stickers/set', priority: 0.75, changeFrequency: 'weekly' },
    { path: '/stamp', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/stamp/customize', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/phone-cases', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/hot-goods', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/custom-design', priority: 0.75, changeFrequency: 'monthly' },
    { path: '/customize', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/bundle', priority: 0.65, changeFrequency: 'monthly' },
    { path: '/bundle/customize', priority: 0.65, changeFrequency: 'monthly' },
    { path: '/cart', priority: 0.5, changeFrequency: 'daily' },
    { path: '/checkout', priority: 0.6, changeFrequency: 'daily' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.65, changeFrequency: 'monthly' },
    { path: '/help', priority: 0.55, changeFrequency: 'monthly' },
    { path: '/benefits', priority: 0.55, changeFrequency: 'monthly' },
    { path: '/community', priority: 0.55, changeFrequency: 'weekly' },
    { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/refund', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/login', priority: 0.35, changeFrequency: 'monthly' },
    { path: '/login/personal', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/register', priority: 0.35, changeFrequency: 'monthly' },
    { path: '/forgot-password', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/reset-password', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/orders', priority: 0.35, changeFrequency: 'monthly' },
    { path: '/profile', priority: 0.35, changeFrequency: 'monthly' },
    { path: '/promo-codes', priority: 0.35, changeFrequency: 'monthly' },
    { path: '/unsubscribe', priority: 0.2, changeFrequency: 'yearly' }
  ]

  const staticEntries = paths.map(({ path: routePath, priority, changeFrequency }) => ({
    url: `${base}${routePath}`,
    lastModified: now,
    changeFrequency,
    priority
  }))

  const productEntries: MetadataRoute.Sitemap = catalog
    .filter((p) => p.hasDetailPage !== false)
    .map((p) => ({
      url: `${base}/products/${encodeURIComponent(p.id)}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8
    }))

  // Ensure high-value catalog index pages use the latest product timestamp.
  const catalogPageEntries: MetadataRoute.Sitemap = [
    {
      url: `${base}/stickers`,
      lastModified: catalogLastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/stamp`,
      lastModified: catalogLastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/phone-cases`,
      lastModified: catalogLastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]

  const merged = [...staticEntries, ...catalogPageEntries, ...productEntries]
  const deduped = new Map<string, MetadataRoute.Sitemap[number]>()
  for (const entry of merged) deduped.set(entry.url, entry)
  return Array.from(deduped.values())
}
