import { describe, expect, it } from 'vitest'
import {
  isRequestableStorefrontMediaUrl,
  optimizeStorefrontImageUrl,
  resolveStorefrontImageSrc,
} from './optimizeStorefrontImageUrl'

describe('isRequestableStorefrontMediaUrl', () => {
  it('rejects empty, indexeddb, and known-dead hosts', () => {
    expect(isRequestableStorefrontMediaUrl('')).toBe(false)
    expect(isRequestableStorefrontMediaUrl('indexeddb://abc')).toBe(false)
    expect(
      isRequestableStorefrontMediaUrl(
        'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
      )
    ).toBe(false)
  })

  it('rejects known-dead Unsplash photo ids without requesting them', () => {
    expect(
      isRequestableStorefrontMediaUrl(
        'https://images.unsplash.com/photo-1618472043393-b31d17f5b5d7?ixlib=rb-4.0.3&w=2070'
      )
    ).toBe(false)
    expect(
      resolveStorefrontImageSrc(
        'https://images.unsplash.com/photo-1618472043393-b31d17f5b5d7?ixlib=rb-4.0.3&w=2070'
      )
    ).toBe('')
  })

  it('allows https, same-origin, and data images', () => {
    expect(isRequestableStorefrontMediaUrl('https://cdn.example/a.png')).toBe(true)
    expect(isRequestableStorefrontMediaUrl('/apple-touch-icon.png')).toBe(true)
    expect(isRequestableStorefrontMediaUrl('data:image/png;base64,aaa')).toBe(true)
  })
})

describe('optimizeStorefrontImageUrl', () => {
  it('caps oversized Unsplash w and sets q', () => {
    const out = optimizeStorefrontImageUrl(
      'https://images.unsplash.com/photo-x?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
    )
    expect(out).toContain('w=1080')
    expect(out).toContain('q=55')
    expect(out).toContain('auto=format')
  })

  it('leaves already-small Unsplash w alone (still sets q)', () => {
    const out = optimizeStorefrontImageUrl(
      'https://images.unsplash.com/photo-x?w=800&h=600&fit=crop&q=60',
      { maxWidth: 1080, quality: 55 }
    )
    expect(out).toContain('w=800')
  })

  it('does not rewrite Supabase or same-origin URLs', () => {
    const supabase =
      'https://xyz.supabase.co/storage/v1/object/public/bucket/hero.png'
    expect(optimizeStorefrontImageUrl(supabase)).toBe(supabase)
    expect(optimizeStorefrontImageUrl('/images/local.jpg')).toBe('/images/local.jpg')
  })

  it('passes through empty and data URLs', () => {
    expect(optimizeStorefrontImageUrl('')).toBe('')
    expect(optimizeStorefrontImageUrl('data:image/png;base64,aaa')).toBe(
      'data:image/png;base64,aaa'
    )
  })

  it('upgrades http Unsplash URLs to https before sizing', () => {
    const out = optimizeStorefrontImageUrl(
      'http://images.unsplash.com/photo-x?w=2070&q=80'
    )
    expect(out.startsWith('https://')).toBe(true)
    expect(out).toContain('w=1080')
  })

  it('returns empty for dead hosts so callers skip the network', () => {
    expect(optimizeStorefrontImageUrl('https://sample-videos.com/x.mp4')).toBe('')
    expect(resolveStorefrontImageSrc('indexeddb://x')).toBe('')
  })
})
