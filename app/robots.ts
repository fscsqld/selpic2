import type { MetadataRoute } from 'next'
import { getPublicSiteUrl } from '@/lib/publicSiteUrl'

export default function robots(): MetadataRoute.Robots {
  // Match the live primary host (www). Apex redirects to www in Vercel Domains.
  const base = getPublicSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/callback',
          '/forgot-password',
          '/reset-password',
          '/auth/forgot-password',
          '/auth/reset-password',
        ],
      },
    ],
    host: base,
    sitemap: [`${base}/sitemap.xml`],
  }
}
