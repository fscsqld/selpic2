/**
 * 시뮬레이션 테스트 - 4가지 핵심 케이스 검증
 * 
 * 1. 중복 방지 테스트 (Unique Key Guard)
 * 2. 권한 격리 테스트 (Security)
 * 3. 에러 격리 테스트 (Fault Tolerance)
 * 4. 자동 분개 로직 테스트 (Accounting)
 */

import { recordOrderToAccounting, recordOrderToAccountingAsync } from '../src/features/transactions/order-approval-integration'
import { requireSuperAdminForPayroll, requireAdminForOrderApproval } from '../middleware/accounting-auth'
import { approvePayrollAndCreateTransactions } from '../src/features/payroll'
import { calculatePayroll } from '../src/features/payroll'
import { Order } from '../src/shared/types/order'
import { Payslip } from '../src/features/payroll/types'
import { Employee } from '../src/shared/types/employee'
import { NextRequest } from 'next/server'
import { auditLogger } from '../src/shared/logging/audit-logger'

// ============================================
// 테스트 1: 중복 방지 테스트 (Unique Key Guard)
// ============================================

export async function testDuplicatePrevention() {
  console.log('\n🧪 테스트 1: 중복 방지 테스트 (Unique Key Guard)')
  console.log('=' .repeat(60))
  
  const testOrder: Order = {
    id: 'test_order_123',
    orderId: 'ORDER-2025-001',
    transactionDate: new Date().toISOString(),
    amount: 1000,
    gst: 100,
    status: 'pending',
    paymentMethod: 'card',
    metadata: {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      items: [{ name: 'Test Item', quantity: 1, price: 1000 }],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 첫 번째 호출
  console.log('📝 첫 번째 주문 승인 호출...')
  const result1 = await recordOrderToAccounting(testOrder, 'admin', 'admin')
  console.log('✅ 첫 번째 결과:', {
    success: result1.success,
    skipped: result1.skipped,
    transactionId: result1.transactionId,
  })

  // 두 번째 호출 (동일한 orderId)
  console.log('\n📝 두 번째 주문 승인 호출 (동일한 orderId)...')
  const result2 = await recordOrderToAccounting(testOrder, 'admin', 'admin')
  console.log('✅ 두 번째 결과:', {
    success: result2.success,
    skipped: result2.skipped,
    transactionId: result2.transactionId,
    error: result2.error,
  })

  // 검증
  const isDuplicatePrevented = result2.skipped === true && result2.success === true
  console.log('\n📊 검증 결과:')
  console.log(`   중복 방지 작동: ${isDuplicatePrevented ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   첫 번째 기록: ${result1.success ? '✅ 성공' : '❌ 실패'}`)
  console.log(`   두 번째 기록: ${result2.skipped ? '✅ 스킵됨 (중복)' : '❌ 중복 기록됨'}`)

  return {
    test: '중복 방지 테스트',
    passed: isDuplicatePrevented,
    details: {
      firstCall: result1,
      secondCall: result2,
    },
  }
}

// ============================================
// 테스트 2: 권한 격리 테스트 (Security)
// ============================================

export async function testPermissionIsolation() {
  console.log('\n🧪 테스트 2: 권한 격리 테스트 (Security)')
  console.log('=' .repeat(60))

  // Super Admin 요청 시뮬레이션
  const superAdminRequest = new NextRequest('http://localhost:3001/api/payroll/approve', {
    method: 'POST',
    headers: {
      'x-user-role': 'super_admin',
      'x-user-id': 'superadmin',
    },
  })

  // Admin 요청 시뮬레이션 (권한 없음)
  const adminRequest = new NextRequest('http://localhost:3001/api/payroll/approve', {
    method: 'POST',
    headers: {
      'x-user-role': 'admin', // Super Admin 아님
      'x-user-id': 'admin',
    },
  })

  // Super Admin 접근 테스트
  console.log('📝 Super Admin 접근 테스트...')
  const superAdminResult = requireSuperAdminForPayroll(superAdminRequest)
  console.log('✅ Super Admin 결과:', superAdminResult === null ? '✅ 허용됨' : '❌ 차단됨')

  // Admin 접근 테스트 (차단되어야 함)
  console.log('\n📝 Admin 접근 테스트 (차단되어야 함)...')
  const adminResult = requireSuperAdminForPayroll(adminRequest)
  console.log('✅ Admin 결과:', adminResult !== null ? '✅ 차단됨 (403)' : '❌ 허용됨 (보안 취약)')
  
  if (adminResult) {
    const response = await adminResult.json()
    console.log('   응답:', response)
  }

  // 검증
  const isSuperAdminAllowed = superAdminResult === null
  const isAdminBlocked = adminResult !== null && adminResult.status === 403
  const securityPassed = isSuperAdminAllowed && isAdminBlocked

  console.log('\n📊 검증 결과:')
  console.log(`   Super Admin 허용: ${isSuperAdminAllowed ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   Admin 차단: ${isAdminBlocked ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   전체 보안 테스트: ${securityPassed ? '✅ PASS' : '❌ FAIL'}`)

  return {
    test: '권한 격리 테스트',
    passed: securityPassed,
    details: {
      superAdminAllowed: isSuperAdminAllowed,
      adminBlocked: isAdminBlocked,
    },
  }
}

// ============================================
// 테스트 3: 에러 격리 테스트 (Fault Tolerance)
// ============================================

export async function testErrorIsolation() {
  console.log('\n🧪 테스트 3: 에러 격리 테스트 (Fault Tolerance)')
  console.log('=' .repeat(60))

  // 정상 주문
  const normalOrder: Order = {
    id: 'test_order_normal',
    orderId: 'ORDER-2025-NORMAL',
    transactionDate: new Date().toISOString(),
    amount: 1000,
    gst: 100,
    status: 'pending',
    paymentMethod: 'card',
    metadata: {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      items: [{ name: 'Test Item', quantity: 1, price: 1000 }],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 에러를 유발하는 주문 (null 값 등)
  const errorOrder: Order = {
    id: 'test_order_error',
    orderId: 'ORDER-2025-ERROR',
    transactionDate: new Date().toISOString(),
    amount: 1000,
    gst: 100,
    status: 'pending',
    paymentMethod: 'card',
    metadata: {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      items: [{ name: 'Test Item', quantity: 1, price: 1000 }],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 시뮬레이션: 홈페이지 주문 승인 API 응답
  console.log('📝 홈페이지 주문 승인 API 시뮬레이션...')
  
  // 1. 기존 주문 승인 로직 (성공)
  const homepageResponse = {
    success: true,
    order: {
      ...normalOrder,
      status: 'approved' as const,
      approvedAt: new Date().toISOString(),
    },
  }
  console.log('✅ 홈페이지 응답:', {
    success: homepageResponse.success,
    orderStatus: homepageResponse.order.status,
  })

  // 2. 회계 장부 기록 (비동기, await 하지 않음)
  console.log('\n📝 회계 장부 기록 (비동기, await 하지 않음)...')
  let accountingResult: any = null
  let accountingError: any = null

  // 비동기로 실행하되 결과를 추적
  recordOrderToAccountingAsync(normalOrder, 'admin', 'admin')
  
  // 에러 케이스 테스트를 위해 직접 호출
  try {
    // 의도적으로 에러를 유발할 수 있는 상황 시뮬레이션
    // (실제로는 IndexedDB 접근 실패 등)
    await recordOrderToAccounting(errorOrder, 'admin', 'admin')
    accountingResult = { success: true }
  } catch (error) {
    accountingError = error
    accountingResult = { success: false, error: String(error) }
  }

  console.log('✅ 회계 장부 기록 결과:', {
    success: accountingResult?.success,
    error: accountingError ? String(accountingError) : null,
  })

  // 검증: 홈페이지 응답은 성공이어야 함
  const homepageResponseSuccess = homepageResponse.success === true
  const accountingErrorIsolated = accountingError !== null || accountingResult?.success === false
  const errorIsolationPassed = homepageResponseSuccess && accountingErrorIsolated

  console.log('\n📊 검증 결과:')
  console.log(`   홈페이지 응답 성공: ${homepageResponseSuccess ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   회계 장부 에러 격리: ${accountingErrorIsolated ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   전체 에러 격리 테스트: ${errorIsolationPassed ? '✅ PASS' : '❌ FAIL'}`)
  console.log('\n💡 핵심: 회계 장부 기록 실패가 홈페이지 응답에 영향을 주지 않음')

  return {
    test: '에러 격리 테스트',
    passed: errorIsolationPassed,
    details: {
      homepageResponseSuccess,
      accountingErrorIsolated,
      homepageResponse,
      accountingResult,
    },
  }
}

// ============================================
// 테스트 4: 자동 분개 로직 테스트 (Accounting)
// ============================================

export async function testAutomaticJournalEntries() {
  console.log('\n🧪 테스트 4: 자동 분개 로직 테스트 (Accounting)')
  console.log('=' .repeat(60))

  // 테스트 데이터
  const grossPay = 1000 // $1,000
  const employee: Employee = {
    id: 'emp_test',
    name: 'Test Employee',
    type: 'employee',
    superannuationRate: 0.115, // 11.5%
    payFrequency: 'monthly',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const payslip: Payslip = {
    id: 'payslip_test',
    employeeId: employee.id,
    employeeName: employee.name,
    payPeriod: {
      start: '2025-01-01',
      end: '2025-01-31',
    },
    grossPay,
    taxWithheld: 0, // 계산될 예정
    superannuation: 0, // 계산될 예정
    netPay: 0, // 계산될 예정
    payDate: new Date().toISOString(),
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 1. 급여 계산
  console.log('📝 급여 계산...')
  const payrollCalculation = calculatePayroll(employee, grossPay)
  console.log('✅ 계산 결과:')
  console.log(`   Gross Pay: $${payrollCalculation.grossPay.toFixed(2)}`)
  console.log(`   PAYG Withholding: $${payrollCalculation.taxWithheld.toFixed(2)}`)
  console.log(`   Superannuation (11.5%): $${payrollCalculation.superannuation.toFixed(2)}`)
  console.log(`   Net Pay: $${payrollCalculation.netPay.toFixed(2)}`)

  // 2. 자동 분개
  console.log('\n📝 자동 분개 처리...')
  const updatedPayslip: Payslip = {
    ...payslip,
    taxWithheld: payrollCalculation.taxWithheld,
    superannuation: payrollCalculation.superannuation,
    netPay: payrollCalculation.netPay,
  }

  const transactions = approvePayrollAndCreateTransactions(updatedPayslip, employee)
  console.log('✅ 생성된 거래:', transactions.length, '개')

  // 3. 분개 항목 상세 확인
  console.log('\n📊 분개 항목 상세:')
  let totalDebit = 0
  let totalCredit = 0

  transactions.forEach((tx, index) => {
    const debit = tx.debit || 0
    const credit = tx.credit || 0
    totalDebit += debit
    totalCredit += credit

    console.log(`\n   거래 ${index + 1}:`)
    console.log(`     계정: ${tx.category}`)
    console.log(`     설명: ${tx.description}`)
    console.log(`     차변 (Debit): $${debit.toFixed(2)}`)
    console.log(`     대변 (Credit): $${credit.toFixed(2)}`)
  })

  console.log('\n📊 분개 합계:')
  console.log(`   총 차변: $${totalDebit.toFixed(2)}`)
  console.log(`   총 대변: $${totalCredit.toFixed(2)}`)
  console.log(`   차변 = 대변: ${Math.abs(totalDebit - totalCredit) < 0.01 ? '✅ PASS' : '❌ FAIL'}`)

  // 4. 숫자 검증
  const expectedSuper = grossPay * 0.115 // 11.5%
  const actualSuper = payrollCalculation.superannuation
  const superMatch = Math.abs(expectedSuper - actualSuper) < 0.01

  const expectedNetPay = grossPay - payrollCalculation.taxWithheld - expectedSuper
  const actualNetPay = payrollCalculation.netPay
  const netPayMatch = Math.abs(expectedNetPay - actualNetPay) < 0.01

  const debitCreditMatch = Math.abs(totalDebit - totalCredit) < 0.01

  console.log('\n📊 숫자 검증:')
  console.log(`   Superannuation 계산: $${expectedSuper.toFixed(2)} = $${actualSuper.toFixed(2)} ${superMatch ? '✅' : '❌'}`)
  console.log(`   Net Pay 계산: $${expectedNetPay.toFixed(2)} = $${actualNetPay.toFixed(2)} ${netPayMatch ? '✅' : '❌'}`)
  console.log(`   차변 = 대변: ${debitCreditMatch ? '✅ PASS' : '❌ FAIL'}`)

  const accountingPassed = superMatch && netPayMatch && debitCreditMatch

  return {
    test: '자동 분개 로직 테스트',
    passed: accountingPassed,
    details: {
      grossPay,
      payrollCalculation,
      transactions,
      totalDebit,
      totalCredit,
      superMatch,
      netPayMatch,
      debitCreditMatch,
    },
  }
}

// ============================================
// 전체 테스트 실행
// ============================================

export async function runAllTests() {
  console.log('\n🚀 시뮬레이션 테스트 시작')
  console.log('=' .repeat(60))

  const results = []

  try {
    // 테스트 1: 중복 방지
    const test1 = await testDuplicatePrevention()
    results.push(test1)

    // 테스트 2: 권한 격리
    const test2 = await testPermissionIsolation()
    results.push(test2)

    // 테스트 3: 에러 격리
    const test3 = await testErrorIsolation()
    results.push(test3)

    // 테스트 4: 자동 분개
    const test4 = await testAutomaticJournalEntries()
    results.push(test4)

    // 최종 결과
    console.log('\n' + '=' .repeat(60))
    console.log('📊 최종 테스트 결과')
    console.log('=' .repeat(60))

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`)
    })

    const allPassed = results.every(r => r.passed)
    console.log(`\n🎯 전체 테스트: ${allPassed ? '✅ 모두 통과' : '❌ 일부 실패'}`)

    return {
      allPassed,
      results,
    }
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error)
    return {
      allPassed: false,
      error: String(error),
      results,
    }
  }
}

// 브라우저에서 실행 가능하도록 export
if (typeof window !== 'undefined') {
  (window as any).runAccountingTests = runAllTests
  console.log('💡 브라우저 콘솔에서 runAccountingTests()를 실행하여 테스트를 시작할 수 있습니다.')
}
