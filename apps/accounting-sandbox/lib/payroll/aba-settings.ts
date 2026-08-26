/**
 * Persisted ABA funding / user settings (Phase real-use).
 * Stored in localStorage so Settings + Remittance panel share one source.
 */

import { COMPANY_BANK, COMPANY_LEGAL } from '@/lib/companyLegal'
import { inferFinancialInstitutionFromBsb } from '@/src/features/payroll/aba-export'

export const ABA_SETTINGS_STORAGE_KEY = 'selpic_aba_payment_settings'

export interface AbaPaymentSettings {
  userIdNumber: string
  bsb: string
  accountNumber: string
  userName: string
  remitterName: string
  financialInstitution: string
}

export function defaultAbaPaymentSettings(): AbaPaymentSettings {
  return {
    userIdNumber: '000000',
    bsb: COMPANY_BANK.bsb,
    accountNumber: COMPANY_BANK.accountNumber,
    userName: COMPANY_LEGAL.companyName,
    remitterName: COMPANY_LEGAL.companyName.slice(0, 16),
    financialInstitution: inferFinancialInstitutionFromBsb(COMPANY_BANK.bsb),
  }
}

export function loadAbaPaymentSettings(): AbaPaymentSettings {
  const base = defaultAbaPaymentSettings()
  if (typeof window === 'undefined') return base
  try {
    const raw = localStorage.getItem(ABA_SETTINGS_STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<AbaPaymentSettings>
    return {
      ...base,
      ...parsed,
      userIdNumber: String(parsed.userIdNumber || base.userIdNumber)
        .replace(/\D/g, '')
        .slice(0, 6)
        .padStart(6, '0'),
    }
  } catch {
    return base
  }
}

export function saveAbaPaymentSettings(settings: AbaPaymentSettings): void {
  if (typeof window === 'undefined') return
  const next: AbaPaymentSettings = {
    ...settings,
    userIdNumber: String(settings.userIdNumber || '000000')
      .replace(/\D/g, '')
      .slice(0, 6)
      .padStart(6, '0'),
    financialInstitution:
      settings.financialInstitution ||
      inferFinancialInstitutionFromBsb(settings.bsb),
  }
  localStorage.setItem(ABA_SETTINGS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(
    new CustomEvent('abaPaymentSettingsUpdated', { detail: next })
  )
}
