import { describe, expect, it } from 'vitest'
import {
  dedupeLinkedSlidesAgainstPrimary,
  isUsablePrimaryGalleryUrl,
  mergeProductGalleryMediaSources,
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

  it('uses server gallery when Admin media-store exists but this SKU has no local links', () => {
    const remote = [
      { id: 'r1', order: 2, url: extra },
      { id: 'r0', order: 1, url: primary },
    ]
    const merged = mergeProductGalleryMediaSources({
      hasClientMediaStore: true,
      local: [],
      remote,
      remoteLoaded: true,
    })
    expect(merged.map((r) => r.id)).toEqual(['r0', 'r1'])
  })

  it('keeps local Admin links when present even if media-store flag is on', () => {
    const local = [{ id: 'local-only', order: 1, url: extra }]
    const remote = [{ id: 'r0', order: 1, url: primary }]
    const merged = mergeProductGalleryMediaSources({
      hasClientMediaStore: true,
      local,
      remote,
      remoteLoaded: true,
    })
    expect(merged.map((r) => r.id)).toEqual(['local-only'])
  })
})
