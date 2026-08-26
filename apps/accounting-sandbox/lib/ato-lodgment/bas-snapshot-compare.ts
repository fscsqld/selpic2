/**
 * Compare BAS lodgment snapshots across periods (quarterly or monthly).
 */

import type { LodgmentField } from './types'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'

export const BAS_COMPARE_METRIC_IDS = ['G1', '1A', '1B', '1C', '7C', 'W1', 'W2', '4'] as const

export type BasCompareMetricId = (typeof BAS_COMPARE_METRIC_IDS)[number]

export interface BasPeriodLiveData {
  periodKey: string
  periodLabel: string
  fields: LodgmentField[]
}

export interface BasPeriodCompareRow {
  periodKey: string
  periodLabel: string
  snapshot: LodgmentSnapshot | null
  liveFields: LodgmentField[] | null
  metrics: Record<BasCompareMetricId, { live: number; snapshot: number; delta: number }>
  hasSnapshot: boolean
  snapshotFinalized: boolean
}

function amount(fields: LodgmentField[] | null | undefined, id: string): number {
  return fields?.find((f) => f.id === id)?.amount ?? 0
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function latestSnapshotForPeriod(
  snapshots: LodgmentSnapshot[],
  periodKey: string
): LodgmentSnapshot | null {
  const matches = snapshots
    .filter((s) => s.kind === 'bas' && s.periodKey === periodKey)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return matches[0] ?? null
}

export function buildBasPeriodCompareRows(
  snapshots: LodgmentSnapshot[],
  livePeriods: BasPeriodLiveData[]
): BasPeriodCompareRow[] {
  return livePeriods.map((period) => {
    const snap = latestSnapshotForPeriod(snapshots, period.periodKey)
    const snapFields = snap?.fields ?? null
    const metrics = {} as BasPeriodCompareRow['metrics']

    for (const id of BAS_COMPARE_METRIC_IDS) {
      const live = amount(period.fields, id)
      const saved = amount(snapFields, id)
      metrics[id] = {
        live,
        snapshot: saved,
        delta: roundMoney(live - saved),
      }
    }

    return {
      periodKey: period.periodKey,
      periodLabel: period.periodLabel,
      snapshot: snap,
      liveFields: period.fields,
      metrics,
      hasSnapshot: !!snap,
      snapshotFinalized: !!snap?.finalizedAt,
    }
  })
}

export function countBasSnapshotsForFinancialYear(
  snapshots: LodgmentSnapshot[],
  financialYear: string
): number {
  const prefix = `${financialYear}-Q`
  const monthPrefix = `BAS-`
  return snapshots.filter(
    (s) =>
      s.kind === 'bas' &&
      (s.periodKey.startsWith(prefix) || s.periodKey.startsWith(monthPrefix))
  ).length
}

export function basQuartersWithSnapshot(
  snapshots: LodgmentSnapshot[],
  periodKeys: string[]
): number {
  return periodKeys.filter((key) => latestSnapshotForPeriod(snapshots, key) != null).length
}

/** Sum of |Δ| across BAS compare metrics — used by snapshot drift UI. */
export function basCompareTotalAbsDelta(row: BasPeriodCompareRow): number {
  let total = 0
  for (const id of BAS_COMPARE_METRIC_IDS) {
    total += Math.abs(row.metrics[id]?.delta ?? 0)
  }
  return roundMoney(total)
}

/** Fields where live vs snapshot Δ exceeds 3 cents. */
export function basCompareDriftFields(
  row: BasPeriodCompareRow
): Array<{
  id: BasCompareMetricId
  live: number
  snapshot: number
  delta: number
}> {
  return BAS_COMPARE_METRIC_IDS.map((id) => ({
    id,
    live: row.metrics[id].live,
    snapshot: row.metrics[id].snapshot,
    delta: row.metrics[id].delta,
  })).filter((f) => Math.abs(f.delta) > 0.03)
}
