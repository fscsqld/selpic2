import { describe, expect, it } from 'vitest'
import { ADMIN_FLOATING_CHROME } from './adminFloatingChrome'

describe('ADMIN_FLOATING_CHROME', () => {
  it('reserves bottom content padding for the sound FAB', () => {
    expect(ADMIN_FLOATING_CHROME.contentPadClass).toMatch(/pb-\d+/)
  })

  it('keeps sound FAB and CMS badge in opposite corners', () => {
    expect(ADMIN_FLOATING_CHROME.soundFabClass).toMatch(/\bleft-4\b/)
    expect(ADMIN_FLOATING_CHROME.soundFabClass).not.toMatch(/\bright-\d+\b/)
    expect(ADMIN_FLOATING_CHROME.siteConfigBadgeClass).toMatch(/\bright-3\b/)
    expect(ADMIN_FLOATING_CHROME.siteConfigBadgeClass).not.toMatch(/\bleft-\d+\b/)
  })
})
