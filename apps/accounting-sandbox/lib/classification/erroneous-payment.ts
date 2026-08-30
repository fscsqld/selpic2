/**
 * Erroneous / accidental bank payments and their returns.
 * These are non-P&L items — not business income or deductible expense.
 */

import type { BankTransaction } from '@/lib/pdf-parser/types'

export const ERRONEOUS_PAYMENT_OUT = 'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT' as const
export const ERRONEOUS_PAYMENT_RETURN = 'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN' as const

export type ErroneousPaymentCategory =
  | typeof ERRONEOUS_PAYMENT_OUT
  | typeof ERRONEOUS_PAYMENT_RETURN

export interface ErroneousPaymentMatch {
  category: ErroneousPaymentCategory
  department: 'general'
  confidence: number
  reason: string
  /** Bank row parsed as debit but narrative is a return deposit */
  swapToCredit?: boolean
}

function normalise(desc: string): string {
  return desc.toUpperCase().replace(/\s+/g, ' ')
}

/** Credit / return side — money coming back after a mistaken payment. */
export function isErroneousPaymentReturnDescription(description: string): boolean {
  const d = normalise(description)
  if (!d) return false

  const strongPhrases = [
    'RETURN WRONG',
    'WRONG REIMB',
    'RETURN OF ACCIDENTAL',
    'RETURN OF WRONG',
    'ACCIDENTAL RETURN',
    'ERRONEOUS PAYMENT RETURN',
    'MISTAKEN PAYMENT RETURN',
    'WRONG PAYMENT RETURN',
    'REIMB RETURN',
    'RETURN REIMB',
  ]
  if (strongPhrases.some((p) => d.includes(p))) return true

  const hasReturn = d.includes('RETURN') || d.includes('REFUND') || d.includes('REIMB')
  const hasMistake =
    d.includes('WRONG') ||
    d.includes('ACCIDENTAL') ||
    d.includes('ERRONEOUS') ||
    d.includes('MISTAKEN')

  return hasReturn && hasMistake
}

/** Debit / outflow side — mistaken payment sent from the company account. */
export function isErroneousPaymentOutDescription(description: string): boolean {
  const d = normalise(description)
  if (!d) return false

  if (isErroneousPaymentReturnDescription(description)) return false

  const outPhrases = [
    'WRONG PAYMENT',
    'ACCIDENTAL PAYMENT',
    'ERRONEOUS PAYMENT',
    'MISTAKEN TRANSFER',
    'MISTAKEN PAYMENT',
    'WRONG TRANSFER',
    'WRONG REIMBURSEMENT',
    'ACCIDENTAL TRANSFER',
    'PAYMENT IN ERROR',
    'SENT IN ERROR',
  ]
  return outPhrases.some((p) => d.includes(p))
}

export function detectErroneousPayment(tx: Pick<BankTransaction, 'description' | 'debit' | 'credit'>): ErroneousPaymentMatch | null {
  const desc = tx.description || ''
  const hasDebit = !!(tx.debit && Math.abs(tx.debit) > 0)
  const hasCredit = !!(tx.credit && Math.abs(tx.credit) > 0)

  if (isErroneousPaymentReturnDescription(desc)) {
    if (hasDebit && !hasCredit) {
      return {
        category: ERRONEOUS_PAYMENT_RETURN,
        department: 'general',
        confidence: 0.98,
        reason: 'Return of mistaken payment — deposit (converted from incorrect debit parse)',
        swapToCredit: true,
      }
    }
    if (hasCredit) {
      return {
        category: ERRONEOUS_PAYMENT_RETURN,
        department: 'general',
        confidence: 0.98,
        reason: 'Return of mistaken / accidental payment — not taxable income',
      }
    }
  }

  if (hasDebit && isErroneousPaymentOutDescription(desc)) {
    return {
      category: ERRONEOUS_PAYMENT_OUT,
      department: 'general',
      confidence: 0.95,
      reason: 'Erroneous payment sent — not a business expense (awaiting return or reversal)',
    }
  }

  return null
}

export function applyErroneousPaymentSwap<T extends BankTransaction>(tx: T): T {
  const match = detectErroneousPayment(tx)
  if (!match?.swapToCredit || !tx.debit) return tx
  return {
    ...tx,
    credit: tx.debit,
    debit: null,
  }
}
