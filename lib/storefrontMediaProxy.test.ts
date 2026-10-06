import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  canonicalStorefrontMediaUrl,
  isProxiedSupabasePublicStorageUrl,
  isStorefrontMediaProxyUrl,
  resolveUpstreamStorefrontMediaUrl,
  toSameOriginStorefrontMediaUrl,
  unwrapStorefrontMediaProxyUrl,
} from './storefrontMediaProxy'

const SAMPLE =
  'https://bmeyyierrvjbjikliheo.supabase.co/storage/v1/object/public/selpic-contents/cms/hero-banner/x.webp'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('storefrontMediaProxy', () => {
  it('detects public Supabase storage URLs when env host matches', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://bmeyyierrvjbjikliheo.supabase.co')
    expect(isProxiedSupabasePublicStorageUrl(SAMPLE)).toBe(true)
    expect(
      isProxiedSupabasePublicStorageUrl(
        'https://other.supabase.co/storage/v1/object/public/bucket/a.webp'
      )
    ).toBe(false)
    expect(
      isProxiedSupabasePublicStorageUrl(
        'https://bmeyyierrvjbjikliheo.supabase.co/storage/v1/object/sign/secret'
      )
    ).toBe(false)
  })

  it('rewrites to same-origin proxy and unwraps back', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://bmeyyierrvjbjikliheo.supabase.co')
    const proxied = toSameOriginStorefrontMediaUrl(SAMPLE)
    expect(proxied.startsWith('/api/storefront-media?u=')).toBe(true)
    expect(isStorefrontMediaProxyUrl(proxied)).toBe(true)
    expect(unwrapStorefrontMediaProxyUrl(proxied)).toBe(SAMPLE)
    expect(canonicalStorefrontMediaUrl(proxied)).toBe(SAMPLE)
    expect(toSameOriginStorefrontMediaUrl(proxied)).toBe(proxied)
  })

  it('leaves local and non-supabase URLs alone', () => {
    expect(toSameOriginStorefrontMediaUrl('/apple-touch-icon.png')).toBe('/apple-touch-icon.png')
    expect(toSameOriginStorefrontMediaUrl('https://images.unsplash.com/photo-x')).toBe(
      'https://images.unsplash.com/photo-x'
    )
  })

  it('API resolver rejects invalid and nested proxy targets', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://bmeyyierrvjbjikliheo.supabase.co')
    expect(resolveUpstreamStorefrontMediaUrl(SAMPLE)).toBe(SAMPLE)
    expect(resolveUpstreamStorefrontMediaUrl('https://evil.example/x.png')).toBe(null)
    expect(
      resolveUpstreamStorefrontMediaUrl(
        `/api/storefront-media?u=${encodeURIComponent(SAMPLE)}`
      )
    ).toBe(null)
  })
})
