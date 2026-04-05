/**
 * SELPIC PTY LTD 법인 등록 정보 (단일 소스)
 * ABN·ACN은 호주 사업자 등록 번호로, 인보이스·견적서·문서 발송·푸터·약관/개인정보 등 모든 회사 관련 서류에 사용됩니다.
 * 변경 시 이 파일만 수정하면 전체 반영됩니다. (공식 등록증과 일치하는지 확인 후 수정)
 */
export const COMPANY_LEGAL = {
  companyName: 'SELPIC PTY LTD',
  domain: 'SELPIC.COM.AU',
  /** ACN (Australian Company Number) 9자리 */
  acn: '694 194 011',
  /** ABN (Australian Business Number) 11자리 */
  abn: '79 694 194 011',
} as const

/** 푸터/소개용: 저작권 표기 (표시 시 white-space-pre-line 사용 가능) */
export const COMPANY_LEGAL_LINE = '© 2026 SELPIC. All rights reserved.'

/** Company logo path (emails, invoices, footer — real PNG/SVG in /public, not a stub) */
export const COMPANY_LOGO_URL = '/logo.png'

/** Shown at the bottom of transactional emails and the website footer */
export const EMAIL_CONFIDENTIALITY_NOTICE =
  'Confidentiality Notice: This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender and delete this email from your system. Any unauthorized use, disclosure, or distribution is prohibited.'

/** 회사 연락처 (문서·인보이스 기본값, COMPANY_LEGAL과 함께 사용) */
export const COMPANY_CONTACT = {
  phone: '0466 894 279',
  email: 'info@selpic.com.au',
  address: '7 harvest st, Mansfield QLD 4122'
} as const

/**
 * 회사 은행 정보 (인보이스·Document Sender·결제 옵션 기본값)
 * 변경 시 이 파일만 수정하면 문서/인보이스 양식에 반영됨
 */
export const COMPANY_BANK = {
  bankName: 'NAB Bank',
  bsb: '084-034',
  accountNumber: '924878593',
  accountName: COMPANY_LEGAL.companyName,
  paymentNote: 'Please use Invoice Number as the payment reference.'
} as const

export function getCompanyBrandName(companyName: string = COMPANY_LEGAL.companyName): string {
  const raw = String(companyName || '').trim()
  if (!raw) return 'SELPIC'
  return raw.replace(/\s+PTY\s+LTD\b/i, '').trim()
}
