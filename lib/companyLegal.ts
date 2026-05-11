/**
 * Registered company details and public contact (single source of truth).
 * ABN/ACN are Australian identifiers — keep in sync with official records.
 * Invoices, quotes, emails, footers, and policy fallbacks should read from here.
 */
/** Public website (official store), canonical HTTPS URL */
export const COMPANY_WEBSITE_URL = 'https://selpic.com.au' as const

/** Registered / marketing domain without scheme */
export const COMPANY_DOMAIN = 'selpic.com.au' as const

export const COMPANY_LEGAL = {
  companyName: 'SELPIC PTY LTD',
  domain: COMPANY_DOMAIN,
  /** ACN (Australian Company Number) 9자리 */
  acn: '694 194 011',
  /** ABN (Australian Business Number) 11자리 */
  abn: '79 694 194 011',
} as const

/** Short copyright line (footer, policy pages; may use `whitespace-pre-line`) */
export const COMPANY_LEGAL_LINE = '© 2026 Selpic. All rights reserved.'

/** Company logo path (emails, invoices, footer — real PNG/SVG in /public, not a stub) */
export const COMPANY_LOGO_URL = '/logo.png'

/** Shown at the bottom of transactional emails and the website footer */
export const EMAIL_CONFIDENTIALITY_NOTICE =
  'Confidentiality Notice: This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender and delete this email from your system. Any unauthorized use, disclosure, or distribution is prohibited.'

/** Business contact (invoices, policies, footers — keep aligned with CMS policy pages) */
export const COMPANY_CONTACT = {
  phone: '+61 466 894 279',
  email: 'info@selpic.com.au',
  address: '7 Harvest St, Mansfield QLD 4122, Australia',
} as const

/** Bank details for invoices and payment instructions */
export const COMPANY_BANK = {
  bankName: 'NAB Bank',
  bsb: '084-034',
  accountNumber: '924878593',
  accountName: COMPANY_LEGAL.companyName,
  paymentNote: 'Please use Invoice Number as the payment reference.'
} as const

export function getCompanyBrandName(companyName: string = COMPANY_LEGAL.companyName): string {
  const raw = String(companyName || '').trim()
  if (!raw) return 'Selpic'
  return raw.replace(/\s+PTY\s+LTD\b/i, '').trim()
}
