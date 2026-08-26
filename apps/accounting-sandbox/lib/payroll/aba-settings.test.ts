/**
 * ABA payment settings persist + normalize.
 */

import { afterEach, describe, expect, it } from 'vitest'
import {
  ABA_SETTINGS_STORAGE_KEY,
  defaultAbaPaymentSettings,
  loadAbaPaymentSettings,
  saveAbaPaymentSettings,
} from '@/lib/payroll/aba-settings'

afterEach(() => {
  localStorage.removeItem(ABA_SETTINGS_STORAGE_KEY)
})

describe('aba-settings', () => {
  it('returns company defaults when empty', () => {
    const s = loadAbaPaymentSettings()
    const d = defaultAbaPaymentSettings()
    expect(s.bsb).toBe(d.bsb)
    expect(s.userIdNumber).toBe('000000')
  })

  it('persists and reloads, padding user id to 6 digits', () => {
    saveAbaPaymentSettings({
      ...defaultAbaPaymentSettings(),
      userIdNumber: '123',
      remitterName: 'SELPIC PTY LTD',
      bsb: '062-000',
    })
    const loaded = loadAbaPaymentSettings()
    expect(loaded.userIdNumber).toBe('000123')
    expect(loaded.remitterName).toBe('SELPIC PTY LTD')
    expect(loaded.bsb).toBe('062-000')
  })

  it('ignores corrupt JSON and falls back to defaults', () => {
    localStorage.setItem(ABA_SETTINGS_STORAGE_KEY, '{not-json')
    const s = loadAbaPaymentSettings()
    expect(s.userIdNumber).toBe(defaultAbaPaymentSettings().userIdNumber)
  })
})
