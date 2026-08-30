import { describe, expect, it } from 'vitest'
import {
  buildPreLodgeChecklist,
  computeReadyToLodge,
} from '@/lib/ato-lodgment/pre-lodge-checklist'
import type { LodgmentField, LodgmentValidation } from '@/lib/ato-lodgment/types'
import type { LodgmentPeriodScopeSummary } from '@/lib/ato-lodgment/period-scope'

const okValidation: LodgmentValidation = { ok: true, errors: [], warnings: [] }
const lockedScope: LodgmentPeriodScopeSummary = {
  periodStart: '2025-07-01',
  periodEnd: '2026-06-30',
  months: [],
  totalInRange: 10,
  allMonthsLocked: true,
  anyOpenWithTransactions: false,
  openMonthIds: [],
  lockedTransactionCount: 10,
  openTransactionCount: 0,
}

function field(id: string, amount: number, readOnly = false): LodgmentField {
  return {
    id,
    label: id,
    amount,
    section: 'income',
    readOnly,
  }
}

describe('computeReadyToLodge', () => {
  it('fails when a required item fails', () => {
    const ready = computeReadyToLodge([
      { id: 'a', label: 'A', passed: false, severity: 'required' },
      { id: 'b', label: 'B', passed: true, severity: 'recommended', blockingForReady: true },
    ])
    expect(ready).toBe(false)
  })

  it('fails when a blocking recommended item fails', () => {
    const ready = computeReadyToLodge([
      { id: 'a', label: 'A', passed: true, severity: 'required' },
      { id: 'b', label: 'B', passed: false, severity: 'recommended', blockingForReady: true },
    ])
    expect(ready).toBe(false)
  })

  it('allows one soft recommended failure', () => {
    const ready = computeReadyToLodge([
      { id: 'a', label: 'A', passed: true, severity: 'required' },
      { id: 'b', label: 'B', passed: true, severity: 'recommended', blockingForReady: true },
      { id: 'c', label: 'C', passed: false, severity: 'recommended' },
    ])
    expect(ready).toBe(true)
  })
})

describe('buildPreLodgeChecklist — individual', () => {
  const baseFields: LodgmentField[] = [
    field('IND_SALARY', 0),
    field('IND_TAX_WITHHELD', 0),
    field('IND_RENTAL', 0),
    field('IND_CAPITAL_GAINS', 0),
    field('IND_TAXABLE_INCOME', 50_000),
    field('IND_PHI_REBATE', 0),
    field('IND_MEDICARE_SURCHARGE', 0),
  ]

  it('requires reports reviewed when flag is provided', () => {
    const result = buildPreLodgeChecklist({
      fields: baseFields,
      validation: okValidation,
      scopeSummary: lockedScope,
      uncategorisedCount: 0,
      entered: {},
      kind: 'individual',
      scopeMode: 'locked_only',
      hasReviewedReports: false,
    })
    const reports = result.items.find((i) => i.id === 'reports_reviewed')
    expect(reports?.severity).toBe('required')
    expect(reports?.passed).toBe(false)
    expect(result.readyToLodge).toBe(false)
  })

  it('skips payment summary when journey skips salary', () => {
    const result = buildPreLodgeChecklist({
      fields: baseFields,
      validation: okValidation,
      scopeSummary: lockedScope,
      uncategorisedCount: 0,
      entered: Object.fromEntries(baseFields.map((f) => [f.id, true])),
      kind: 'individual',
      scopeMode: 'locked_only',
      hasReviewedReports: true,
      individualExtras: { skipPaymentSummary: true },
    })
    const payment = result.items.find((i) => i.id === 'payment_summary')
    expect(payment?.passed).toBe(true)
    expect(payment?.blockingForReady).toBe(false)
  })

  it('blocks on myTax outside sections when incomplete', () => {
    const result = buildPreLodgeChecklist({
      fields: baseFields,
      validation: okValidation,
      scopeSummary: lockedScope,
      uncategorisedCount: 0,
      entered: Object.fromEntries(baseFields.map((f) => [f.id, true])),
      kind: 'individual',
      scopeMode: 'locked_only',
      hasReviewedReports: true,
      individualExtras: {
        skipPaymentSummary: true,
        myTaxOutsideDone: 1,
        myTaxOutsideTotal: 5,
      },
    })
    const outside = result.items.find((i) => i.id === 'mytax_outside')
    expect(outside?.passed).toBe(false)
    expect(outside?.blockingForReady).toBe(true)
    expect(result.readyToLodge).toBe(false)
  })
})

describe('buildPreLodgeChecklist — business', () => {
  it('omits BAS GST checks when not GST registered', () => {
    const fields: LodgmentField[] = [
      field('G1', 1000),
      field('1A', 100),
      field('1B', 0),
      field('1C', 100),
      field('7C', 0),
    ]
    const result = buildPreLodgeChecklist({
      fields,
      validation: okValidation,
      scopeSummary: lockedScope,
      uncategorisedCount: 0,
      entered: Object.fromEntries(fields.map((f) => [f.id, true])),
      kind: 'bas',
      scopeMode: 'locked_only',
      hasReviewedReports: true,
      businessExtras: { gstRegistered: false },
    })
    expect(result.items.find((i) => i.id === 'gst_net')).toBeUndefined()
  })

  it('marks sole trader annual GST summary N/A when not registered', () => {
    const fields: LodgmentField[] = [
      field('MYTAX_NET_INCOME', 10_000),
      field('MYTAX_TOTAL_INCOME', 12_000),
      field('MYTAX_CONTRACTOR', 0),
      field('MYTAX_GST_ON_INCOME', 0),
      field('MYTAX_GST_ON_PURCHASES', 0),
    ]
    const result = buildPreLodgeChecklist({
      fields,
      validation: okValidation,
      scopeSummary: lockedScope,
      uncategorisedCount: 0,
      entered: Object.fromEntries(fields.map((f) => [f.id, true])),
      kind: 'annual',
      scopeMode: 'locked_only',
      hasReviewedReports: true,
      businessExtras: { accountType: 'sole_trader', gstRegistered: false },
    })
    const gstAnnual = result.items.find((i) => i.id === 'sole_gst_annual')
    expect(gstAnnual?.passed).toBe(true)
    const basSnaps = result.items.find((i) => i.id === 'sole_bas_snapshots')
    expect(basSnaps?.passed).toBe(true)
  })
})
