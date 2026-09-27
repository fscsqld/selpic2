import type { MetadataRoute } from 'next'
import { getPublicSiteUrl } from '@/lib/publicSiteUrl'

/**
 * Crawl rules for Google Search Console.
 * Allow public shop URLs; block admin/API/auth and private commerce/account paths.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/cart',
          '/checkout',
          '/orders',
          '/profile',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/unsubscribe',
          '/success',
        ],
      },
    ],
    host: base,
    sitemap: [`${base}/sitemap.xml`],
  }
}
