import { describe, expect, it } from 'vitest'
import {
  dedupeLinkedSlidesAgainstPrimary,
  isUsablePrimaryGalleryUrl,
  normalizeMediaCompareUrl,
  orderProductGallerySlides,
} from './productGallerySlides'

describe('productGallerySlides', () => {
  const primary =
    'https://bmeyyierrvjbjikliheo.supabase.co/storage/v1/object/public/selpic-contents/cms/product-media/a.webp'
  const extra =
    'https://bmeyyierrvjbjikliheo.supabase.co/storage/v1/object/public/selpic-contents/hotgoods/b.webp'

  it('normalizes proxy and query variants to the same compare key', () => {
    const proxied = `/api/storefront-media?u=${encodeURIComponent(primary)}`
    expect(normalizeMediaCompareUrl(proxied)).toBe(normalizeMediaCompareUrl(primary))
    expect(normalizeMediaCompareUrl(`${primary}?x=1`)).toBe(normalizeMediaCompareUrl(primary))
  })

  it('rejects unusable primary urls', () => {
    expect(isUsablePrimaryGalleryUrl('')).toBe(false)
    expect(isUsablePrimaryGalleryUrl('indexeddb://x')).toBe(false)
    expect(isUsablePrimaryGalleryUrl(primary)).toBe(true)
  })

  it('prepends primary and drops a linked duplicate of the same asset', () => {
    const linked = [
      { compareUrl: primary, id: 'dup' },
      { compareUrl: extra, id: 'extra' },
    ]
    const ordered = orderProductGallerySlides({
      primaryUrl: primary,
      linked,
      buildPrimary: () => ({ compareUrl: primary, id: 'primary' }),
    })
    expect(ordered.map((r) => r.id)).toEqual(['primary', 'extra'])
  })

  it('leaves linked-only order when primary missing', () => {
    const linked = [{ compareUrl: extra, id: 'extra' }]
    expect(dedupeLinkedSlidesAgainstPrimary(linked, '')).toEqual(linked)
    expect(
      orderProductGallerySlides({
        primaryUrl: '',
        linked,
        buildPrimary: () => ({ compareUrl: primary, id: 'primary' }),
      }).map((r) => r.id)
    ).toEqual(['extra'])
  })
})
