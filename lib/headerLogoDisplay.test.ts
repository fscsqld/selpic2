import { describe, expect, it } from 'vitest'
import {
  HEADER_LOGO_STATIC_FALLBACKS,
  STOREFRONT_LOGO_PNG,
  STOREFRONT_LOGO_WEBP,
  STOREFRONT_PRODUCT_IMAGE_PLACEHOLDER,
} from './headerLogoDisplay'

describe('headerLogoDisplay static assets', () => {
  it('only lists shipped public logo paths (no SVG 404s)', () => {
    expect(HEADER_LOGO_STATIC_FALLBACKS).toContain(STOREFRONT_LOGO_WEBP)
    expect(HEADER_LOGO_STATIC_FALLBACKS).toContain(STOREFRONT_LOGO_PNG)
    for (const path of HEADER_LOGO_STATIC_FALLBACKS) {
      expect(path.endsWith('.svg')).toBe(false)
      expect(path).not.toMatch(/placeholder-product/)
    }
  })

  it('product image placeholder points at an existing static PNG', () => {
    expect(STOREFRONT_PRODUCT_IMAGE_PLACEHOLDER).toBe('/images/logo.png')
  })
})
