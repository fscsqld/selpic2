import { describe, expect, it } from 'vitest'
import { isTransientSiteConfigNetworkError } from './siteConfigNetworkError'

describe('isTransientSiteConfigNetworkError', () => {
  it('treats Failed to fetch / AbortError as transient', () => {
    expect(isTransientSiteConfigNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    expect(isTransientSiteConfigNetworkError(abort)).toBe(true)
  })

  it('does not treat auth-style messages as transient', () => {
    expect(
      isTransientSiteConfigNetworkError(
        new Error('Sign in with a Supabase admin email. Legacy local admin cannot save CMS.')
      )
    ).toBe(false)
  })
})
