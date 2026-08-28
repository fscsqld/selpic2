/**
 * Per-line GST-exclusive amounts for ATO Annual / CTR Item 6 (L2 tax basis).
 * Same transaction universe as P&L; never FY-wide scaleMap on category totals.
 */

import type { Transaction } from '@/lib/utils/business-calculations'
import {
  isExpenseReducingRefund,
  isPlExpenseDebit,
} from '@/lib/utils/business-calculations'
import {
  isCompanyBusinessDepartment,
  type LedgerAccountType,
} from '@/lib/classification/company-account'
import { roundMoney } from '@/lib/utils/currency-format'
import { isPurchaseGstClaimable } from '@/lib/gst/purchase-gst-claimable'
import { gstAmountOnSale, isG1SalesCredit } from '@/lib/gst/sales-gst'

export type LodgmentAccountType = 'individual' | 'company' | 'sole_trader'

function gstAmountOnPurchase(tx: Transaction): number {
  if (!isPurchaseGstClaimable(tx)) return 0
  const gross = Math.abs(Number(tx.debit || 0))
  if (tx.gstInfo?.gstType === 'INCLUDED' && tx.gstInfo.gstAmount != null) {
    return roundMoney(Math.abs(Number(tx.gstInfo.gstAmount)))
  }
  return roundMoney(gross / 11)
}

/** GST-exclusive face for one income credit (sales). */
export function lineAmountGstExclusiveIncome(
  tx: Transaction,
  gstRegistered: boolean = true
): number {
  const gross = Math.abs(Number(tx.credit || 0))
  if (!gstRegistered) return roundMoney(gross)
  return roundMoney(gross - gstAmountOnSale(tx))
}

/** GST-exclusive face for one expense debit. FREE / non-claimable stay at face. */
export function lineAmountGstExclusiveExpense(tx: Transaction): number {
  const gross = Math.abs(Number(tx.debit || 0))
  return roundMoney(gross - gstAmountOnPurchase(tx))
}

/** GST-exclusive reduction for vendor refund credits (mirror expense debit rules). */
export function lineAmountGstExclusiveExpenseRefund(tx: Transaction): number {
  const gross = Math.abs(Number(tx.credit || 0))
  if (!isPurchaseGstClaimable(tx)) return roundMoney(gross)
  if (tx.gstInfo?.gstType === 'INCLUDED' && tx.gstInfo.gstAmount != null) {
    return roundMoney(gross - Math.abs(Number(tx.gstInfo.gstAmount)))
  }
  return roundMoney(gross - gross / 11)
}

function isBusinessIncomeCredit(
  tx: Transaction,
  accountType: LodgmentAccountType
): boolean {
  if (accountType === 'individual') {
    return (
      !!tx.credit &&
      tx.category !== 'TRANSFER_INTERNAL' &&
      !isExpenseReducingRefund(tx)
    )
  }
  if (tx.department === 'personal') return false
  const isBusiness = isCompanyBusinessDepartment(
    tx.department,
    accountType as LedgerAccountType
  )
  const cat = tx.category || ''
  return (
    isBusiness &&
    !!tx.credit &&
    cat.startsWith('INCOME_') &&
    cat !== 'TRANSFER_INTERNAL' &&
    cat !== 'NON_TAXABLE_CASH_DEPOSIT' &&
    cat !== 'INCOME_CASH_DEPOSIT_REVIEW' &&
    cat !== 'EQUITY_SHARE_CAPITAL' &&
    !isExpenseReducingRefund(tx)
  )
}

function isBusinessExpenseRefund(
  tx: Transaction,
  accountType: LodgmentAccountType
): boolean {
  if (accountType === 'individual') {
    return (
      !!tx.credit &&
      isExpenseReducingRefund(tx) &&
      tx.category !== 'TRANSFER_INTERNAL'
    )
  }
  if (tx.department === 'personal') return false
  const isBusiness = isCompanyBusinessDepartment(
    tx.department,
    accountType as LedgerAccountType
  )
  return isBusiness && !!tx.credit && isExpenseReducingRefund(tx)
}

/**
 * Income / expense category maps on GST-exclusive (L2) basis — same buckets as
 * `groupIncomeAndExpensesByCategory`, without cash scaleMap.
 */
export function aggregateGstExclusiveByCategory(
  transactions: Transaction[],
  accountType: LodgmentAccountType = 'company',
  gstRegistered: boolean = true
): {
  incomeByCategory: Record<string, number>
  expensesByCategory: Record<string, number>
} {
  const incomeByCategory: Record<string, number> = {}
  const expensesByCategory: Record<string, number> = {}

  for (const tx of transactions) {
    const category = tx.category || 'UNCATEGORIZED'

    if (accountType === 'individual') {
      if (tx.credit && category.startsWith('INCOME_')) {
        incomeByCategory[category] = roundMoney(
          (incomeByCategory[category] || 0) +
            lineAmountGstExclusiveIncome(tx, gstRegistered)
        )
      } else if (tx.debit && category.startsWith('EXPENSE_')) {
        expensesByCategory[category] = roundMoney(
          (expensesByCategory[category] || 0) +
            lineAmountGstExclusiveExpense(tx)
        )
      }
      continue
    }

    const isRefund =
      category === 'INCOME_REFUND_REIMBURSEMENT' ||
      (tx.description?.toUpperCase().includes('REFUND') && tx.credit)

    if (isBusinessIncomeCredit(tx, accountType)) {
      const ex = lineAmountGstExclusiveIncome(tx, gstRegistered)
      if (isRefund) {
        expensesByCategory[category] = roundMoney(
          (expensesByCategory[category] || 0) - ex
        )
      } else {
        incomeByCategory[category] = roundMoney(
          (incomeByCategory[category] || 0) + ex
        )
      }
    } else if (isPlExpenseDebit(tx, accountType)) {
      expensesByCategory[category] = roundMoney(
        (expensesByCategory[category] || 0) + lineAmountGstExclusiveExpense(tx)
      )
    } else if (isBusinessExpenseRefund(tx, accountType)) {
      expensesByCategory[category] = roundMoney(
        (expensesByCategory[category] || 0) -
          lineAmountGstExclusiveExpenseRefund(tx)
      )
    }
  }

  return { incomeByCategory, expensesByCategory }
}

export function sumCategoryMap(map: Record<string, number>): number {
  return roundMoney(
    Object.values(map).reduce((s, v) => s + Math.abs(Number(v) || 0), 0)
  )
}
