/**
 * Compare CTR Item 6 lodgment snapshots for one financial year.
 */

import type { LodgmentField } from './types'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'
import { buildLodgmentPeriodKey } from './compute-lodgment'

export const CTR_COMPARE_METRIC_IDS = [
  'CTR_6S_TOTAL_INCOME',
  'CTR_6Q_TOTAL_EXPENSES',
  'CTR_6T_PROFIT_LOSS',
] as const

export type CtrCompareMetricId = (typeof CTR_COMPARE_METRIC_IDS)[number]

const METRIC_LABELS: Record<CtrCompareMetricId, string> = {
  CTR_6S_TOTAL_INCOME: 'Total income (L2)',
  CTR_6Q_TOTAL_EXPENSES: 'Total expenses (L2)',
  CTR_6T_PROFIT_LOSS: 'Profit / (loss) (L2)',
}

export function ctrCompareMetricLabel(id: CtrCompareMetricId): string {
  return METRIC_LABELS[id]
}

export interface CtrSnapshotCompareRow {
  periodKey: string
  periodLabel: string
  snapshot: LodgmentSnapshot | null
  metrics: Record<CtrCompareMetricId, { live: number; snapshot: number; delta: number }>
  hasSnapshot: boolean
  snapshotFinalized: boolean
}

function amount(fields: LodgmentField[] | null | undefined, id: string): number {
  return fields?.find((f) => f.id === id)?.amount ?? 0
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function latestCtrSnapshotForFy(
  snapshots: LodgmentSnapshot[],
  financialYear: string
): LodgmentSnapshot | null {
  const periodKey = buildLodgmentPeriodKey('ctr', financialYear)
  const matches = snapshots
    .filter((s) => s.kind === 'ctr' && s.periodKey === periodKey)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return matches[0] ?? null
}

export function buildCtrSnapshotCompareRow(
  snapshots: LodgmentSnapshot[],
  financialYear: string,
  liveFields: LodgmentField[]
): CtrSnapshotCompareRow {
  const periodKey = buildLodgmentPeriodKey('ctr', financialYear)
  const snap = latestCtrSnapshotForFy(snapshots, financialYear)
  const snapFields = snap?.fields ?? null
  const metrics = {} as CtrSnapshotCompareRow['metrics']

  for (const id of CTR_COMPARE_METRIC_IDS) {
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
    periodLabel: `CTR FY ${financialYear}`,
    snapshot: snap,
    metrics,
    hasSnapshot: !!snap,
    snapshotFinalized: !!snap?.finalizedAt,
  }
}

export function ctrCompareTotalAbsDelta(row: CtrSnapshotCompareRow): number {
  let total = 0
  for (const id of CTR_COMPARE_METRIC_IDS) {
    total += Math.abs(row.metrics[id]?.delta ?? 0)
  }
  return roundMoney(total)
}

export function ctrCompareDriftFields(
  row: CtrSnapshotCompareRow
): Array<{
  id: CtrCompareMetricId
  live: number
  snapshot: number
  delta: number
}> {
  return CTR_COMPARE_METRIC_IDS.map((id) => ({
    id,
    live: row.metrics[id].live,
    snapshot: row.metrics[id].snapshot,
    delta: row.metrics[id].delta,
  })).filter((f) => Math.abs(f.delta) > 0.03)
}
