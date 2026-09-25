import { describe, expect, it } from 'vitest'
import {
  customerLoginHrefWithNext,
  hasStorefrontLoginNext,
  sanitizeStorefrontLoginNext,
} from './storefrontLoginNext'

describe('sanitizeStorefrontLoginNext', () => {
  it('allows product and listing paths', () => {
    expect(sanitizeStorefrontLoginNext('/products/abc')).toBe('/products/abc')
    expect(sanitizeStorefrontLoginNext('/stickers')).toBe('/stickers')
    expect(sanitizeStorefrontLoginNext('/hot-goods?filter=1')).toBe('/hot-goods?filter=1')
  })

  it('blocks open redirects and admin/api', () => {
    expect(sanitizeStorefrontLoginNext('https://evil.com')).toBeNull()
    expect(sanitizeStorefrontLoginNext('//evil.com')).toBeNull()
    expect(sanitizeStorefrontLoginNext('/admin/dashboard')).toBeNull()
    expect(sanitizeStorefrontLoginNext('/api/orders')).toBeNull()
    expect(sanitizeStorefrontLoginNext('/auth/callback')).toBeNull()
  })

  it('builds login href with encoded next', () => {
    expect(customerLoginHrefWithNext('/products/x')).toBe('/login?next=%2Fproducts%2Fx')
    expect(customerLoginHrefWithNext('/admin')).toBe('/login')
    expect(hasStorefrontLoginNext('/products/1')).toBe(true)
    expect(hasStorefrontLoginNext('/admin')).toBe(false)
  })
})
