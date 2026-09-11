import { describe, expect, it } from 'vitest'
import {
  PUBLIC_SITE_CONFIG_CACHE_CONTROL,
  PUBLIC_SITE_CONFIG_NO_STORE,
} from './publicSiteConfigCache'

describe('publicSiteConfigCache', () => {
  it('allows short shared cache with SWR', () => {
    expect(PUBLIC_SITE_CONFIG_CACHE_CONTROL).toContain('s-maxage=60')
    expect(PUBLIC_SITE_CONFIG_CACHE_CONTROL).toContain('stale-while-revalidate')
    expect(PUBLIC_SITE_CONFIG_CACHE_CONTROL).not.toContain('no-store')
  })

  it('keeps no-store for error responses', () => {
    expect(PUBLIC_SITE_CONFIG_NO_STORE).toBe('no-store')
  })
})
