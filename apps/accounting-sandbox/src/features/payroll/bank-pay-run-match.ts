/**
 * Phase 4 — match bank outflows to Pay Run amounts and clear liabilities
 * (never double-count as EXPENSE_WAGES when accrual already exists).
 */

import type { Payslip } from './types'
import type { Employee } from '../../shared/types/employee'
import { LIABILITY_WAGES_PAYABLE } from './bookkeeping'

export type PayrollClearKind = 'net_wages' | 'payg_remittance' | 'super_remittance'

export const PAYROLL_CLEAR_CATEGORIES: Record<PayrollClearKind, string> = {
  net_wages: LIABILITY_WAGES_PAYABLE,
  payg_remittance: 'LIABILITY_PAYG_WITHHOLDING',
  super_remittance: 'LIABILITY_SUPERANNUATION',
}

export interface BankDebitLike {
  id?: string
  date: string
  description: string
  debit: number | null
  credit?: number | null
  category?: string
  source?: string
  /** Set when bank line clears a payroll liability (not an HR journal). */
  clearsPayrollLiability?: boolean
  payrollClearKind?: PayrollClearKind
  matchedPayslipId?: string
  previousCategory?: string
  isPayrollTransaction?: boolean
  matchedEmployee?: { name?: string; employeeId?: string }
}

export interface PayRunBankMatchSuggestion {
  bankKey: string
  bank: BankDebitLike
  kind: PayrollClearKind
  confidence: 'high' | 'medium' | 'low'
  reason: string
  payslipId?: string
  employeeName?: string
  amount: number
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function amountNearlyEqual(a: number, b: number, tol = 0.02): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) <= tol
}

export function bankTxKey(tx: BankDebitLike): string {
  if (tx.id) return `id:${tx.id}`
  return `fp:${tx.date}|${tx.description}|${tx.debit ?? ''}`
}

export function classifyPayrollBankDebit(
  description: string
): PayrollClearKind | null {
  const d = String(description || '').toUpperCase()
  if (!d.trim()) return null

  if (
    /\bATO\b/.test(d) ||
    /\bPAYG\b/.test(d) ||
    /\bBAS\b/.test(d) ||
    /WITHHOLD/.test(d)
  ) {
    return 'payg_remittance'
  }
  if (
    /\bSUPER\b/.test(d) ||
    /SUPERANNUATION/.test(d) ||
    /\bREST\b/.test(d) ||
    /AUSTRALIAN\s*SUPER/.test(d) ||
    /HOSTPLUS|CBUS|MTAA|HESTA|UNISUPER/.test(d)
  ) {
    return 'super_remittance'
  }
  if (
    /\bWAGE/.test(d) ||
    /\bSALARY\b/.test(d) ||
    /PAY\s*RUN/.test(d) ||
    /\bPAYROLL\b/.test(d) ||
    /\bNET\s*PAY\b/.test(d)
  ) {
    return 'net_wages'
  }
  return null
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a.slice(0, 10)).getTime()
  const db = new Date(b.slice(0, 10)).getTime()
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 999
  return Math.abs(da - db) / (1000 * 60 * 60 * 24)
}

function descriptionMentionsEmployee(
  description: string,
  employee: Employee
): boolean {
  const d = description.toLowerCase()
  const nameWords = (employee.name || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  if (nameWords.some((w) => d.includes(w))) return true
  const acct = employee.bankAccount?.accountNumber?.replace(/\s/g, '')
  if (acct && d.replace(/\s/g, '').includes(acct)) return true
  const bsb = employee.bankAccount?.bsb?.replace(/[\s-]/g, '')
  if (bsb && d.replace(/[\s-]/g, '').includes(bsb)) return true
  return false
}

export function isBankPayrollClearCandidate(tx: BankDebitLike): boolean {
  if (tx.source === 'payroll') return false
  if (!tx.debit || tx.debit <= 0) return false
  if (tx.clearsPayrollLiability) return false
  return true
}

/**
 * Suggest bank debit ↔ payslip net (or remittance kind) matches.
 * Does not mutate inputs. One payslip net can only be suggested once.
 */
export function suggestPayRunBankMatches(
  bankTransactions: BankDebitLike[],
  payslips: Payslip[],
  employees: Employee[]
): PayRunBankMatchSuggestion[] {
  const empById = new Map<string, Employee>()
  for (const e of employees) {
    empById.set(e.id, e)
    empById.set(e.employeeId, e)
  }

  const availablePayslips = payslips.filter(
    (p) =>
      (p.status === 'approved' || p.status === 'paid') &&
      !(p as Payslip & { bankMatchedTransactionKey?: string }).bankMatchedTransactionKey
  )

  const usedPayslipIds = new Set<string>()
  const suggestions: PayRunBankMatchSuggestion[] = []

  for (const bank of bankTransactions) {
    if (!isBankPayrollClearCandidate(bank)) continue
    const amount = Number(bank.debit)
    const key = bankTxKey(bank)
    let kind = classifyPayrollBankDebit(bank.description || '')

    // Employee/account hit → treat as net wages even without wage keywords
    const employeeHit = employees.find((e) =>
      descriptionMentionsEmployee(bank.description || '', e)
    )
    if (!kind && employeeHit) kind = 'net_wages'
    if (!kind) continue

    if (kind === 'net_wages') {
      let best: {
        payslip: Payslip
        confidence: 'high' | 'medium' | 'low'
        reason: string
      } | null = null

      for (const p of availablePayslips) {
        if (usedPayslipIds.has(p.id)) continue
        if (!amountNearlyEqual(amount, p.netPay)) continue

        const emp =
          empById.get(p.employeeId) ||
          employees.find((e) => e.name === p.employeeName)
        const nameHit = emp
          ? descriptionMentionsEmployee(bank.description || '', emp)
          : (bank.description || '')
              .toLowerCase()
              .includes((p.employeeName || '').toLowerCase().split(/\s+/)[0] || '___')

        const anchor = (p.payDate || p.payPeriod?.end || '').slice(0, 10)
        const dateOk = !anchor || daysBetween(bank.date, anchor) <= 21

        if (!dateOk && !nameHit) continue

        let confidence: 'high' | 'medium' | 'low' = 'medium'
        const reasons: string[] = [`Net ${p.netPay} ≈ bank ${amount}`]
        if (nameHit && dateOk) {
          confidence = 'high'
          reasons.push('name/account + date')
        } else if (nameHit) {
          confidence = 'high'
          reasons.push('name/account')
        } else if (dateOk) {
          confidence = 'medium'
          reasons.push('date near pay')
        } else {
          confidence = 'low'
          reasons.push('amount only')
        }

        if (
          !best ||
          (confidence === 'high' && best.confidence !== 'high') ||
          (confidence === 'medium' && best.confidence === 'low')
        ) {
          best = { payslip: p, confidence, reason: reasons.join('; ') }
        }
      }

      if (best) {
        usedPayslipIds.add(best.payslip.id)
        suggestions.push({
          bankKey: key,
          bank,
          kind,
          confidence: best.confidence,
          reason: best.reason,
          payslipId: best.payslip.id,
          employeeName: best.payslip.employeeName,
          amount,
        })
      } else if (employeeHit || kind === 'net_wages') {
        // Wage-like debit with no payslip — still offer liability clear
        suggestions.push({
          bankKey: key,
          bank,
          kind: 'net_wages',
          confidence: employeeHit ? 'medium' : 'low',
          reason: employeeHit
            ? `Employee hint (${employeeHit.name}); no matching payslip net`
            : 'Wage/payroll keywords; no matching payslip net',
          employeeName: employeeHit?.name,
          amount,
        })
      }
      continue
    }

    // PAYG / Super remittance — clear liability category (payslip optional)
    suggestions.push({
      bankKey: key,
      bank,
      kind,
      confidence: 'medium',
      reason:
        kind === 'payg_remittance'
          ? 'ATO/PAYG-like debit → clear PAYG payable'
          : 'Super-like debit → clear Super payable',
      amount,
    })
  }

  return suggestions.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 }
    return rank[a.confidence] - rank[b.confidence]
  })
}

/** Patch fields to apply on a bank row when user confirms a match. */
export function buildBankClearPatch(suggestion: PayRunBankMatchSuggestion): {
  category: string
  clearsPayrollLiability: true
  payrollClearKind: PayrollClearKind
  matchedPayslipId?: string
  previousCategory?: string
  isPayrollTransaction: false
  requiresPAYG: false
  confidence: string
} {
  return {
    category: PAYROLL_CLEAR_CATEGORIES[suggestion.kind],
    clearsPayrollLiability: true,
    payrollClearKind: suggestion.kind,
    matchedPayslipId: suggestion.payslipId,
    previousCategory: suggestion.bank.category,
    isPayrollTransaction: false,
    requiresPAYG: false,
    confidence: 'Manual',
  }
}

export function buildBankUnclearPatch(tx: BankDebitLike): {
  category?: string
  clearsPayrollLiability: false
  payrollClearKind: undefined
  matchedPayslipId: undefined
  previousCategory: undefined
} {
  return {
    category: tx.previousCategory || tx.category,
    clearsPayrollLiability: false,
    payrollClearKind: undefined,
    matchedPayslipId: undefined,
    previousCategory: undefined,
  }
}

/** Whether a bank debit still looks like double-count risk (expense wages). */
export function isUnmatchedWageExpenseRisk(tx: BankDebitLike): boolean {
  if (!tx.debit || tx.debit <= 0) return false
  if (tx.clearsPayrollLiability) return false
  if (tx.source === 'payroll') return false
  const cat = tx.category || ''
  return (
    cat === 'EXPENSE_WAGES_SALARIES' ||
    cat === 'EXPENSE_DIRECTORS_FEES' ||
    cat === 'EXPENSE_SUPERANNUATION'
  )
}
