import { describe, expect, it } from 'vitest'
import { optimizeStorefrontImageUrl } from './optimizeStorefrontImageUrl'

describe('optimizeStorefrontImageUrl', () => {
  it('caps oversized Unsplash w and sets q', () => {
    const out = optimizeStorefrontImageUrl(
      'https://images.unsplash.com/photo-x?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
    )
    expect(out).toContain('w=1200')
    expect(out).toContain('q=60')
    expect(out).toContain('auto=format')
  })

  it('leaves already-small Unsplash w alone (still sets q)', () => {
    const out = optimizeStorefrontImageUrl(
      'https://images.unsplash.com/photo-x?w=800&h=600&fit=crop&q=60',
      { maxWidth: 1200, quality: 60 }
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
    expect(out).toContain('w=1200')
  })
})
