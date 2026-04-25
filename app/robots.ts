import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Keep a single canonical host for Search Console and avoid local/preview confusion.
  const base = 'https://selpic.com.au'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/callback']
      }
    ],
    host: base,
    sitemap: [`${base}/sitemap.xml`]
  }
}
