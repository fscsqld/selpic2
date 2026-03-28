/**
 * Payroll Approval API
 * 
 * Super Admin만 접근 가능
 * 급여 승인 시 Wages Expense와 PAYG/Super Liability 자동 분개
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminForPayroll } from '@/middleware/accounting-auth'
import { approvePayrollAndCreateTransactions } from '@/src/features/payroll'
import { checkDuplicateTransaction } from '@/src/features/transactions'
import { auditLogger } from '@/src/shared/logging/audit-logger'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { Payslip } from '@/src/features/payroll/types'
import { Employee } from '@/src/shared/types/employee'

export async function POST(request: NextRequest) {
  // 1. Super Admin 권한 확인
  const authError = requireSuperAdminForPayroll(request)
  if (authError) {
    return authError
  }

  const userRole = request.headers.get('x-user-role') || 'unknown'
  const userId = request.headers.get('x-user-id') || 'unknown'

  try {
    const body = await request.json()
    const { payslip, employee } = body as {
      payslip: Payslip
      employee: Employee
    }

    if (!payslip || !employee) {
      return NextResponse.json(
        { error: 'Missing required fields: payslip and employee' },
        { status: 400 }
      )
    }

    auditLogger.log('payroll_approval_start', {
      userId,
      userRole,
      resource: 'payroll',
      resourceId: payslip.id,
      details: {
        payslipId: payslip.id,
        employeeId: employee.id,
        grossPay: payslip.grossPay,
      },
      success: true,
    })

    // 2. 중복 확인 (Unique Key Guard)
    const existingTransactions = await indexedDBStorage.getAllTransactions()
    const duplicateCheck = checkDuplicateTransaction(
      {
        id: `payslip_${payslip.id}`,
        reference: `PAYROLL_${payslip.id}`,
        date: payslip.payDate,
        description: `Payroll - ${employee.name}`,
        debit: payslip.grossPay,
        credit: null,
        category: 'EXPENSE_WAGES_SALARIES',
      },
      existingTransactions
    )

    if (duplicateCheck.isDuplicate) {
      auditLogger.log('duplicate_payroll_skipped', {
        userId,
        userRole,
        resource: 'payroll',
        resourceId: payslip.id,
        details: {
          payslipId: payslip.id,
          existingTransactionId: duplicateCheck.existingTransactionId,
        },
        success: true,
      })

      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Payroll already recorded',
        existingTransactionId: duplicateCheck.existingTransactionId,
      })
    }

    // 3. 급여 승인 및 자동 분개
    const transactions = approvePayrollAndCreateTransactions(payslip, employee)

    // 4. 거래 저장
    for (const transaction of transactions) {
      await indexedDBStorage.saveTransaction(transaction)
    }

    auditLogger.log('payroll_approval_success', {
      userId,
      userRole,
      resource: 'payroll',
      resourceId: payslip.id,
      details: {
        payslipId: payslip.id,
        transactionCount: transactions.length,
        grossPay: payslip.grossPay,
      },
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Payroll approved and journal entries created',
      payslipId: payslip.id,
      transactionCount: transactions.length,
      transactions: transactions.map(tx => ({
        id: tx.id,
        account: tx.category,
        debit: tx.debit,
        credit: tx.credit,
        description: tx.description,
      })),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    auditLogger.log('payroll_approval_error', {
      userId,
      userRole,
      resource: 'payroll',
      details: { error: errorMessage },
      success: false,
      error: errorMessage,
    })

    return NextResponse.json(
      { error: 'Failed to approve payroll', details: errorMessage },
      { status: 500 }
    )
  }
}
