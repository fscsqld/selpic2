import type { Metadata } from 'next'
import GoogleFontsLinks from '@/components/GoogleFontsLinks'
import {
  getStickerGoogleFontsUrls,
  STICKER_NOTO_FALLBACK_BUNDLE_URL,
} from '@/lib/fontList'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/stickers/custom',
  title: 'Bespoke Custom Stickers',
  description:
    'Request bespoke custom stickers and labels with Selpic — tailored sizes, artwork support, and quality print for Australian schools and brands.',
  keywords: ['bespoke stickers', 'custom labels', 'custom sticker printing', 'Selpic'],
})

/** Bespoke sticker custom flow — same Font 1–7 CDN set as stickers/customize. */
export default function StickersCustomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <GoogleFontsLinks
        hrefs={getStickerGoogleFontsUrls()}
        extraHrefs={[STICKER_NOTO_FALLBACK_BUNDLE_URL]}
      />
      {children}
    </>
  )
}
