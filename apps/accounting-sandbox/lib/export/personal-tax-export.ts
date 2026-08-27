/**
 * Export personal tax preparation pack (myTax field sheet + payment summaries).
 */

import * as XLSX from 'xlsx'
import type { LodgmentField } from '@/lib/ato-lodgment/types'
import type { PaymentSummaryEntry } from '@/lib/storage/payment-summary-types'
import type { IndividualTaxWorksheetRecord } from '@/lib/storage/tax-worksheet-types'

export interface PersonalTaxExportInput {
  financialYear: string
  taxpayerName: string
  fields: LodgmentField[]
  paymentSummaries: PaymentSummaryEntry[]
  /** Optional worksheet snapshot (included for callers; cover sheet may ignore). */
  worksheet?: IndividualTaxWorksheetRecord | null
  transactionCount: number
  uncategorisedCount: number
}

export function exportPersonalTaxPack(input: PersonalTaxExportInput): void {
  const { financialYear, taxpayerName, fields, paymentSummaries, transactionCount, uncategorisedCount } =
    input

  const cover = [
    ['SELPIC A — Personal Tax Preparation Pack'],
    ['Taxpayer', taxpayerName],
    ['Financial year', financialYear],
    ['Generated', new Date().toLocaleString('en-AU')],
    ['Disclaimer', 'Preparation only — verify all figures before lodging in myTax.'],
    [],
    ['Transactions in scope', transactionCount],
    ['Uncategorised', uncategorisedCount],
  ]

  const myTaxRows = [
    ['Section', 'Field', 'myTax label', 'Amount', 'Source'],
    ...fields.map((f) => [
      f.section,
      f.label,
      f.myTaxLabel || f.label,
      f.amount,
      f.entryKind || f.source,
    ]),
  ]

  const paymentRows = [
    ['Employer', 'Payer ABN', 'Gross payments', 'Tax withheld'],
    ...paymentSummaries.map((p) => [
      p.employerName,
      p.payerAbn || '',
      p.grossPayments,
      p.taxWithheld,
    ]),
  ]

  if (paymentSummaries.length > 0) {
    paymentRows.push([
      'TOTAL',
      '',
      paymentSummaries.reduce((s, p) => s + p.grossPayments, 0),
      paymentSummaries.reduce((s, p) => s + p.taxWithheld, 0),
    ])
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), 'Cover')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(myTaxRows), 'myTax fields')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paymentRows), 'Payment summaries')

  const safeName = taxpayerName.replace(/[^\w\s-]/g, '').trim() || 'Individual'
  XLSX.writeFile(wb, `Personal_Tax_FY${financialYear}_${safeName}.xlsx`)
}
