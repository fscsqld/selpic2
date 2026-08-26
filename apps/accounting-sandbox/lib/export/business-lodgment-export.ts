/**
 * Export business ATO lodgment preparation pack (BAS / Annual / CTR).
 */

import * as XLSX from 'xlsx'
import type { LodgmentField } from '@/lib/ato-lodgment/types'
import type { CtrLodgmentOptions } from '@/lib/ato-lodgment/types'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'
import {
  BAS_COMPARE_METRIC_IDS,
  buildBasPeriodCompareRows,
  type BasPeriodLiveData,
} from '@/lib/ato-lodgment/bas-snapshot-compare'

export type BusinessLodgmentExportKind = 'bas' | 'annual' | 'ctr'

export interface BusinessLodgmentExportInput {
  accountType: 'company' | 'sole_trader'
  businessName: string
  financialYear: string
  kind: BusinessLodgmentExportKind
  periodLabel: string
  periodStart: string
  periodEnd: string
  fields: LodgmentField[]
  uncategorisedCount?: number
  ctrOptions?: CtrLodgmentOptions
  basSnapshots?: LodgmentSnapshot[]
  basLivePeriods?: BasPeriodLiveData[]
}

function fieldsToRows(fields: LodgmentField[]): (string | number)[][] {
  return [
    ['Section', 'Field ID', 'Label', 'myTax label', 'Amount', 'Source', 'Entry kind'],
    ...fields.map((f) => [
      f.section,
      f.id,
      f.label,
      f.myTaxLabel || '',
      f.amount,
      f.source,
      f.entryKind || '',
    ]),
  ]
}

export function exportBusinessLodgmentPack(input: BusinessLodgmentExportInput): void {
  const {
    accountType,
    businessName,
    financialYear,
    kind,
    periodLabel,
    periodStart,
    periodEnd,
    fields,
    uncategorisedCount = 0,
    ctrOptions,
    basSnapshots = [],
    basLivePeriods = [],
  } = input

  const kindLabel =
    kind === 'bas' ? 'BAS' : kind === 'ctr' ? 'Company CTR' : 'Annual (myTax business)'

  const cover: (string | number)[][] = [
    ['SELPIC A — Business Lodgment Preparation Pack'],
    ['Account type', accountType === 'company' ? 'Company' : 'Sole trader'],
    ['Business', businessName],
    ['Pack type', kindLabel],
    ['Financial year', financialYear],
    ['Period', periodLabel],
    ['Date range', `${periodStart} to ${periodEnd}`],
    ['Generated', new Date().toLocaleString('en-AU')],
    ['Disclaimer', 'Preparation only — verify all figures before lodging in OSB / myTax.'],
    [],
    ['Uncategorised transactions', uncategorisedCount],
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), 'Cover')
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(fieldsToRows(fields)),
    kind === 'bas' ? 'BAS fields' : kind === 'ctr' ? 'CTR fields' : 'Annual fields'
  )

  if (kind === 'ctr' && ctrOptions) {
    const settings: (string | number)[][] = [
      ['CTR settings'],
      ['Tax rate', ctrOptions.taxRate ?? 0.25],
      ['Non-deductible add-backs', ctrOptions.nonDeductibleAddBacks ?? 0],
      ['Prior year losses applied', ctrOptions.lossCarryForward ?? 0],
      ['Other adjustments', ctrOptions.otherAdjustments ?? 0],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(settings), 'CTR settings')
  }

  if (kind === 'bas' && basLivePeriods.length > 0) {
    const compareRows = buildBasPeriodCompareRows(basSnapshots, basLivePeriods)
    const sheet: (string | number)[][] = [
      ['Period', 'Period key', 'Has snapshot', 'Finalized', ...BAS_COMPARE_METRIC_IDS, 'Total drift'],
    ]
    for (const row of compareRows) {
      const drift = BAS_COMPARE_METRIC_IDS.reduce(
        (s, id) => s + Math.abs(row.metrics[id].delta),
        0
      )
      sheet.push([
        row.periodLabel,
        row.periodKey,
        row.hasSnapshot ? 'Yes' : 'No',
        row.snapshotFinalized ? 'Yes' : 'No',
        ...BAS_COMPARE_METRIC_IDS.map((id) => row.metrics[id].live),
        Math.round(drift * 100) / 100,
      ])
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet), 'BAS quarterly compare')
  }

  if (basSnapshots.length > 0 && kind === 'bas') {
    const snapRows: (string | number)[][] = [
      ['Period', 'Kind', 'Finalized', 'Updated', 'Field', 'Amount'],
    ]
    for (const snap of basSnapshots.filter((s) => s.kind === 'bas')) {
      for (const f of snap.fields) {
        snapRows.push([
          snap.periodLabel,
          snap.kind,
          snap.finalizedAt ? 'Yes' : 'No',
          snap.updatedAt,
          f.label,
          f.amount,
        ])
      }
    }
    if (snapRows.length > 1) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(snapRows), 'Saved snapshots')
    }
  }

  const safeName = businessName.replace(/[^\w\s-]/g, '').trim() || 'Business'
  const fileKind = kind.toUpperCase()
  XLSX.writeFile(wb, `${fileKind}_FY${financialYear}_${safeName}.xlsx`)
}
