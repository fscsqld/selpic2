import type { Metadata } from 'next'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au').replace(/\/$/, '')
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/logo.png`

type PublicSeoInput = {
  path: string
  title: string
  description: string
  keywords?: string[]
}

export function buildPublicMetadata(input: PublicSeoInput): Metadata {
  const canonical = `${SITE_URL}${input.path.startsWith('/') ? input.path : `/${input.path}`}`
  const title = `${input.title} | Selpic`
  const keywords = input.keywords || []

  return {
    title,
    description: input.description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description: input.description,
      url: canonical,
      siteName: 'Selpic',
      locale: 'en_AU',
      type: 'website',
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: 'Selpic storefront preview',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: input.description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}
