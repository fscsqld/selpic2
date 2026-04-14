import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getAllGoogleFontsUrls } from '@/lib/fontList'
import { COMPANY_CONTACT, COMPANY_LEGAL } from '@/lib/companyLegal'

const inter = Inter({ subsets: ['latin'] })
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au'

/** Ensures phones use the same responsive layout scale as desktop browsers (no accidental zoomed-out “desktop site”). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'SELPIC - Premium Sticker Shop',
  description: 'Create your own unique stickers with SELPIC. Premium quality, waterproof, and customizable stickers for every occasion.',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'SELPIC - Premium Sticker Shop',
    description:
      'Create your own unique stickers with SELPIC. Premium quality, waterproof, and customizable stickers for every occasion.',
    url: siteUrl,
    siteName: 'SELPIC',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SELPIC - Premium Sticker Shop',
    description:
      'Create your own unique stickers with SELPIC. Premium quality, waterproof, and customizable stickers for every occasion.'
  },
  robots: {
    index: true,
    follow: true
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Stampzone machine: load Google Fonts for label printer
  const googleFontsUrls = getAllGoogleFontsUrls()
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY_LEGAL.companyName,
    url: siteUrl,
    email: COMPANY_CONTACT.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY_CONTACT.address,
      addressCountry: 'AU'
    }
  }
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SELPIC',
    url: siteUrl
  }
  
  return (
    <html lang="en">
      <head>
        {/* ✅ Google Fonts CDN 로드 */}
        {googleFontsUrls.map((url) => (
          <link key={url} rel="stylesheet" href={url} />
        ))}
        {/* ✅ 한글 폰트 추가 로드 (Google Fonts에 있는 실제 한글 폰트들) */}
        <link key="preconnect-googleapis" rel="preconnect" href="https://fonts.googleapis.com" />
        <link key="preconnect-gstatic" rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          key="stylesheet-ko-bundle"
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Jua&family=Do+Hyeon&family=Nanum+Gothic:wght@400;700;800&family=Nanum+Brush+Script&family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          key="jsonld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          key="jsonld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}