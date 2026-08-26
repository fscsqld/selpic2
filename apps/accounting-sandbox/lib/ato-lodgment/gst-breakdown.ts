/**
 * GST sales breakdown for ATO BAS fields (G1, G2, G3, 1A, 1B).
 *
 * Aligns with Biz Intel `calculateBusinessMetrics`:
 * - G1 / 1A from taxable business income (INCOME_*), not ATO refunds or transfers
 * - 1B from taxable EXPENSE_* only (not director reimbursements / erroneous payments)
 * - GST-free / non-claimable purchases (gstType FREE/EXCLUDED, or untagged manual cash) excluded from 1B
 */

import { isPurchaseGstClaimable } from '@/lib/gst/purchase-gst-claimable'
import { isDirectorReimbursementPayeeNarrative } from '@/lib/utils/business-calculations'

type GstTx = {
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  source?: string
  gstInfo?: {
    isGSTIncluded: boolean
    gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
  }
}

export interface GstSalesBreakdown {
  g1TotalSalesGstInclusive: number
  g2ExportSales: number
  g3OtherGstFreeSales: number
  gstOnSales: number
  gstOnPurchases: number
  gstFreeIncome: number
  gstInclusiveIncome: number
  incomeWithoutGstTags: number
  incomeTransactionCount: number
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** Credits that must never count as BAS G1 sales. */
const EXCLUDED_FROM_G1 = new Set([
  'NON_TAXABLE_ATO_GST_REFUND',
  'NON_TAXABLE_ATO_PAYMENT',
  'NON_TAXABLE_TRANSFER',
  'TRANSFER_INTERNAL',
  'NON_TAXABLE_CASH_DEPOSIT',
  'INCOME_CASH_DEPOSIT_REVIEW',
  'EQUITY_SHARE_CAPITAL',
  'LIABILITY_DIRECTORS_LOAN',
  'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
  'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
  'INCOME_REFUND_REIMBURSEMENT',
])

/** Debits that must never contribute to 1B GST on purchases. */
const EXCLUDED_FROM_1B = new Set([
  'NON_TAXABLE_ATO_GST_REFUND',
  'NON_TAXABLE_TRANSFER',
  'TRANSFER_INTERNAL',
  'LIABILITY_DIRECTORS_LOAN',
  'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL',
  'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
  'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
  'INCOME_REFUND_REIMBURSEMENT',
])

function isBusinessDept(department?: string): boolean {
  return department !== 'personal' && department !== 'unknown'
}

/** Taxable trading / other income credits for G1. */
function isG1IncomeTransaction(tx: GstTx): boolean {
  const amount = tx.credit || 0
  if (amount <= 0) return false
  if (!isBusinessDept(tx.department)) return false
  const cat = tx.category || ''
  if (EXCLUDED_FROM_G1.has(cat)) return false
  if (cat.startsWith('INCOME_')) return true
  // Uncategorised credit may still be sales — include cautiously
  if (!cat || cat === 'UNCATEGORIZED') return true
  return false
}

/**
 * Real GST-free sales only (not ATO refunds / loan / transfers).
 * Tagged FREE or known GST-free income categories.
 */
function isGstFreeSale(tx: GstTx): boolean {
  if (tx.gstInfo?.gstType === 'FREE') return true
  const cat = (tx.category || '').toUpperCase()
  return cat.includes('GST_FREE') || cat.includes('GSTFREE')
}

function isExportSale(tx: GstTx): boolean {
  const cat = (tx.category || '').toUpperCase()
  const desc = (tx.description || '').toLowerCase()
  return (
    cat.includes('EXPORT') ||
    desc.includes('export sale') ||
    desc.includes('overseas')
  )
}

function isTaxablePurchaseExpense(tx: GstTx): boolean {
  const debit = tx.debit || 0
  if (debit <= 0) return false
  if (!isBusinessDept(tx.department)) return false
  const cat = tx.category || ''
  if (EXCLUDED_FROM_1B.has(cat)) return false
  if (!cat.startsWith('EXPENSE_')) return false
  return isPurchaseGstClaimable(tx)
}

export function analyzeGstSalesBreakdown(transactions: GstTx[]): GstSalesBreakdown {
  let g1 = 0
  let g2 = 0
  let g3 = 0
  let gstOnSales = 0
  let gstOnPurchases = 0
  let gstFreeIncome = 0
  let gstInclusiveIncome = 0
  let incomeWithoutGstTags = 0
  let incomeTransactionCount = 0

  for (const tx of transactions) {
    if (isTaxablePurchaseExpense(tx)) {
      if (tx.gstInfo?.gstType === 'INCLUDED' && tx.gstInfo.gstAmount) {
        gstOnPurchases += tx.gstInfo.gstAmount
      } else {
        // Default Australian inclusive GST estimate (matches Biz Intel taxableExpenses/11)
        gstOnPurchases += Math.abs(tx.debit || 0) / 11
      }
    }

    if (!isG1IncomeTransaction(tx)) continue

    const gross = Math.abs(tx.credit || 0)
    incomeTransactionCount++
    g1 += gross

    if (isExportSale(tx)) {
      g2 += gross
      continue
    }

    if (isGstFreeSale(tx)) {
      g3 += gross
      gstFreeIncome += gross
      continue
    }

    const gstType = tx.gstInfo?.gstType
    if (gstType === 'INCLUDED' && tx.gstInfo?.gstAmount) {
      gstOnSales += tx.gstInfo.gstAmount
      gstInclusiveIncome += gross
    } else {
      incomeWithoutGstTags += gross
      // Default inclusive estimate — aligns with Biz Intel income/11
      gstOnSales += gross / 11
      if (tx.gstInfo?.gstAmount) {
        // Prefer explicit tag when present (already counted above only for INCLUDED)
      }
    }
  }

  return {
    g1TotalSalesGstInclusive: roundMoney(g1),
    g2ExportSales: roundMoney(g2),
    g3OtherGstFreeSales: roundMoney(g3),
    gstOnSales: roundMoney(gstOnSales),
    gstOnPurchases: roundMoney(gstOnPurchases),
    gstFreeIncome: roundMoney(gstFreeIncome),
    gstInclusiveIncome: roundMoney(gstInclusiveIncome),
    incomeWithoutGstTags: roundMoney(incomeWithoutGstTags),
    incomeTransactionCount,
  }
}

export function estimatePaygInstalment(
  netProfit: number,
  periodType: 'monthly' | 'quarterly',
  taxRate = 0.25
): number {
  if (netProfit <= 0) return 0
  const annualTax = netProfit * taxRate
  const periods = periodType === 'monthly' ? 12 : 4
  return roundMoney(annualTax / periods)
}
