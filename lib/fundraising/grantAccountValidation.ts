/**
 * Official Grant Account field validation (admin Partner Registry + Mark Paid checks).
 * Partners request changes from Lookup; they do not save bank details themselves.
 * Phase 1: format / checksum. Phase 2 (post-deploy): recognised BSB directory — see cursor rule.
 */

import { abnValidationError, digitsOnlyAbn } from '@/lib/fundraising/abn'

export const GRANT_ACCOUNT_ERRORS = {
  accountNameRequired: 'Account name is required. Use the official organisation account name.',
  abnRequired: 'ABN is required.',
  abnLength: 'ABN must be exactly 11 digits.',
  abnChecksum:
    'ABN failed checksum validation. Please check the number (or ask your school office for the correct ABN).',
  bsbLength: 'BSB must be exactly 6 digits (numbers only).',
  bsbUnrecognised:
    'This BSB is not recognised. Please check the number with your bank or school finance office.',
  accountLength: 'Account number must be 6–10 digits (numbers only).',
  bankNameHint: 'Bank name is optional, but helps SELPIC confirm the correct Official Grant Account.',
} as const

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '')
}

export type GrantAccountFormInput = {
  bankName?: string
  accountName?: string
  bsb?: string
  accountNumber?: string
  abn?: string
}

export type GrantAccountFieldErrors = {
  accountName?: string
  abn?: string
  bsb?: string
  accountNumber?: string
}

/** Phase 1 validation — no BSB directory lookup yet. */
export function validateGrantAccountForm(input: GrantAccountFormInput): {
  ok: boolean
  errors: GrantAccountFieldErrors
  firstError: string | null
} {
  const errors: GrantAccountFieldErrors = {}
  const accountName = String(input.accountName || '').trim()
  const abnDigits = digitsOnlyAbn(String(input.abn || ''))
  const bsbDigits = digitsOnly(String(input.bsb || ''))
  const accountDigits = digitsOnly(String(input.accountNumber || ''))

  if (!accountName) errors.accountName = GRANT_ACCOUNT_ERRORS.accountNameRequired

  const abnErr = abnValidationError(abnDigits)
  if (abnErr) {
    if (abnErr.includes('required')) errors.abn = GRANT_ACCOUNT_ERRORS.abnRequired
    else if (abnErr.includes('11')) errors.abn = GRANT_ACCOUNT_ERRORS.abnLength
    else errors.abn = GRANT_ACCOUNT_ERRORS.abnChecksum
  }

  if (bsbDigits.length !== 6) errors.bsb = GRANT_ACCOUNT_ERRORS.bsbLength

  if (accountDigits.length < 6 || accountDigits.length > 10) {
    errors.accountNumber = GRANT_ACCOUNT_ERRORS.accountLength
  }

  const firstError =
    errors.accountName || errors.abn || errors.bsb || errors.accountNumber || null
  return { ok: !firstError, errors, firstError }
}
