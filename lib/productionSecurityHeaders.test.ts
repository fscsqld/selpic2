import { describe, expect, it } from 'vitest'
import {
  CROSS_ORIGIN_OPENER_POLICY,
  buildProductionContentSecurityPolicy,
} from './productionSecurityHeaders'

describe('productionSecurityHeaders', () => {
  it('CSP includes XSS-relevant default-src and script-src', () => {
    const csp = buildProductionContentSecurityPolicy()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toMatch(/script-src[^;]*'self'/)
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('upgrade-insecure-requests')
    expect(csp).not.toContain('block-all-mixed-content')
  })

  it('allows https connect/media for Supabase and CMS', () => {
    const csp = buildProductionContentSecurityPolicy()
    expect(csp).toMatch(/connect-src[^;]*https:/)
    expect(csp).toMatch(/img-src[^;]*https:/)
    expect(csp).toMatch(/media-src[^;]*https:/)
  })

  it('uses popup-safe COOP', () => {
    expect(CROSS_ORIGIN_OPENER_POLICY).toBe('same-origin-allow-popups')
  })
})
