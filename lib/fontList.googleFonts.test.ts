/**
 * Font CDN URL helpers — homepage must not load machine/customize fonts.
 */

import { describe, expect, it } from 'vitest'
import {
  getAllGoogleFontsUrls,
  getStampGoogleFontsUrls,
  getStickerFonts,
  getStickerGoogleFontsUrls,
  STICKER_NOTO_FALLBACK_BUNDLE_URL,
} from './fontList'

describe('fontList Google Fonts scoping', () => {
  it('exposes exactly 7 sticker customer options', () => {
    expect(getStickerFonts()).toHaveLength(7)
  })

  it('sticker CDN set is smaller than full/stamp set', () => {
    const sticker = getStickerGoogleFontsUrls()
    const stamp = getStampGoogleFontsUrls()
    expect(sticker.length).toBeGreaterThanOrEqual(5)
    expect(sticker.length).toBeLessThan(stamp.length)
    expect(stamp).toEqual(getAllGoogleFontsUrls())
  })

  it('sticker URLs cover Font 1–7 families (Andika + Edu + Jua + Nanum)', () => {
    const joined = getStickerGoogleFontsUrls().join(' ')
    expect(joined).toMatch(/Andika/)
    expect(joined).toMatch(/Edu\+NSW/)
    expect(joined).toMatch(/Jua/)
    expect(joined).toMatch(/Nanum\+Myeongjo/)
    expect(joined).not.toMatch(/Pacifico/)
    expect(joined).not.toMatch(/Montserrat/)
  })

  it('Noto fallback bundle stays separate (optional extra on customize routes)', () => {
    expect(STICKER_NOTO_FALLBACK_BUNDLE_URL).toContain('Noto+Sans+KR')
    expect(getStickerGoogleFontsUrls()).not.toContain(STICKER_NOTO_FALLBACK_BUNDLE_URL)
  })
})
