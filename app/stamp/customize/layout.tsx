import GoogleFontsLinks from '@/components/GoogleFontsLinks'
import {
  getStampGoogleFontsUrls,
  STICKER_NOTO_FALLBACK_BUNDLE_URL,
} from '@/lib/fontList'

/** Stamp customize offers the full FONT_LIST — load only here, not sitewide. */
export default function StampCustomizeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <GoogleFontsLinks
        hrefs={getStampGoogleFontsUrls()}
        extraHrefs={[STICKER_NOTO_FALLBACK_BUNDLE_URL]}
      />
      {children}
    </>
  )
}
