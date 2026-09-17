import { describe, expect, it } from 'vitest'
import {
  isBrowserLikelyOffline,
  isTransientSiteConfigNetworkError,
} from './siteConfigNetworkError'

describe('isTransientSiteConfigNetworkError', () => {
  it('treats Failed to fetch / AbortError as transient', () => {
    expect(isTransientSiteConfigNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    expect(isTransientSiteConfigNetworkError(abort)).toBe(true)
  })

  it('treats Chromium suspended / unreachable network codes as transient', () => {
    expect(
      isTransientSiteConfigNetworkError(new TypeError('net::ERR_NETWORK_IO_SUSPENDED'))
    ).toBe(true)
    expect(
      isTransientSiteConfigNetworkError(new TypeError('net::ERR_ADDRESS_UNREACHABLE'))
    ).toBe(true)
    expect(
      isTransientSiteConfigNetworkError(new Error('net::ERR_INTERNET_DISCONNECTED'))
    ).toBe(true)
  })

  it('does not treat auth-style messages as transient', () => {
    expect(
      isTransientSiteConfigNetworkError(
        new Error('Sign in with a Supabase admin email. Legacy local admin cannot save CMS.')
      )
    ).toBe(false)
  })
})

describe('isBrowserLikelyOffline', () => {
  it('returns a boolean without throwing in this environment', () => {
    expect(typeof isBrowserLikelyOffline()).toBe('boolean')
  })
})
