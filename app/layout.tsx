import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getAllGoogleFontsUrls } from '@/lib/fontList'
import { COMPANY_CONTACT, COMPANY_LEGAL } from '@/lib/companyLegal'

const inter = Inter({ subsets: ['latin'] })
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au'
const siteName = 'Selpic'
const siteTitle = 'Selpic | Premium Custom Stickers in Australia'
const siteDescription =
  'Create premium custom name labels, stickers, and personalized products with Selpic. Waterproof quality, fast turnaround, and easy online ordering across Australia.'
const defaultOgImage = `${siteUrl.replace(/\/$/, '')}/images/logo.png`

/** Ensures phones use the same responsive layout scale as desktop browsers (no accidental zoomed-out “desktop site”). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#34aadc',
}

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: '%s | Selpic',
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    'custom stickers',
    'name labels',
    'waterproof stickers',
    'personalized labels',
    'Selpic',
    'Australia',
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName,
    locale: 'en_AU',
    type: 'website',
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: 'Selpic custom sticker storefront',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: 'default',
  },
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
    name: 'Selpic',
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