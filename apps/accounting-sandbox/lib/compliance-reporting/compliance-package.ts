/**
 * Compliance Reporting Package Generator
 * 
 * Generates comprehensive accounting reports for accountant submission:
 * - Annual Tax Package (Financial Statements, Trial Balance, Director's Loan Report)
 * - Quarterly BAS Package (BAS Summary, PAYG Summary)
 */

import * as XLSX from 'xlsx'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { applyKnownPurchaseGstTags } from '@/lib/gst/apply-known-purchase-gst'
import { computeBalanceSheetFromStorage } from '@/lib/utils/balance-sheet'
import { computeTrialBalanceFromStorage } from '@/lib/utils/trial-balance'
import { computeIncomeStatementFromStorage } from '@/lib/journal/income-statement'
import { getAccountingSettings } from '@/lib/journal/accounting-basis'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { PAYGTaxCalculator } from '@/lib/payg-withholding/tax-calculator'
import { isDirectorsLoanLedgerTransaction } from '@/lib/classification/directors-loan-ledger'
import {
  computeDirectorsLoanOpeningBase,
  loadDirectorLoanAdvanceSettings,
  resolvePriorPeriodDirectorAdvances,
} from '@/lib/classification/directors-loan-balance'
import { roundAtoWholeDollars } from '@/lib/utils/ato-lodgment-rounding'

export interface Transaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  source?: string
  isDirectorsLoan?: boolean
  isPayrollTransaction?: boolean
  requiresPAYG?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: {
    shouldWarn?: boolean
    warningMessage?: string
    withholdingAmount?: number
  }
  gstInfo?: {
    isGSTIncluded?: boolean
    gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
    hasGST?: boolean
    reasoning?: string
  }
}

export interface CompliancePackageData {
  transactions: Transaction[]
  openingDirectorLoanBalance: number
  companyName: string
  abn: string
  acn?: string
  financialYear: {
    start: string
    end: string
  }
  periodStart?: string
  periodEnd?: string
}

function filterTransactionsForPeriod(
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string
): Transaction[] {
  return transactions.filter((tx) => tx.date >= periodStart && tx.date <= periodEnd)
}

function sortCategoryEntries(record: Record<string, number>): [string, number][] {
  return Object.entries(record).sort((a, b) => b[1] - a[1])
}

/**
 * Generate Trial Balance Excel (uses shared trial-balance.ts logic)
 */
export async function generateTrialBalance(data: CompliancePackageData): Promise<XLSX.WorkBook> {
  const { transactions, openingDirectorLoanBalance, companyName, abn, financialYear } = data

  const profile = await indexedDBStorage.getBusinessProfile()
  const accountType =
    (profile?.accountType as 'individual' | 'company' | 'sole_trader' | undefined) || 'company'

  const result = await computeTrialBalanceFromStorage({
    transactions,
    openingDirectorLoanBalance,
    openingCapital: profile?.openingCapital ?? 0,
    openingRetainedEarnings: profile?.openingRetainedEarnings ?? 0,
    openingCashBalance: profile?.openingCashBalance ?? 0,
    asAtDate: financialYear.end,
    accountType,
  })

  const workbook = XLSX.utils.book_new()

  const headerData = [
    [companyName],
    [`ABN: ${abn}`],
    [
      `Trial Balance - Financial Year ${financialYear.start.split('-')[0]}-${financialYear.end.split('-')[0]}`,
    ],
    [`As at ${formatDateAustralian(result.asAtDate)}`],
    [''],
    [''],
  ]

  const allData = [
    ...headerData,
    ['Account', 'Type', 'Debit', 'Credit'],
    ...result.rows.map((row) => [row.account, row.type, row.debit, row.credit]),
    ['TOTAL', '', result.totalDebit, result.totalCredit],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(allData)
  worksheet['!cols'] = [
    { wch: 40 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance')

  return workbook
}

/**
 * Generate Director's Loan Report Excel
 */
export function generateDirectorsLoanReport(data: CompliancePackageData): XLSX.WorkBook {
  const { transactions, openingDirectorLoanBalance, companyName, abn } = data
  
  // Filter Director's Loan transactions
  const advanceSettings = loadDirectorLoanAdvanceSettings()
  const priorAdvances = resolvePriorPeriodDirectorAdvances(
    transactions,
    advanceSettings.manualPriorAdvances,
    advanceSettings.autoMatchReimbursements
  )
  const ledgerOpening = computeDirectorsLoanOpeningBase(openingDirectorLoanBalance, priorAdvances)

  const directorsLoanTransactions = transactions
    .filter(isDirectorsLoanLedgerTransaction)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Calculate running balance
  let runningBalance = ledgerOpening
  const reportData = directorsLoanTransactions.map(tx => {
    const amount = Math.abs(tx.debit || tx.credit || 0)
    const isCredit = !!tx.credit
    const isDebit = !!tx.debit
    
    // Credit = Director deposits money (Company owes Director) → Balance increases
    // Debit = Director withdraws/spends (Director owes Company) → Balance decreases
    if (isCredit) {
      runningBalance += amount
    } else if (isDebit) {
      runningBalance -= amount
    }
    
    return {
      'Date': formatDateAustralian(tx.date),
      'Description': tx.description,
      'Transaction Type': tx.department === 'personal' 
        ? 'Personal Transaction' 
        : tx.category === 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT'
        ? 'Prior-Period Reimbursement'
        : tx.category === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT'
        ? 'Loan Repayment'
        : 'Loan Transaction',
      'Debit': tx.debit || 0,
      'Credit': tx.credit || 0,
      'Running Balance': runningBalance,
    }
  })
  
  // Add summary
  const summaryData = [
    { 'Item': 'Opening Balance (cash loan)', 'Amount': openingDirectorLoanBalance },
    { 'Item': 'Prior period advances (lodged)', 'Amount': priorAdvances },
    { 'Item': 'Ledger opening', 'Amount': ledgerOpening },
    { 'Item': 'Total Deposits (Credit)', 'Amount': directorsLoanTransactions.reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0) },
    { 'Item': 'Total Withdrawals (Debit)', 'Amount': directorsLoanTransactions.reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0) },
    { 'Item': 'Closing Balance', 'Amount': runningBalance },
  ]
  
  // Create workbook with header
  const workbook = XLSX.utils.book_new()
  
  // Transaction detail sheet with header
  const detailHeader = [
    [companyName],
    [`ABN: ${abn}`],
    ['Director\'s Loan Report'],
    [''],
    ['Date', 'Description', 'Transaction Type', 'Debit', 'Credit', 'Running Balance'],
  ]
  const detailAllData = [
    ...detailHeader,
    ...reportData.map(row => [
      row.Date,
      row.Description,
      row['Transaction Type'],
      row.Debit,
      row.Credit,
      row['Running Balance'],
    ]),
  ]
  const detailSheet = XLSX.utils.aoa_to_sheet(detailAllData)
  detailSheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 50 }, // Description
    { wch: 20 }, // Transaction Type
    { wch: 15 }, // Debit
    { wch: 15 }, // Credit
    { wch: 15 }, // Running Balance
  ]
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Transaction Detail')
  
  // Summary sheet with header
  const summaryHeader = [
    [companyName],
    [`ABN: ${abn}`],
    ['Director\'s Loan Summary'],
    [''],
    ['Item', 'Amount'],
  ]
  const summaryAllData = [
    ...summaryHeader,
    ...summaryData.map(row => [row.Item, row.Amount]),
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAllData)
  summarySheet['!cols'] = [
    { wch: 30 }, // Item
    { wch: 20 }, // Amount
  ]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  
  return workbook
}

/**
 * Generate BAS Package Excel
 */
export async function generateBASPackage(data: CompliancePackageData): Promise<XLSX.WorkBook> {
  const { transactions, periodStart, periodEnd, companyName, abn, openingDirectorLoanBalance } = data

  const profile = await indexedDBStorage.getBusinessProfile()
  const accountType =
    (profile?.accountType as 'individual' | 'company' | 'sole_trader' | undefined) || 'company'
  const accountingSettings = await getAccountingSettings()

  // Same GST claim tags as Biz Intel / Export BAS (Hanaone free, CrazyDomains claim, …)
  const taggedTransactions = applyKnownPurchaseGstTags(transactions)

  const periodTransactions =
    periodStart && periodEnd
      ? filterTransactionsForPeriod(taggedTransactions, periodStart, periodEnd)
      : taggedTransactions

  const advanceSettings = loadDirectorLoanAdvanceSettings()
  const priorAdvances = resolvePriorPeriodDirectorAdvances(
    periodTransactions,
    advanceSettings.manualPriorAdvances,
    advanceSettings.autoMatchReimbursements
  )

  const incomeStatement =
    periodStart && periodEnd
      ? await computeIncomeStatementFromStorage({
          transactions: taggedTransactions,
          periodStart,
          periodEnd,
          openingDirectorLoanBalance,
          accountType,
        })
      : null

  const metrics = incomeStatement
    ? {
        totalIncome: incomeStatement.totalIncome,
        totalExpenses: incomeStatement.totalExpenses,
        netProfit: incomeStatement.netProfit,
        gstPayable: incomeStatement.gstPayable,
        gstClaimable: incomeStatement.gstClaimable,
      }
    : calculateBusinessMetrics(periodTransactions, openingDirectorLoanBalance, accountType, priorAdvances)
  
  // BAS Form Data — ATO whole dollars (leave cents out; do not round up)
  const gstCollected = roundAtoWholeDollars(metrics.gstPayable)
  const gstPaid = roundAtoWholeDollars(metrics.gstClaimable)
  const netGST = gstCollected - gstPaid
  const g1Sales = roundAtoWholeDollars(metrics.totalIncome)
  
  // Calculate PAYG Withholding Tax
  const taxCalculator = new PAYGTaxCalculator()
  let totalPAYGWithholding = 0
  
  // PAYG Summary (from payroll transactions)
  const payrollTransactions = periodTransactions
    .filter(tx => tx.isPayrollTransaction || tx.requiresPAYG)
    .map(tx => {
      const grossAmount = Math.abs(tx.debit || tx.credit || 0)
      let withholdingTax = 0
      
      // Check for No ABN Withholding (47%)
      if (tx.noABNWarning?.shouldWarn && tx.noABNWarning.withholdingAmount) {
        withholdingTax = tx.noABNWarning.withholdingAmount
      } else if (tx.payrollType) {
        // Calculate based on payroll type
        if (tx.payrollType === 'director') {
          withholdingTax = taxCalculator.calculateDirectorFee(grossAmount)
        } else if (tx.payrollType === 'employee') {
          withholdingTax = taxCalculator.calculateEmployeeSalary(grossAmount, true)
        } else if (tx.payrollType === 'contractor') {
          withholdingTax = taxCalculator.calculateContractorFee(grossAmount, true)
        } else if (tx.payrollType === 'partner') {
          // Partner payments typically require No ABN withholding if no ABN provided
          withholdingTax = taxCalculator.calculateNoABNWithholding(grossAmount)
        }
      }
      
      totalPAYGWithholding += withholdingTax
      
      return {
        'Date': formatDateAustralian(tx.date),
        'Description': tx.description,
        'Gross Amount': grossAmount,
        'Withholding Tax': withholdingTax,
        'Net Amount': grossAmount - withholdingTax,
      }
    })
  
  // BAS Form Data (ATO format — matches Biz Intel GST Summary)
  const basData = [
    { 'Field': 'G1 Total sales and income', 'Amount': g1Sales },
    { 'Field': '1A GST on sales', 'Amount': gstCollected },
    { 'Field': '1B GST on purchases', 'Amount': gstPaid },
    {
      'Field': netGST < 0 ? '7C GST refund due' : '1C Net GST payable',
      'Amount': Math.abs(netGST),
    },
    { 'Field': '4 PAYG Withholding', 'Amount': roundAtoWholeDollars(totalPAYGWithholding) },
  ]
  
  // Create workbook with header
  const workbook = XLSX.utils.book_new()
  
  // BAS Summary sheet with header
  const basHeader = [
    [companyName],
    [`ABN: ${abn}`],
    ['BAS Summary'],
    periodStart && periodEnd ? [`Period: ${formatDateAustralian(periodStart)} to ${formatDateAustralian(periodEnd)}`] : [''],
    incomeStatement?.ledgerIntegrated
      ? [`Source: Ledger-integrated P&L (${accountingSettings.basis} basis)`]
      : [''],
    [''],
    ['Field', 'Amount'],
  ]
  const basAllData = [
    ...basHeader,
    ...basData.map(row => [row.Field, row.Amount]),
  ]
  const basSheet = XLSX.utils.aoa_to_sheet(basAllData)
  basSheet['!cols'] = [
    { wch: 40 }, // Field
    { wch: 20 }, // Amount
  ]
  XLSX.utils.book_append_sheet(workbook, basSheet, 'BAS Summary')
  
  // PAYG Summary sheet with header
  if (payrollTransactions.length > 0) {
    const paygHeader = [
      [companyName],
      [`ABN: ${abn}`],
      ['PAYG Withholding Summary'],
      periodStart && periodEnd ? [`Period: ${formatDateAustralian(periodStart)} to ${formatDateAustralian(periodEnd)}`] : [''],
      [''],
      ['Date', 'Description', 'Gross Amount', 'Withholding Tax', 'Net Amount'],
    ]
    const paygAllData = [
      ...paygHeader,
      ...payrollTransactions.map(row => [
        row.Date,
        row.Description,
        row['Gross Amount'],
        row['Withholding Tax'],
        row['Net Amount'],
      ]),
    ]
    const paygSheet = XLSX.utils.aoa_to_sheet(paygAllData)
    paygSheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 40 }, // Description
      { wch: 15 }, // Gross Amount
      { wch: 15 }, // Withholding Tax
      { wch: 15 }, // Net Amount
    ]
    XLSX.utils.book_append_sheet(workbook, paygSheet, 'PAYG Summary')
  }
  
  return workbook
}

/**
 * Generate Financial Statements (P&L + Balance Sheet) Excel
 */
export async function generateFinancialStatements(data: CompliancePackageData): Promise<XLSX.WorkBook> {
  const { transactions, openingDirectorLoanBalance, companyName, abn, financialYear } = data

  const profile = await indexedDBStorage.getBusinessProfile()
  const accountType =
    (profile?.accountType as 'individual' | 'company' | 'sole_trader' | undefined) || 'company'
  const accountingSettings = await getAccountingSettings()

  const [incomeStatement, bs] = await Promise.all([
    computeIncomeStatementFromStorage({
      transactions,
      periodStart: financialYear.start,
      periodEnd: financialYear.end,
      openingDirectorLoanBalance,
      accountType,
    }),
    computeBalanceSheetFromStorage({
      transactions,
      openingDirectorLoanBalance,
      openingCapital: profile?.openingCapital ?? 0,
      openingRetainedEarnings: profile?.openingRetainedEarnings ?? 0,
      openingCashBalance: profile?.openingCashBalance ?? 0,
      asAtDate: financialYear.end,
      accountType,
    }),
  ])

  // Retained earnings stay on cash P&L so BS export balances with bank + period-net GST.
  // Primary "Current Period Profit" line is tax/CTR (ex GST) when not ledger-integrated.
  const currentPeriodProfitCash = incomeStatement.ledgerIntegrated
    ? incomeStatement.netProfit
    : bs.equity.currentPeriodProfitCash
  const currentPeriodProfitTax = incomeStatement.ledgerIntegrated
    ? incomeStatement.netProfit
    : bs.equity.currentPeriodProfit
  const totalRetainedEarnings =
    bs.equity.openingRetainedEarnings + currentPeriodProfitTax

  const revenueLines = sortCategoryEntries(incomeStatement.incomeByCategory).map(
    ([category, amount]) => [category, amount] as [string, number]
  )
  const expenseLines = sortCategoryEntries(incomeStatement.expensesByCategory).map(
    ([category, amount]) => [category, amount] as [string, number]
  )

  const plData = [
    ['Profit & Loss Statement'],
    [`Financial Year: ${financialYear.start.split('-')[0]}-${financialYear.end.split('-')[0]}`],
    [`Period: ${formatDateAustralian(financialYear.start)} to ${formatDateAustralian(financialYear.end)}`],
    incomeStatement.ledgerIntegrated
      ? [`Source: Ledger-integrated (${accountingSettings.basis} basis)`]
      : [''],
    [''],
    ['Revenue', ''],
    ...(revenueLines.length > 0
      ? revenueLines
      : [['Trading Revenue', incomeStatement.totalIncome] as [string, number]]),
    ['Total Revenue', incomeStatement.totalIncome],
    [''],
    ['Expenses', ''],
    ...(expenseLines.length > 0
      ? expenseLines
      : [['Total Expenses', incomeStatement.totalExpenses] as [string, number]]),
    ['Total Expenses', incomeStatement.totalExpenses],
    [''],
    ['Net Profit/(Loss)', incomeStatement.netProfit],
  ]

  const balanceSheetData = [
    ['Balance Sheet'],
    [`As at ${financialYear.end}`],
    bs.ledgerIntegrated ? ['Source: Ledger-integrated (transactions + journal entries)'] : [''],
    [''],
    ['Assets', ''],
    ['Current Assets', ''],
    ['  Cash & Bank', bs.assets.cashAndBank],
    ['  Accounts Receivable', bs.assets.accountsReceivable],
    ...(bs.assets.directorsLoanReceivable > 0
      ? [['  Director\'s Loan Receivable', bs.assets.directorsLoanReceivable]]
      : []),
    ['Total Current Assets', bs.assets.totalCurrentAssets],
    [''],
    ['Fixed Assets', ''],
    ['  Gross Fixed Assets', bs.assets.grossFixedAssets],
    ['  Accumulated Depreciation', bs.assets.accumulatedDepreciation],
    ['  Net Fixed Assets', bs.assets.netFixedAssets],
    ['Total Assets', bs.assets.totalAssets],
    [''],
    ['Liabilities', ''],
    ['Director\'s Loan', bs.liabilities.directorsLoan],
    ...(bs.liabilities.accountsPayable && bs.liabilities.accountsPayable > 0
      ? [['Accounts Payable', bs.liabilities.accountsPayable]]
      : []),
    ...(bs.liabilities.gstPayableOutstanding > 0
      ? [
          [
            bs.liabilities.gstLatestQuarterLabel
              ? `GST Payable (${bs.liabilities.gstLatestQuarterLabel} due)`
              : 'GST Payable (latest BAS due)',
            bs.liabilities.gstPayableOutstanding,
          ] as [string, number],
        ]
      : bs.liabilities.gstPayable > 0
        ? [['GST Payable', bs.liabilities.gstPayable] as [string, number]]
        : []),
    ...(bs.liabilities.atoGstRefundInCash > 0
      ? [
          [
            'Note: ATO GST refund in Cash & Bank (not a GST payable reduction)',
            bs.liabilities.atoGstRefundInCash,
          ] as [string, number],
        ]
      : []),
    ...(bs.liabilities.paygWithholding > 0
      ? [['PAYG Withholding Payable', bs.liabilities.paygWithholding]]
      : []),
    ['Total Liabilities', bs.liabilities.totalLiabilities],
    [''],
    ['Equity', ''],
    ['Opening Capital', bs.equity.openingCapital],
    ['Share Capital', bs.equity.shareCapital],
    ['Opening Retained Earnings', bs.equity.openingRetainedEarnings],
    ['Current Period Profit/(Loss) (ex GST / CTR)', currentPeriodProfitTax],
    ...(Math.abs(currentPeriodProfitCash - currentPeriodProfitTax) >= 0.01
      ? [
          [
            'Reference: Net GST in cash P&L (1A - 1B) [not in totals]',
            currentPeriodProfitCash - currentPeriodProfitTax,
          ] as [string, number],
          [
            'Reference: Current Period Profit (cash / GST-incl.) [not in totals]',
            currentPeriodProfitCash,
          ] as [string, number],
        ]
      : []),
    ['Total Retained Earnings (ex GST / CTR)', totalRetainedEarnings],
    [
      'Total Equity',
      bs.equity.openingCapital + bs.equity.shareCapital + totalRetainedEarnings,
    ],
    [''],
    [
      'Total Liabilities & Equity',
      bs.liabilities.totalLiabilities +
        bs.equity.openingCapital +
        bs.equity.shareCapital +
        totalRetainedEarnings,
    ],
  ]
  
  // Create workbook
  const workbook = XLSX.utils.book_new()
  
  // P&L Sheet with header
  const plHeader = [
    [companyName],
    [`ABN: ${abn}`],
    [''],
  ]
  const plAllData = [...plHeader, ...plData]
  const plSheet = XLSX.utils.aoa_to_sheet(plAllData)
  plSheet['!cols'] = [{ wch: 30 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, plSheet, 'Profit & Loss')
  
  // Balance Sheet with header
  const bsHeader = [
    [companyName],
    [`ABN: ${abn}`],
    [''],
  ]
  const bsAllData = [...bsHeader, ...balanceSheetData]
  const bsSheet = XLSX.utils.aoa_to_sheet(bsAllData)
  bsSheet['!cols'] = [{ wch: 30 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, bsSheet, 'Balance Sheet')
  
  return workbook
}

export type ComplianceReportPeriod = {
  start: string
  end: string
  label: string
  isExactBasQuarter: boolean
}

/**
 * Resolve the report window for compliance exports.
 * Prefer exact banner/BAS quarter dates; do not expand a quarter to full FY.
 */
export function resolveComplianceReportPeriod(
  data: Pick<CompliancePackageData, 'financialYear' | 'periodStart' | 'periodEnd'>
): ComplianceReportPeriod {
  const fy = data.financialYear
  const start = (data.periodStart || fy.start).slice(0, 10)
  const end = (data.periodEnd || fy.end).slice(0, 10)
  const fyLabelStart = Number(fy.start.slice(0, 4))
  const fyLabel = `${fyLabelStart}-${fyLabelStart + 1}`

  const quarters: Array<{ q: 1 | 2 | 3 | 4; start: string; end: string }> = [
    { q: 1, start: `${fyLabelStart}-07-01`, end: `${fyLabelStart}-09-30` },
    { q: 2, start: `${fyLabelStart}-10-01`, end: `${fyLabelStart}-12-31` },
    { q: 3, start: `${fyLabelStart + 1}-01-01`, end: `${fyLabelStart + 1}-03-31` },
    { q: 4, start: `${fyLabelStart + 1}-04-01`, end: `${fyLabelStart + 1}-06-30` },
  ]

  for (const { q, start: qStart, end: qEnd } of quarters) {
    if (start === qStart && end === qEnd) {
      return {
        start,
        end,
        label: `Q${q} ${fyLabel}`,
        isExactBasQuarter: true,
      }
    }
  }

  return {
    start,
    end,
    label:
      start === fy.start.slice(0, 10) && end === fy.end.slice(0, 10)
        ? `FY ${fyLabel}`
        : `${start} → ${end}`,
    isExactBasQuarter: false,
  }
}

/**
 * Generate all compliance reports and return as workbooks
 */
export async function generateCompliancePackage(data: CompliancePackageData): Promise<{
  financialStatements: XLSX.WorkBook
  trialBalance: XLSX.WorkBook
  directorsLoanReport: XLSX.WorkBook
  basPackage: XLSX.WorkBook
  auditTrail: any[]
}> {
  // Generate reports (financialStatements and basPackage are now async)
  const financialStatements = await generateFinancialStatements(data)
  const trialBalance = await generateTrialBalance(data)
  const directorsLoanReport = generateDirectorsLoanReport(data)
  const basPackage = await generateBASPackage(data)
  
  // Get audit trail
  const auditTrail = await indexedDBStorage.getAllAuditTrails()
  
  return {
    financialStatements,
    trialBalance,
    directorsLoanReport,
    basPackage,
    auditTrail,
  }
}
