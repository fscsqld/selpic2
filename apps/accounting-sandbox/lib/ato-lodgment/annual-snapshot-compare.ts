/**
 * Compare Annual / myTax lodgment snapshots for one financial year.
 */

import type { LodgmentField } from './types'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'
import { buildLodgmentPeriodKey } from './compute-lodgment'

export const ANNUAL_COMPARE_METRIC_IDS = [
  'MYTAX_TOTAL_INCOME',
  'MYTAX_TOTAL_EXPENSES',
  'MYTAX_NET_INCOME',
] as const

export type AnnualCompareMetricId = (typeof ANNUAL_COMPARE_METRIC_IDS)[number]

const METRIC_LABELS: Record<AnnualCompareMetricId, string> = {
  MYTAX_TOTAL_INCOME: 'Total income (L2)',
  MYTAX_TOTAL_EXPENSES: 'Total expenses (L2)',
  MYTAX_NET_INCOME: 'Net income (L2)',
}

export function annualCompareMetricLabel(id: AnnualCompareMetricId): string {
  return METRIC_LABELS[id]
}

export interface AnnualSnapshotCompareRow {
  periodKey: string
  periodLabel: string
  snapshot: LodgmentSnapshot | null
  metrics: Record<
    AnnualCompareMetricId,
    { live: number; snapshot: number; delta: number }
  >
  hasSnapshot: boolean
  snapshotFinalized: boolean
}

function amount(fields: LodgmentField[] | null | undefined, id: string): number {
  return fields?.find((f) => f.id === id)?.amount ?? 0
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function latestAnnualSnapshotForFy(
  snapshots: LodgmentSnapshot[],
  financialYear: string
): LodgmentSnapshot | null {
  const periodKey = buildLodgmentPeriodKey('annual', financialYear)
  const matches = snapshots
    .filter((s) => s.kind === 'annual' && s.periodKey === periodKey)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return matches[0] ?? null
}

export function buildAnnualSnapshotCompareRow(
  snapshots: LodgmentSnapshot[],
  financialYear: string,
  liveFields: LodgmentField[]
): AnnualSnapshotCompareRow {
  const periodKey = buildLodgmentPeriodKey('annual', financialYear)
  const snap = latestAnnualSnapshotForFy(snapshots, financialYear)
  const snapFields = snap?.fields ?? null
  const metrics = {} as AnnualSnapshotCompareRow['metrics']

  for (const id of ANNUAL_COMPARE_METRIC_IDS) {
    const live = amount(liveFields, id)
    const saved = amount(snapFields, id)
    metrics[id] = {
      live,
      snapshot: saved,
      delta: roundMoney(live - saved),
    }
  }

  return {
    periodKey,
    periodLabel: `FY ${financialYear}`,
    snapshot: snap,
    metrics,
    hasSnapshot: !!snap,
    snapshotFinalized: !!snap?.finalizedAt,
  }
}

export function annualCompareTotalAbsDelta(row: AnnualSnapshotCompareRow): number {
  let total = 0
  for (const id of ANNUAL_COMPARE_METRIC_IDS) {
    total += Math.abs(row.metrics[id]?.delta ?? 0)
  }
  return roundMoney(total)
}

export function annualCompareDriftFields(
  row: AnnualSnapshotCompareRow
): Array<{
  id: AnnualCompareMetricId
  live: number
  snapshot: number
  delta: number
}> {
  return ANNUAL_COMPARE_METRIC_IDS.map((id) => ({
    id,
    live: row.metrics[id].live,
    snapshot: row.metrics[id].snapshot,
    delta: row.metrics[id].delta,
  })).filter((f) => Math.abs(f.delta) > 0.03)
}
