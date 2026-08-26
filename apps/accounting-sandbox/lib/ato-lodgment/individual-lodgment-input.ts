/**
 * Shared input merging for individual myTax lodgment (Reports + ATO Lodgment).
 */

import {
  computeIndividualLodgment,
  type IndividualManualOverrides,
  type IndividualWorksheetHints,
} from '@/lib/ato-lodgment/compute-individual-lodgment'
import type { IndividualLodgmentResult } from '@/lib/ato-lodgment/types'

export const INDIVIDUAL_OVERRIDES_UPDATED_EVENT = 'individualTaxOverridesUpdated'

export interface IndividualTransaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
}

export interface PaymentTotals {
  grossPayments: number
  taxWithheld: number
  count: number
}

export interface WorksheetNets {
  rental: number
  cgt: number
  rentalCount: number
  cgtCount: number
  rentalHasData: boolean
  cgtHasData: boolean
  active: boolean
}

export function individualOverridesStorageKey(financialYear: string): string {
  return `individual_tax_overrides_${financialYear}`
}

export function readIndividualOverrides(financialYear: string): IndividualManualOverrides {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(individualOverridesStorageKey(financialYear))
    return raw ? (JSON.parse(raw) as IndividualManualOverrides) : {}
  } catch {
    return {}
  }
}

export function notifyIndividualOverridesUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INDIVIDUAL_OVERRIDES_UPDATED_EVENT))
  }
}

export function buildEffectiveIndividualOverrides(
  overrides: IndividualManualOverrides,
  paymentTotals: PaymentTotals,
  worksheetNets: WorksheetNets
): IndividualManualOverrides {
  const merged: IndividualManualOverrides = { ...overrides }
  if (merged.salary === undefined && paymentTotals.grossPayments > 0) {
    merged.salary = paymentTotals.grossPayments
  }
  if (merged.taxWithheld === undefined && paymentTotals.taxWithheld > 0) {
    merged.taxWithheld = paymentTotals.taxWithheld
  }
  if (merged.rentalIncome === undefined && worksheetNets.rentalHasData) {
    merged.rentalIncome = worksheetNets.rental
  }
  if (merged.capitalGains === undefined && worksheetNets.cgtHasData) {
    merged.capitalGains = worksheetNets.cgt
  }
  return merged
}

export function buildIndividualWorksheetHints(
  overrides: IndividualManualOverrides,
  worksheetNets: WorksheetNets
): IndividualWorksheetHints {
  return {
    rentalFromWorksheet: overrides.rentalIncome === undefined && worksheetNets.rentalHasData,
    rentalPropertyCount: worksheetNets.rentalCount,
    cgtFromWorksheet: overrides.capitalGains === undefined && worksheetNets.cgtHasData,
    cgtEventCount: worksheetNets.cgtCount,
  }
}

export function computePersonalTaxLodgment(
  transactions: IndividualTransaction[],
  financialYear: string,
  overrides: IndividualManualOverrides,
  paymentTotals: PaymentTotals,
  worksheetNets: WorksheetNets
): IndividualLodgmentResult {
  const effective = buildEffectiveIndividualOverrides(overrides, paymentTotals, worksheetNets)
  const hints = buildIndividualWorksheetHints(overrides, worksheetNets)
  return computeIndividualLodgment(transactions, financialYear, effective, hints)
}

export function filterTransactionsByFinancialYear(
  transactions: IndividualTransaction[],
  financialYear: string
): IndividualTransaction[] {
  const [sy, ey] = financialYear.split('-').map(Number)
  const start = `${sy}-07-01`
  const end = `${ey}-06-30`
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).setHours(23, 59, 59, 999)
  return transactions.filter((tx) => {
    const t = new Date(tx.date).getTime()
    return t >= startMs && t <= endMs
  })
}

export function listRecentIndividualFinancialYears(count: number = 5): string[] {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const startYear = month >= 6 ? year : year - 1
  const years: string[] = []
  for (let i = 0; i < count; i++) {
    const sy = startYear - i
    years.push(`${sy}-${sy + 1}`)
  }
  return years
}
