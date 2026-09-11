import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { COMPANY_CONTACT, COMPANY_LEGAL } from '@/lib/companyLegal'
import { getPublicSiteUrl } from '@/lib/publicSiteUrl'
import ClientSwCacheReset from '@/components/ClientSwCacheReset'

const inter = Inter({ subsets: ['latin'], display: 'swap', preload: true })
const siteUrl = getPublicSiteUrl()
const siteName = 'Selpic'
const siteTitle = 'Custom Stickers & Name Labels Australia | Selpic'
const siteDescription =
  'Order custom stickers and waterproof name labels in Australia with Selpic. Fast turnaround, premium print quality, and easy online personalization for school, home, and business.'
const defaultOgImage = `${siteUrl.replace(/\/$/, '')}/images/logo.png`

/** Ensures phones/tablets use device width; viewportFit helps safe-area on notched iOS; theme for browser chrome. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
    'waterproof name labels',
    'school name labels',
    'waterproof stickers',
    'personalized labels',
    'custom labels australia',
    'Selpic',
    'Australia',
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    // Resolve canonical to each current route instead of forcing every page to "/".
    canonical: './',
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
  verification: {
    google: 'FW1UlAfZluDdHCWqsZZwHvUyLwizz9NgVEMvFaXKpkE',
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
    icon: [
      { url: '/images/logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/images/logo.png'],
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
  // Machine / customize Google Fonts are NOT loaded here — only on sticker/stamp
  // customize layouts (see GoogleFontsLinks). Homepage keeps next/font Inter only.
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
      <body className={inter.className}>
        <ClientSwCacheReset />
        {children}
      </body>
    </html>
  )
}