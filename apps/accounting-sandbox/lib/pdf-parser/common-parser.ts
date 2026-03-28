/**
 * 공통 파서 유틸리티
 * 
 * 모든 은행 파서에서 공통으로 사용하는 유틸리티 함수들
 */

/**
 * 날짜 형식 정규화
 * 다양한 날짜 형식을 YYYY-MM-DD 형식으로 변환
 */
export class CommonParser {
  /**
   * 텍스트에서 날짜 추출 (다양한 형식 지원)
   * 
   * 지원 형식:
   * - DD/MM/YYYY (예: 15/03/2024)
   * - DD-MM-YYYY (예: 15-03-2024)
   * - YYYY-MM-DD (예: 2024-03-15)
   * - DD MMM YYYY (예: 15 Mar 2024)
   * 
   * @param text 날짜가 포함된 텍스트
   * @returns YYYY-MM-DD 형식의 날짜 문자열, 없으면 null
   */
  static extractDate(text: string): string | null {
    // DD/MM/YYYY 형식
    const ddmmyyyyPattern = /(\d{2})\/(\d{2})\/(\d{4})/
    let match = text.match(ddmmyyyyPattern)
    if (match) {
      const [, day, month, year] = match
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // DD-MM-YYYY 형식
    const ddmmyyyyDashPattern = /(\d{2})-(\d{2})-(\d{4})/
    match = text.match(ddmmyyyyDashPattern)
    if (match) {
      const [, day, month, year] = match
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // YYYY-MM-DD 형식 (이미 표준 형식)
    const yyyymmddPattern = /(\d{4})-(\d{2})-(\d{2})/
    match = text.match(yyyymmddPattern)
    if (match) {
      return match[0]
    }

    // DD MMM YYYY 형식 (예: 15 Mar 2024)
    const ddmmyyyyTextPattern = /(\d{2})\s+([A-Za-z]{3})\s+(\d{4})/
    match = text.match(ddmmyyyyTextPattern)
    if (match) {
      const [, day, monthText, year] = match
      const month = this.monthTextToNumber(monthText)
      if (month) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    return null
  }

  /**
   * 월 이름을 숫자로 변환
   * @param monthText 월 이름 (예: 'Jan', 'Mar', 'Dec')
   * @returns 월 숫자 문자열 (예: '01', '03', '12')
   */
  private static monthTextToNumber(monthText: string): string | null {
    const months: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
    }
    return months[monthText.toLowerCase()] || null
  }

  /**
   * 텍스트에서 금액 추출 (호주 달러 형식)
   * 
   * 지원 형식:
   * - $1,234.56
   * - 1234.56
   * - (1234.56) (음수 표시)
   * - 1,234.56
   * 
   * @param text 금액이 포함된 텍스트
   * @returns 금액 숫자, 없으면 null
   */
  static extractAmount(text: string): number | null {
    // 괄호는 음수를 의미
    const isNegative = text.includes('(') && text.includes(')')
    
    // 숫자 패턴 (소수점 포함)
    const amountPattern = /[\$]?([\d,]+\.?\d*)/
    const match = text.match(amountPattern)
    
    if (match) {
      // 쉼표와 달러 기호 제거
      const cleaned = match[1].replace(/,/g, '')
      const amount = parseFloat(cleaned)
      
      if (isNaN(amount)) {
        return null
      }
      
      // 괄호로 감싸진 경우 음수로 처리
      return isNegative ? -amount : amount
    }
    
    return null
  }

  /**
   * 거래 설명 정제
   * 불필요한 공백, 특수문자 제거 및 정규화
   * 
   * @param text 원본 설명 텍스트
   * @returns 정제된 설명 텍스트
   */
  static cleanDescription(text: string): string {
    return text
      .replace(/\s+/g, ' ')           // 연속된 공백을 하나로
      .replace(/[^\w\s\-.,()]/g, '')  // 특수문자 제거 (일부 유지)
      .trim()
  }

  /**
   * 텍스트에서 계좌번호 추출
   * 
   * @param text PDF 텍스트
   * @param patterns 계좌번호 패턴 배열 (정규식 문자열)
   * @returns 계좌번호 또는 undefined
   */
  static extractAccountNumber(
    text: string,
    patterns: string[] = [
      /Account\s+Number[:\s]+(\d+)/i,
      /Account[:\s]+(\d+)/i,
      /A\/C[:\s]+(\d+)/i,
    ]
  ): string | undefined {
    for (const pattern of patterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
      const match = text.match(regex)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    return undefined
  }

  /**
   * 텍스트에서 기간 추출
   * 
   * @param text PDF 텍스트
   * @param patterns 기간 패턴 배열
   * @returns 시작일과 종료일 객체
   */
  static extractPeriod(
    text: string,
    patterns: RegExp[] = [
      /Statement\s+Period[:\s]+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i,
      /Period[:\s]+(\d{2}\/\d{2}\/\d{4})\s+-\s+(\d{2}\/\d{2}\/\d{4})/i,
      /From\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i,
    ]
  ): { startDate: string; endDate: string } {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1] && match[2]) {
        const startDate = this.extractDate(match[1])
        const endDate = this.extractDate(match[2])
        if (startDate && endDate) {
          return { startDate, endDate }
        }
      }
    }
    
    // 기본값 (빈 문자열)
    return {
      startDate: '',
      endDate: '',
    }
  }
}

