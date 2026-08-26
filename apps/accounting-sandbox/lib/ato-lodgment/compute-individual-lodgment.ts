/**
 * Build personal myTax lodgment fields from individual bank transactions.
 */

import { getCurrentFinancialYearRange } from './compute-lodgment'
import {
  classifyIndividualTransactions,
  countUncategorisedIndividual,
  type IndividualTransaction,
} from './classify-individual-transactions'
import { enrichLodgmentFields } from './field-metadata'
import {
  buildMyTaxIndividualFields,
  validateIndividualLodgment,
  type IndividualManualOverrides,
} from './mytax-individual-field-map'
import type { IndividualLodgmentResult } from './types'

function filterByDateRange<T extends { date: string }>(
  items: T[],
  start: string,
  end: string
): T[] {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).setHours(23, 59, 59, 999)
  return items.filter((tx) => {
    const t = new Date(tx.date).getTime()
    return t >= startMs && t <= endMs
  })
}

export function computeIndividualLodgment(
  transactions: IndividualTransaction[],
  financialYear?: string,
  overrides: IndividualManualOverrides = {}
): IndividualLodgmentResult {
  const fyRange = financialYear
    ? (() => {
        const [sy, ey] = financialYear.split('-').map(Number)
        return {
          financialYear,
          startDate: `${sy}-07-01`,
          endDate: `${ey}-06-30`,
        }
      })()
    : getCurrentFinancialYearRange()

  const filtered = filterByDateRange(transactions, fyRange.startDate, fyRange.endDate)
  const bankHints = classifyIndividualTransactions(filtered)
  const uncategorisedCount = countUncategorisedIndividual(filtered)

  const fields = enrichLodgmentFields(
    buildMyTaxIndividualFields(bankHints, overrides),
    'individual'
  )

  return {
    kind: 'individual',
    financialYear: fyRange.financialYear,
    periodStart: fyRange.startDate,
    periodEnd: fyRange.endDate,
    fields,
    validation: validateIndividualLodgment(fields, uncategorisedCount),
    uncategorisedCount,
    bankHints,
  }
}

export type { IndividualManualOverrides }
