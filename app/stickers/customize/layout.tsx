import type { Metadata } from 'next'
import GoogleFontsLinks from '@/components/GoogleFontsLinks'
import {
  getStickerGoogleFontsUrls,
  STICKER_NOTO_FALLBACK_BUNDLE_URL,
} from '@/lib/fontList'

/**
 * Customize is a tooling surface — noindex (also omitted from sitemap).
 * Fonts stay here for live preview; not loaded on homepage.
 */
export const metadata: Metadata = {
  title: { absolute: 'Customize Stickers | Selpic' },
  robots: { index: false, follow: false },
}

export default function StickersCustomizeLayout({
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
