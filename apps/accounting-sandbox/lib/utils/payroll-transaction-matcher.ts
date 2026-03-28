/**
 * Payroll Transaction Matcher
 * 
 * 은행 명세서에서 급여 지급 거래를 자동으로 매칭하는 유틸리티
 */

import { Employee } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

export interface BankTransaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance?: number | null
}

export interface MatchedPayrollTransaction {
  transaction: BankTransaction
  employee: Employee
  matchConfidence: 'high' | 'medium' | 'low'
  matchReason: string
}

/**
 * 은행 거래를 직원/컨트랙터의 급여 지급과 매칭
 * 
 * 매칭 기준:
 * 1. 계좌번호 일치 (높은 신뢰도)
 * 2. BSB 일치 (중간 신뢰도)
 * 3. 계좌명 일치 (낮은 신뢰도)
 * 4. 금액 일치 (추가 확인)
 */
export async function matchPayrollTransaction(
  transaction: BankTransaction | any,
  employees: Employee[]
): Promise<MatchedPayrollTransaction | null> {
  // Debit 거래만 확인 (급여 지급은 Debit)
  if (!transaction.debit || transaction.debit <= 0) {
    return null
  }

  // 모든 직원/컨트랙터의 은행 계좌 정보와 비교
  for (const employee of employees) {
    if (!employee.bankAccount) continue

    const bankAccount = employee.bankAccount
    let matchScore = 0
    const matchReasons: string[] = []

    // 1. 계좌번호 일치 확인 (높은 신뢰도)
    if (bankAccount.accountNumber && transaction.description) {
      // 계좌번호가 description에 포함되어 있는지 확인
      const accountNumberClean = bankAccount.accountNumber.replace(/\s/g, '')
      const descriptionClean = transaction.description.replace(/\s/g, '')
      
      if (descriptionClean.includes(accountNumberClean) || accountNumberClean.includes(descriptionClean.slice(-6))) {
        matchScore += 3
        matchReasons.push(`Account number match: ${bankAccount.accountNumber}`)
      }
    }

    // 2. BSB 일치 확인 (중간 신뢰도)
    if (bankAccount.bsb && transaction.description) {
      const bsbClean = bankAccount.bsb.replace(/\s|-/g, '')
      const descriptionClean = transaction.description.replace(/\s|-/g, '')
      
      if (descriptionClean.includes(bsbClean)) {
        matchScore += 2
        matchReasons.push(`BSB match: ${bankAccount.bsb}`)
      }
    }

    // 3. 계좌명 일치 확인 (낮은 신뢰도)
    if (bankAccount.accountName && transaction.description) {
      const accountNameWords = bankAccount.accountName.toLowerCase().split(/\s+/)
      const descriptionLower = transaction.description.toLowerCase()
      
      // 계좌명의 주요 단어가 description에 포함되어 있는지 확인
      const matchedWords = accountNameWords.filter(word => 
        word.length > 3 && descriptionLower.includes(word)
      )
      
      if (matchedWords.length > 0) {
        matchScore += 1
        matchReasons.push(`Account name match: ${matchedWords.join(', ')}`)
      }
    }

    // 4. 직원 이름 일치 확인
    if (employee.name && transaction.description) {
      const employeeNameWords = employee.name.toLowerCase().split(/\s+/)
      const descriptionLower = transaction.description.toLowerCase()
      
      const matchedWords = employeeNameWords.filter(word => 
        word.length > 2 && descriptionLower.includes(word)
      )
      
      if (matchedWords.length > 0) {
        matchScore += 1
        matchReasons.push(`Employee name match: ${matchedWords.join(', ')}`)
      }
    }

    // 매칭 신뢰도 결정
    if (matchScore >= 3) {
      return {
        transaction,
        employee,
        matchConfidence: 'high',
        matchReason: matchReasons.join('; ')
      }
    } else if (matchScore >= 2) {
      return {
        transaction,
        employee,
        matchConfidence: 'medium',
        matchReason: matchReasons.join('; ')
      }
    } else if (matchScore >= 1) {
      return {
        transaction,
        employee,
        matchConfidence: 'low',
        matchReason: matchReasons.join('; ')
      }
    }
  }

  return null
}

/**
 * 모든 직원/컨트랙터 정보를 로드
 */
export async function loadAllEmployees(): Promise<Employee[]> {
  try {
    await indexedDBStorage.init()
    const employees = await indexedDBStorage.getAllEmployees()
    return employees as Employee[]
  } catch (error) {
    console.error('Failed to load employees for payroll matching:', error)
    return []
  }
}

/**
 * 은행 거래 목록에서 급여 지급 거래를 자동으로 매칭하고 태그 추가
 */
export async function autoMatchPayrollTransactions(
  transactions: BankTransaction[]
): Promise<Array<BankTransaction & { 
  matchedEmployee?: Employee
  matchConfidence?: 'high' | 'medium' | 'low'
  matchReason?: string
}>> {
  const employees = await loadAllEmployees()
  
  return transactions.map(transaction => {
    const match = matchPayrollTransaction(transaction, employees)
    
    if (match) {
      return {
        ...transaction,
        matchedEmployee: match.employee,
        matchConfidence: match.matchConfidence,
        matchReason: match.matchReason
      }
    }
    
    return transaction
  })
}
