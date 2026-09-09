import GoogleFontsLinks from '@/components/GoogleFontsLinks'
import {
  getStickerGoogleFontsUrls,
  STICKER_NOTO_FALLBACK_BUNDLE_URL,
} from '@/lib/fontList'

export default function BundleCustomizeLayout({
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
