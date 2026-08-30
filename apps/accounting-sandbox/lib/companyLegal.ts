/**
 * Registered company details (SELPIC A defaults).
 * Keep aligned with storefront lib/companyLegal.ts when details change.
 */

export const COMPANY_WEBSITE_URL = 'https://selpic.com.au' as const
export const COMPANY_DOMAIN = 'selpic.com.au' as const

export const COMPANY_LEGAL = {
  companyName: 'SELPIC PTY LTD',
  domain: COMPANY_DOMAIN,
  acn: '694 194 011',
  abn: '79 694 194 011',
} as const

export const COMPANY_LEGAL_LINE = '© 2026 Selpic. All rights reserved.'
export const COMPANY_LOGO_URL = '/logo.png'

export const COMPANY_CONTACT = {
  phone: '+61 466 894 279',
  email: 'info@selpic.com.au',
  address: '7 Harvest St, Mansfield QLD 4122, Australia',
} as const

export const COMPANY_BANK = {
  bankName: 'NAB Bank',
  bsb: '084-034',
  accountNumber: '924878593',
  accountName: COMPANY_LEGAL.companyName,
  paymentNote: 'Please use Invoice Number as the payment reference.',
} as const

export function getCompanyBrandName(companyName: string = COMPANY_LEGAL.companyName): string {
  const raw = String(companyName || '').trim()
  if (!raw) return 'Selpic'
  return raw.replace(/\s+PTY\s+LTD\b/i, '').trim()
}
