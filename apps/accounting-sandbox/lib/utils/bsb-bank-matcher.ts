/**
 * BSB Bank Matcher
 * 
 * 호주 BSB 번호를 기반으로 은행을 자동으로 식별하는 유틸리티
 * 
 * BSB (Bank State Branch) 번호는 6자리 숫자로 구성:
 * - 앞 2자리: 은행 코드
 * - 중간 2자리: 주 코드
 * - 뒤 2자리: 지점 코드
 */

export interface BankInfo {
  code: string
  name: string
  commonNames: string[]
}

/**
 * 호주 주요 은행 BSB 코드 매핑
 */
const BSB_BANK_MAP: Record<string, BankInfo> = {
  // Commonwealth Bank (CBA)
  '06': {
    code: 'CBA',
    name: 'Commonwealth Bank',
    commonNames: ['CBA', 'Commonwealth Bank', 'Commonwealth', 'CommBank']
  },
  // National Australia Bank (NAB)
  '08': {
    code: 'NAB',
    name: 'National Australia Bank',
    commonNames: ['NAB', 'National Australia Bank', 'National Bank']
  },
  // ANZ Bank
  '01': {
    code: 'ANZ',
    name: 'ANZ Bank',
    commonNames: ['ANZ', 'ANZ Bank', 'Australia and New Zealand Banking Group']
  },
  // Westpac
  '03': {
    code: 'Westpac',
    name: 'Westpac',
    commonNames: ['Westpac', 'Westpac Banking Corporation']
  },
  // Bank of Queensland
  '12': {
    code: 'BOQ',
    name: 'Bank of Queensland',
    commonNames: ['BOQ', 'Bank of Queensland']
  },
  // Bendigo Bank
  '63': {
    code: 'Bendigo',
    name: 'Bendigo Bank',
    commonNames: ['Bendigo', 'Bendigo Bank']
  },
  // Suncorp
  '48': {
    code: 'Suncorp',
    name: 'Suncorp',
    commonNames: ['Suncorp', 'Suncorp Bank']
  },
  // St. George Bank (Westpac 그룹)
  '11': {
    code: 'StGeorge',
    name: 'St. George Bank',
    commonNames: ['St. George', 'St George', 'StGeorge']
  },
  // Bankwest (CBA 그룹)
  '30': {
    code: 'Bankwest',
    name: 'Bankwest',
    commonNames: ['Bankwest']
  }
}

/**
 * BSB 번호에서 은행 코드 추출
 * @param bsb - BSB 번호 (예: "123-456" 또는 "123456")
 * @returns 은행 코드 (앞 2자리) 또는 null
 */
export function extractBankCodeFromBSB(bsb: string): string | null {
  if (!bsb) return null
  
  // 하이픈, 공백 제거
  const cleanBSB = bsb.replace(/[\s-]/g, '')
  
  // 6자리 숫자인지 확인
  if (!/^\d{6}$/.test(cleanBSB)) {
    return null
  }
  
  // 앞 2자리 반환
  return cleanBSB.substring(0, 2)
}

/**
 * BSB 번호로 은행 정보 찾기
 * @param bsb - BSB 번호
 * @returns 은행 정보 또는 null
 */
export function getBankFromBSB(bsb: string): BankInfo | null {
  const bankCode = extractBankCodeFromBSB(bsb)
  if (!bankCode) return null
  
  return BSB_BANK_MAP[bankCode] || null
}

/**
 * BSB 번호로 은행 이름 반환
 * @param bsb - BSB 번호
 * @returns 은행 이름 또는 null
 */
export function getBankNameFromBSB(bsb: string): string | null {
  const bankInfo = getBankFromBSB(bsb)
  return bankInfo ? bankInfo.name : null
}

/**
 * BSB 번호로 은행 코드 반환 (드롭다운용)
 * @param bsb - BSB 번호
 * @returns 은행 코드 (CBA, NAB, ANZ, Westpac 등) 또는 null
 */
export function getBankCodeFromBSB(bsb: string): string | null {
  const bankInfo = getBankFromBSB(bsb)
  return bankInfo ? bankInfo.code : null
}

/**
 * BSB 번호 유효성 검사
 * @param bsb - BSB 번호
 * @returns 유효한 BSB인지 여부
 */
export function isValidBSB(bsb: string): boolean {
  if (!bsb) return false
  
  const cleanBSB = bsb.replace(/[\s-]/g, '')
  return /^\d{6}$/.test(cleanBSB)
}

/**
 * BSB 번호 포맷팅 (123-456 형식)
 * @param bsb - BSB 번호
 * @returns 포맷된 BSB 번호
 */
export function formatBSB(bsb: string): string {
  if (!bsb) return ''
  
  const cleanBSB = bsb.replace(/[\s-]/g, '')
  
  if (cleanBSB.length === 6) {
    return `${cleanBSB.substring(0, 3)}-${cleanBSB.substring(3, 6)}`
  }
  
  return cleanBSB
}
