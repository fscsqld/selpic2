/**
 * User-facing names for L1 (cash) / L2 (tax ex-GST) / L3 (ATO lodge whole $).
 * See `.cursor/rules/accounting-reporting-layers-principles.mdc`.
 */

export const L1_CASH_SUBLABEL = 'L1 · Cash incl. GST'
export const L2_EX_GST_LINE = 'L2 · Excl. GST (est.)'
export const L2_TAX_NET_LINE = 'L2 · Tax net (ex GST est.)'

export const REPORTING_LAYERS_BIZ_INTEL_FOOTER =
  'L1 = bank/cash (incl. GST). L2 = per-line ex-GST tax basis. L3 = ATO whole $ — see ATO Lodgment.'

export const REPORTING_LAYERS_EXPORT_NOTE =
  'Debit/Credit = L1 cash. GST & Net columns = L2 per-line est. BAS lodge amounts = L3 whole $.'

export const REPORTING_LAYERS_COMPLIANCE_NOTE =
  'P&L revenue/expense totals in this pack are L1 (cash incl. GST) unless a line says ex GST / CTR. BAS G1/1A/1B use L2 cents; lodged BAS uses L3 whole $.'

export interface ExportSummaryMetrics {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  totalIncomeExGst: number
  totalExpensesExGst: number
  netProfitExGst: number
  totalGSTPayable: number
  totalGSTClaimable: number
  directorsLoanBalance: number
  periodLabel?: string
  rowCount?: number
}

function fmt(n: number): string {
  return n.toFixed(2)
}

/** Rows for Financial Summary Excel — L1 and L2 side by side. */
export function buildExportSummaryRows(
  summary: ExportSummaryMetrics
): Array<{ Metric: string; Amount: string }> {
  const netGst = summary.totalGSTPayable - summary.totalGSTClaimable
  const showL2 =
    Math.abs(summary.totalIncomeExGst - summary.totalIncome) > 0.005 ||
    Math.abs(summary.totalExpensesExGst - summary.totalExpenses) > 0.005 ||
    Math.abs(summary.netProfitExGst - summary.netProfit) > 0.005

  const rows: Array<{ Metric: string; Amount: string }> = [
    { Metric: 'Reporting layers', Amount: REPORTING_LAYERS_EXPORT_NOTE },
  ]

  if (summary.periodLabel) {
    rows.push({ Metric: 'P&L Period', Amount: summary.periodLabel })
  }
  if (typeof summary.rowCount === 'number') {
    rows.push({ Metric: 'Rows included', Amount: String(summary.rowCount) })
  }

  rows.push({ Metric: '— L1 Books (cash incl. GST) —', Amount: '' })
  rows.push({ Metric: 'Total Income (L1)', Amount: fmt(summary.totalIncome) })
  rows.push({
    Metric: 'Total Expenses / Tax Deductions (L1)',
    Amount: fmt(summary.totalExpenses),
  })
  rows.push({ Metric: 'Net Profit (L1)', Amount: fmt(summary.netProfit) })

  if (showL2) {
    rows.push({ Metric: '— L2 Tax basis (excl. GST est.) —', Amount: '' })
    rows.push({ Metric: 'Total Income (L2)', Amount: fmt(summary.totalIncomeExGst) })
    rows.push({
      Metric: 'Total Expenses (L2)',
      Amount: fmt(summary.totalExpensesExGst),
    })
    rows.push({ Metric: 'Net Profit (L2)', Amount: fmt(summary.netProfitExGst) })
  }

  rows.push({ Metric: '— GST (L2 cents; L3 on BAS lodge) —', Amount: '' })
  rows.push({ Metric: 'GST Payable / 1A (cents)', Amount: fmt(summary.totalGSTPayable) })
  rows.push({ Metric: 'GST Claimable / 1B (cents)', Amount: fmt(summary.totalGSTClaimable) })
  rows.push({ Metric: 'Net GST (1A − 1B)', Amount: fmt(netGst) })
  rows.push({
    Metric: "Director's Loan Balance",
    Amount: fmt(summary.directorsLoanBalance),
  })

  return rows
}
