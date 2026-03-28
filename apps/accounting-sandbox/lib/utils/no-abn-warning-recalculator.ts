/**
 * No ABN Warning Recalculator
 * 
 * 이미 파싱된 거래의 No ABN 경고를 재계산하는 유틸리티
 * HR & Payroll에 등록된 Contractor 정보를 확인하여 경고를 제외합니다.
 */

import { loadAllEmployees } from './payroll-transaction-matcher'
import { Employee } from '@/src/shared/types/employee'

export interface NoABNWarning {
  shouldWarn: boolean
  warningMessage: string
  withholdingAmount?: number
}

/**
 * 거래 설명에서 등록된 Contractor를 찾고 ABN이 있는지 확인
 * @param description - 거래 설명
 * @param employees - 모든 직원/Contractor 목록
 * @returns 매칭된 Contractor 또는 null
 */
function findMatchingContractor(
  description: string,
  employees: Employee[]
): Employee | null {
  if (!description) return null

  const descriptionUpper = description.toUpperCase().trim()

  for (const employee of employees) {
    if (employee.type === 'contractor') {
      // 회사명 매칭: 대소문자 무시, 공백 정규화
      let companyNameMatch = false
      if (employee.companyName) {
        const normalizedCompanyName = employee.companyName.toUpperCase().trim().replace(/\s+/g, ' ')
        const normalizedDescription = descriptionUpper.replace(/\s+/g, ' ')
        companyNameMatch = normalizedDescription.includes(normalizedCompanyName)
      }

      // 직원 이름 매칭: 대소문자 무시
      let employeeNameMatch = false
      if (employee.name) {
        const normalizedEmployeeName = employee.name.toUpperCase().trim()
        employeeNameMatch = descriptionUpper.includes(normalizedEmployeeName)
      }

      // 회사명 또는 직원 이름이 매칭되면 반환
      if (companyNameMatch || employeeNameMatch) {
        return employee
      }
    }
  }

  return null
}

/**
 * 거래의 No ABN 경고를 재계산
 * HR & Payroll에 등록된 Contractor 정보를 확인하여 경고를 제외합니다.
 * 
 * @param transaction - 거래 정보
 * @param existingWarning - 기존 경고 (있으면)
 * @returns 재계산된 경고 또는 undefined (경고 없음)
 */
export async function recalculateNoABNWarning(
  transaction: {
    description: string
    debit?: number | null
    credit?: number | null
    category?: string
  },
  existingWarning?: NoABNWarning
): Promise<NoABNWarning | undefined> {
  // 기존 경고가 없으면 재계산 불필요
  if (!existingWarning || !existingWarning.shouldWarn) {
    return existingWarning
  }

  // 서브컨트랙터 지출이 아니면 재계산 불필요
  const descriptionUpper = (transaction.description || '').toUpperCase()
  const isSubcontractorExpense =
    transaction.category === 'EXPENSE_CLEANING_SUBCONTRACTOR' ||
    descriptionUpper.includes('SUBCONTRACTOR') ||
    descriptionUpper.includes('CONTRACTOR')

  if (!isSubcontractorExpense) {
    return existingWarning
  }

  // Debit 거래만 확인 (지출)
  const hasDebit = transaction.debit && transaction.debit > 0
  if (!hasDebit) {
    return existingWarning
  }

  try {
    // HR & Payroll에서 모든 직원/Contractor 로드
    const employees = await loadAllEmployees()

    // 거래 설명에서 매칭되는 Contractor 찾기
    const matchingContractor = findMatchingContractor(transaction.description, employees)

    // 매칭된 Contractor에 ABN이 있으면 경고 제외
    if (matchingContractor && matchingContractor.abn && matchingContractor.abn.trim()) {
      console.log('[NoABN Recalc] ✅ Excluding warning - Contractor has registered ABN:', {
        companyName: matchingContractor.companyName,
        employeeName: matchingContractor.name,
        abn: matchingContractor.abn,
        description: transaction.description.substring(0, 50)
      })

      // 경고 제외
      return undefined
    }

    // 매칭되지 않거나 ABN이 없으면 기존 경고 유지
    return existingWarning
  } catch (error) {
    console.error('[NoABN Recalc] Failed to recalculate warning:', error)
    // 에러 발생 시 기존 경고 유지 (안전한 기본값)
    return existingWarning
  }
}

/**
 * 여러 거래의 No ABN 경고를 일괄 재계산
 * @param transactions - 거래 목록
 * @returns 재계산된 거래 목록
 */
export async function recalculateNoABNWarningsForTransactions<T extends {
  description: string
  debit?: number | null
  credit?: number | null
  category?: string
  noABNWarning?: NoABNWarning
}>(transactions: T[]): Promise<T[]> {
  const results = await Promise.all(
    transactions.map(async (tx) => {
      const recalculatedWarning = await recalculateNoABNWarning(tx, tx.noABNWarning)
      return {
        ...tx,
        noABNWarning: recalculatedWarning
      }
    })
  )

  return results
}
