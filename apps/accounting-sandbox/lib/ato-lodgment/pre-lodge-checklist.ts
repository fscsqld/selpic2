/**
 * Pre-lodge checklist for ATO Lodgment Guide.
 */

import type { LodgmentField, LodgmentValidation } from './types'
import type { LodgmentPeriodScopeSummary } from './period-scope'

export interface PreLodgeCheckItem {
  id: string
  label: string
  passed: boolean
  detail?: string
  severity: 'required' | 'recommended'
  /** When true, must pass for readyToLodge even though severity is recommended */
  blockingForReady?: boolean
}

export interface PreLodgeChecklistResult {
  items: PreLodgeCheckItem[]
  allRequiredPassed: boolean
  readyToLodge: boolean
}

export interface LodgmentSnapshotPreLodge {
  readyToLodge: boolean
  allRequiredPassed: boolean
  savedAt: string
  items: Array<{
    id: string
    passed: boolean
    severity: 'required' | 'recommended'
    blockingForReady?: boolean
  }>
}

export interface PreLodgeIndividualExtras {
  paymentSummaryCount?: number
  rentalWorksheetFilled?: boolean
  cgtWorksheetFilled?: boolean
  rentalManuallyEntered?: boolean
  cgtManuallyEntered?: boolean
  taxableIncome?: number
  /** Journey preference: no salary income — skip payment summary checks */
  skipPaymentSummary?: boolean
  /** myTax sections completed outside SELPIC field sheet */
  myTaxOutsideDone?: number
  myTaxOutsideTotal?: number
}

export interface PreLodgeBusinessExtras {
  accountType?: 'company' | 'sole_trader'
  hasPayrollActivity?: boolean
  ctrTaxRate?: number
  ctrHasAdjustments?: boolean
  basPeriodKeysInFy?: string[]
  basSnapshotsWithPeriod?: number
  /** When false, BAS-specific items are not applicable */
  gstRegistered?: boolean
}

const MLS_THRESHOLD = 97_000

function pushItem(items: PreLodgeCheckItem[], item: PreLodgeCheckItem): void {
  items.push(item)
}

export function computeReadyToLodge(items: PreLodgeCheckItem[]): boolean {
  const required = items.filter((i) => i.severity === 'required')
  if (!required.every((i) => i.passed)) return false

  const recommended = items.filter((i) => i.severity === 'recommended')
  const blocking = recommended.filter((i) => i.blockingForReady)
  if (blocking.some((i) => !i.passed)) return false

  const soft = recommended.filter((i) => !i.blockingForReady)
  return soft.filter((i) => !i.passed).length <= 1
}

export function serializePreLodgeSummary(result: PreLodgeChecklistResult): LodgmentSnapshotPreLodge {
  return {
    readyToLodge: result.readyToLodge,
    allRequiredPassed: result.allRequiredPassed,
    savedAt: new Date().toISOString(),
    items: result.items.map(({ id, passed, severity, blockingForReady }) => ({
      id,
      passed,
      severity,
      blockingForReady,
    })),
  }
}

export function buildPreLodgeChecklist(options: {
  fields: LodgmentField[]
  validation: LodgmentValidation
  scopeSummary: LodgmentPeriodScopeSummary
  uncategorisedCount: number
  entered: Record<string, boolean>
  kind: 'bas' | 'annual' | 'ctr' | 'individual'
  scopeMode: string
  hasReviewedReports?: boolean
  individualExtras?: PreLodgeIndividualExtras
  businessExtras?: PreLodgeBusinessExtras
}): PreLodgeChecklistResult {
  const {
    fields,
    validation,
    scopeSummary,
    uncategorisedCount,
    entered,
    kind,
    scopeMode,
    hasReviewedReports,
    individualExtras,
    businessExtras,
  } = options

  const items: PreLodgeCheckItem[] = []
  const skipPaymentSummary = individualExtras?.skipPaymentSummary === true
  const gstRegistered = businessExtras?.gstRegistered !== false

  if (hasReviewedReports !== undefined) {
    pushItem(items, {
      id: 'reports_reviewed',
      label:
        kind === 'individual'
          ? 'Personal Tax Summary reviewed on Reports tab'
          : 'Compliance reports reviewed on Reports tab',
      passed: hasReviewedReports,
      detail: hasReviewedReports
        ? 'Reports tab visited for this financial year'
        : 'Open Reports and review your tax summary or financials before lodging',
      severity: 'required',
      blockingForReady: true,
    })
  }

  pushItem(items, {
    id: 'uncategorised',
    label: 'No uncategorised transactions in scope',
    passed: uncategorisedCount === 0,
    detail:
      uncategorisedCount > 0
        ? `${uncategorisedCount} uncategorised transaction(s) remain`
        : 'All transactions in scope are categorised',
    severity: 'required',
  })

  pushItem(items, {
    id: 'periods_locked',
    label: 'All months in reporting range are locked',
    passed: scopeSummary.allMonthsLocked || scopeSummary.totalInRange === 0,
    detail: scopeSummary.anyOpenWithTransactions
      ? `Open months: ${scopeSummary.openMonthIds.join(', ')}`
      : 'Every month with data is locked',
    severity: 'recommended',
  })

  pushItem(items, {
    id: 'scope_locked',
    label: 'Using locked-period data for lodgment',
    passed: scopeMode === 'locked_only' || scopeSummary.allMonthsLocked,
    detail:
      scopeMode === 'locked_only'
        ? 'Locked periods only'
        : 'Consider switching to Locked periods only before lodging',
    severity: 'recommended',
  })

  pushItem(items, {
    id: 'validation',
    label: 'No blocking validation errors',
    passed: validation.ok,
    detail: validation.errors[0] || 'Calculations validated',
    severity: 'required',
  })

  if (kind === 'individual') {
    const salary = fields.find((f) => f.id === 'IND_SALARY')?.amount ?? 0
    const paymentCount = individualExtras?.paymentSummaryCount ?? 0
    pushItem(items, {
      id: 'payment_summary',
      label: skipPaymentSummary
        ? 'Salary / payment summary (not applicable)'
        : 'Salary entered from payment summary',
      passed: skipPaymentSummary || salary > 0,
      detail: skipPaymentSummary
        ? 'Skipped — no salary income in journey settings'
        : salary > 0
          ? paymentCount > 0
            ? `Salary amount entered (${paymentCount} payment summar${paymentCount === 1 ? 'y' : 'ies'} on file)`
            : 'Salary amount entered'
          : 'Enter salary from employer income statement if you are an employee',
      severity: 'recommended',
      blockingForReady: !skipPaymentSummary,
    })

    const withheld = fields.find((f) => f.id === 'IND_TAX_WITHHELD')?.amount ?? 0
    const needsWithheld = !skipPaymentSummary && salary > 0
    pushItem(items, {
      id: 'tax_withheld',
      label: 'Tax withheld entered',
      passed: skipPaymentSummary || withheld > 0 || salary === 0,
      detail: skipPaymentSummary
        ? 'Not applicable — no salary income'
        : withheld > 0
          ? 'Tax withheld amount entered'
          : salary > 0
            ? 'Enter total tax withheld from payment summary'
            : 'Not applicable if no salary income',
      severity: 'recommended',
      blockingForReady: needsWithheld,
    })

    const rental = fields.find((f) => f.id === 'IND_RENTAL')?.amount ?? 0
    const rentalWs = individualExtras?.rentalWorksheetFilled ?? false
    pushItem(items, {
      id: 'rental_worksheet',
      label: 'Rental income supported by worksheet or manual entry',
      passed: rental === 0 || rentalWs || !!individualExtras?.rentalManuallyEntered,
      detail:
        rental === 0
          ? 'No rental income — skip rental schedule'
          : rentalWs
            ? 'Rental worksheet saved — net flows to lodgment'
            : 'Complete rental worksheet or enter net rental manually',
      severity: 'recommended',
      blockingForReady: rental > 0,
    })

    const cgt = fields.find((f) => f.id === 'IND_CAPITAL_GAINS')?.amount ?? 0
    const cgtWs = individualExtras?.cgtWorksheetFilled ?? false
    pushItem(items, {
      id: 'cgt_worksheet',
      label: 'Capital gains supported by worksheet or manual entry',
      passed: cgt === 0 || cgtWs || !!individualExtras?.cgtManuallyEntered,
      detail:
        cgt === 0
          ? 'No CGT events — skip capital gains worksheet'
          : cgtWs
            ? 'CGT worksheet saved — net flows to lodgment'
            : 'Complete CGT worksheet or enter net gain manually',
      severity: 'recommended',
      blockingForReady: cgt > 0,
    })

    const taxable =
      individualExtras?.taxableIncome ??
      fields.find((f) => f.id === 'IND_TAXABLE_INCOME')?.amount ??
      0
    const phiEntered = !!entered['IND_PHI_REBATE']
    const mlsEntered = !!entered['IND_MEDICARE_SURCHARGE']
    const highIncome = taxable >= MLS_THRESHOLD
    pushItem(items, {
      id: 'phi_medicare',
      label: 'PHI rebate & Medicare levy surcharge reviewed in myTax',
      passed: !highIncome || (phiEntered && mlsEntered),
      detail: !highIncome
        ? 'Taxable income below indicative MLS threshold — still confirm PHI rebate if applicable'
        : phiEntered && mlsEntered
          ? 'Both PHI and MLS fields marked entered'
          : 'High income — complete private health and MLS sections in myTax, then check both fields',
      severity: 'recommended',
      blockingForReady: highIncome,
    })

    const outsideTotal = individualExtras?.myTaxOutsideTotal ?? 0
    const outsideDone = individualExtras?.myTaxOutsideDone ?? 0
    if (outsideTotal > 0) {
      pushItem(items, {
        id: 'mytax_outside',
        label: 'myTax portal sections completed (outside SELPIC)',
        passed: outsideDone >= outsideTotal,
        detail: `${outsideDone} of ${outsideTotal} section(s) checked in the outside-myTax checklist`,
        severity: 'recommended',
        blockingForReady: true,
      })
    }
  }

  if (kind === 'bas' && gstRegistered) {
    const g1 = fields.find((f) => f.id === 'G1')?.amount ?? 0
    const a1 = fields.find((f) => f.id === '1A')?.amount ?? 0
    pushItem(items, {
      id: 'g1_gst',
      label: 'G1 / 1A GST treatment reviewed',
      passed: !(g1 > 0 && a1 === 0),
      detail:
        g1 > 0 && a1 === 0
          ? 'Sales exist but 1A is zero — confirm GST-free or export sales'
          : 'GST on sales aligns with income',
      severity: 'recommended',
    })

    const c1 = fields.find((f) => f.id === '1C')?.amount ?? 0
    const c7 = fields.find((f) => f.id === '7C')?.amount ?? 0
    const a1v = fields.find((f) => f.id === '1A')?.amount ?? 0
    const b1 = fields.find((f) => f.id === '1B')?.amount ?? 0
    const net = Math.round((a1v - b1) * 100) / 100
    const gstOk =
      net >= 0 ? Math.abs(c1 - net) < 0.03 && c7 === 0 : Math.abs(c7 - Math.abs(net)) < 0.03
    pushItem(items, {
      id: 'gst_net',
      label: 'GST net (1C or 7C) matches 1A − 1B',
      passed: gstOk,
      detail: gstOk ? 'GST payable/refund is consistent' : 'Review 1A, 1B, 1C and 7C',
      severity: 'required',
    })

    const w1 = fields.find((f) => f.id === 'W1')?.amount ?? 0
    const w2 = fields.find((f) => f.id === 'W2')?.amount ?? 0
    const l4 = fields.find((f) => f.id === '4')?.amount ?? 0
    const paygOk = w1 === 0 || (w2 > 0 && Math.abs(w2 - l4) < 0.03)
    const payrollRequired = businessExtras?.hasPayrollActivity === true
    pushItem(items, {
      id: 'payg_withholding',
      label: 'PAYG withholding (W2 / label 4) reconciled',
      passed: paygOk,
      detail:
        w1 === 0
          ? 'No W1 gross payments in this period'
          : paygOk
            ? `W2 ${w2.toFixed(2)} aligns with label 4`
            : 'W2 and label 4 differ — review payroll withholding',
      severity: payrollRequired ? 'required' : 'recommended',
      blockingForReady: payrollRequired,
    })
  }

  if (kind === 'ctr') {
    const taxable = fields.find((f) => f.id === 'CTR_TAXABLE')?.amount ?? 0
    const taxEst = fields.find((f) => f.id === 'CTR_TAX_EST')?.amount ?? 0
    const rate = businessExtras?.ctrTaxRate ?? 0.25
    pushItem(items, {
      id: 'ctr_tax_rate',
      label: 'Company tax rate confirmed',
      passed: rate === 0.25 || rate === 0.3,
      detail:
        rate === 0.25
          ? '25% base rate entity selected — confirm eligibility'
          : rate === 0.3
            ? '30% standard company rate selected'
            : 'Select 25% or 30% company tax rate',
      severity: 'required',
    })

    pushItem(items, {
      id: 'ctr_taxable',
      label: 'Taxable income and estimated tax reviewed',
      passed: taxable === 0 || taxEst > 0,
      detail:
        taxable === 0
          ? 'Nil or loss position — confirm loss utilisation in OSB'
          : `Taxable ${taxable.toFixed(2)} · estimated tax ${taxEst.toFixed(2)}`,
      severity: 'recommended',
      blockingForReady: taxable > 0,
    })

    if (businessExtras?.ctrHasAdjustments) {
      pushItem(items, {
        id: 'ctr_adjustments',
        label: 'Manual CTR adjustments documented',
        passed: true,
        detail: 'Add-backs, losses or other adjustments applied — verify in OSB',
        severity: 'recommended',
      })
    }
  }

  if (kind === 'annual') {
    const net = fields.find((f) => f.id === 'MYTAX_NET_INCOME')?.amount ?? 0
    const income = fields.find((f) => f.id === 'MYTAX_TOTAL_INCOME')?.amount ?? 0
    pushItem(items, {
      id: 'annual_net',
      label: 'Annual business net income reviewed',
      passed: income > 0 || net !== 0 || income === 0,
      detail: `Net business income (ex GST) ${net.toFixed(2)} — copy to myTax / CTR (not cash P&L)`,
      severity: 'recommended',
    })

    if (businessExtras?.accountType === 'sole_trader') {
      const periodKeys = businessExtras.basPeriodKeysInFy ?? []
      const snapCount = businessExtras.basSnapshotsWithPeriod ?? 0
      pushItem(items, {
        id: 'sole_bas_snapshots',
        label: gstRegistered
          ? 'BAS periods saved for this financial year'
          : 'BAS periods (not registered for GST)',
        passed: !gstRegistered || periodKeys.length === 0 || snapCount >= periodKeys.length,
        detail: !gstRegistered
          ? 'Not registered for GST — BAS not required'
          : periodKeys.length === 0
            ? 'No BAS periods in scope'
            : `${snapCount} of ${periodKeys.length} BAS period(s) have saved snapshots`,
        severity: 'recommended',
      })

      const contractor = fields.find((f) => f.id === 'MYTAX_CONTRACTOR')?.amount ?? 0
      pushItem(items, {
        id: 'sole_contractor',
        label: 'Contractor payments reviewed for myTax',
        passed: contractor === 0 || !!entered['MYTAX_CONTRACTOR'],
        detail:
          contractor > 0
            ? `Contractor total ${contractor.toFixed(2)} — mark entered after copying to myTax`
            : 'No contractor payments detected in ledger',
        severity: 'recommended',
        blockingForReady: contractor > 0,
      })

      const gstOnIncome = fields.find((f) => f.id === 'MYTAX_GST_ON_INCOME')?.amount ?? 0
      const gstOnPurchases = fields.find((f) => f.id === 'MYTAX_GST_ON_PURCHASES')?.amount ?? 0
      pushItem(items, {
        id: 'sole_gst_annual',
        label: 'Annual GST summary reviewed',
        passed: !gstRegistered || gstOnIncome > 0 || gstOnPurchases > 0 || income === 0,
        detail: !gstRegistered
          ? 'Not registered for GST'
          : `GST on income ${gstOnIncome.toFixed(2)} · GST on purchases ${gstOnPurchases.toFixed(2)}`,
        severity: 'recommended',
      })

      const editableFields = fields.filter((f) => !f.readOnly)
      const allEditableEntered =
        editableFields.length > 0 && editableFields.every((f) => entered[f.id])
      pushItem(items, {
        id: 'sole_mytax_schedule',
        label: 'myTax business schedule fields marked entered',
        passed: allEditableEntered,
        detail: 'Copy all annual income/expense lines to myTax sole trader schedule',
        severity: 'recommended',
        blockingForReady: editableFields.length > 0,
      })
    }
  }

  const enteredCount = fields.filter((f) => entered[f.id]).length
  pushItem(items, {
    id: 'fields_entered',
    label: 'All fields marked as entered in ATO',
    passed: fields.length > 0 && enteredCount === fields.length,
    detail: `${enteredCount} of ${fields.length} fields checked`,
    severity: 'recommended',
    blockingForReady: true,
  })

  const allRequiredPassed = items.filter((i) => i.severity === 'required').every((i) => i.passed)
  const readyToLodge = computeReadyToLodge(items)

  return { items, allRequiredPassed, readyToLodge }
}

export function fieldsToTsv(fields: LodgmentField[]): string {
  const lines = ['Field\tEntry kind\tATO screen path\tAmount']
  for (const f of fields) {
    lines.push(
      `${f.label.replace(/\t/g, ' ')}\t${f.entryKind ?? ''}\t${(f.atoScreenPath ?? '').replace(/\t/g, ' ')}\t${f.amount.toFixed(2)}`
    )
  }
  return lines.join('\n')
}
