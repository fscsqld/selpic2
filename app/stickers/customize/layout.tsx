import GoogleFontsLinks from '@/components/GoogleFontsLinks'
import {
  getStickerGoogleFontsUrls,
  STICKER_NOTO_FALLBACK_BUNDLE_URL,
} from '@/lib/fontList'

/** Font 1–7 + compact Noto fallbacks for live preview — not loaded on homepage. */
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
