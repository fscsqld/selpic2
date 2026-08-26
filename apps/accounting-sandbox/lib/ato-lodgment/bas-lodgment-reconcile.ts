/**
 * Compare Reports BAS metrics with ATO Lodgment BAS fields (same period).
 */

import { computeBasLodgment } from '@/lib/ato-lodgment/compute-lodgment'
import type { LodgmentField } from '@/lib/ato-lodgment/types'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

export interface BasReconcileRow {
  id: string
  label: string
  reportsAmount: number
  lodgmentAmount: number
  lodgmentFieldId: string
  ok: boolean
  detail?: string
}

export interface BasReconcileResult {
  rows: BasReconcileRow[]
  allOk: boolean
  periodLabel: string
}

const TOLERANCE = 0.03

function fieldAmount(fields: LodgmentField[], id: string): number {
  return fields.find((f) => f.id === id)?.amount ?? 0
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE
}

export interface BasReconcileInput {
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    department?: string
    source?: string
    gstInfo?: {
      isGSTIncluded?: boolean
      gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
    }
  }>
  openingDirectorLoanBalance: number
  accountType: 'company' | 'sole_trader'
  periodStart: string
  periodEnd: string
  periodLabel: string
  periodType: 'monthly' | 'quarterly'
  priorPeriodDirectorAdvances?: number
}

export function buildBasReconcileResult(input: BasReconcileInput): BasReconcileResult {
  const {
    transactions,
    openingDirectorLoanBalance,
    accountType,
    periodStart,
    periodEnd,
    periodLabel,
    periodType,
    priorPeriodDirectorAdvances,
  } = input

  const metrics = calculateBusinessMetrics(
    transactions,
    openingDirectorLoanBalance,
    accountType,
    priorPeriodDirectorAdvances
  )

  const lodgment = computeBasLodgment(
    transactions,
    periodStart,
    periodEnd,
    periodType,
    periodLabel,
    openingDirectorLoanBalance,
    accountType,
    priorPeriodDirectorAdvances
  )

  const fields = lodgment.fields
  const g1 = fieldAmount(fields, 'G1')
  const a1 = fieldAmount(fields, '1A')
  const b1 = fieldAmount(fields, '1B')
  const c1 = fieldAmount(fields, '1C')
  const c7 = fieldAmount(fields, '7C')
  const reportsNetGst = metrics.gstPayable - metrics.gstClaimable
  const lodgmentNetGst = a1 - b1

  const rows: BasReconcileRow[] = [
    {
      id: 'g1',
      label: 'G1 — Total sales',
      reportsAmount: metrics.totalIncome,
      lodgmentAmount: g1,
      lodgmentFieldId: 'G1',
      ok: near(metrics.totalIncome, g1),
      detail:
        metrics.totalIncome !== g1
          ? 'Lodgment may use GST breakdown — review export sales on ATO Lodgment'
          : undefined,
    },
    {
      id: '1a',
      label: '1A — GST on sales',
      reportsAmount: metrics.gstPayable,
      lodgmentAmount: a1,
      lodgmentFieldId: '1A',
      ok: near(metrics.gstPayable, a1),
    },
    {
      id: '1b',
      label: '1B — GST on purchases',
      reportsAmount: metrics.gstClaimable,
      lodgmentAmount: b1,
      lodgmentFieldId: '1B',
      ok: near(metrics.gstClaimable, b1),
    },
    {
      id: 'gst_net',
      label: 'Net GST (payable or refund)',
      reportsAmount: reportsNetGst,
      lodgmentAmount: lodgmentNetGst,
      lodgmentFieldId: reportsNetGst >= 0 ? '1C' : '7C',
      ok: near(reportsNetGst, lodgmentNetGst),
      detail:
        reportsNetGst >= 0
          ? `Lodgment 1C: ${c1.toFixed(2)}`
          : `Lodgment 7C: ${c7.toFixed(2)}`,
    },
  ]

  return {
    rows,
    allOk: rows.every((r) => r.ok),
    periodLabel,
  }
}
