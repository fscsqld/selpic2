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
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { PAYGTaxCalculator } from '@/lib/payg-withholding/tax-calculator'

export interface Transaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  isDirectorsLoan?: boolean
  isPayrollTransaction?: boolean
  requiresPAYG?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: {
    shouldWarn: boolean
    warningMessage: string
    withholdingAmount?: number
  }
  gstInfo?: {
    hasGST: boolean
    gstAmount?: number
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

/**
 * Generate Trial Balance Excel
 */
export function generateTrialBalance(data: CompliancePackageData): XLSX.WorkBook {
  const { transactions, financialYear, companyName, abn } = data
  
  // Group transactions by category
  const accountBalances: Record<string, { debit: number; credit: number }> = {}
  
  transactions.forEach(tx => {
    const category = tx.category || 'UNCATEGORIZED'
    const accountName = getAccountName(category)
    
    if (!accountBalances[accountName]) {
      accountBalances[accountName] = { debit: 0, credit: 0 }
    }
    
    if (tx.debit) {
      accountBalances[accountName].debit += Math.abs(tx.debit)
    }
    if (tx.credit) {
      accountBalances[accountName].credit += Math.abs(tx.credit)
    }
  })
  
  // Calculate net balances
  const trialBalanceData = Object.entries(accountBalances)
    .map(([account, balances]) => {
      const netBalance = balances.credit - balances.debit
      return {
        'Account': account,
        'Debit': balances.debit,
        'Credit': balances.credit,
        'Net Balance': netBalance,
        'Type': getAccountType(account),
      }
    })
    .sort((a, b) => {
      // Sort by account type order
      const typeOrder: Record<string, number> = {
        'Asset': 1,
        'Liability': 2,
        'Equity': 3,
        'Revenue': 4,
        'Expense': 5,
      }
      return (typeOrder[a.Type] || 99) - (typeOrder[b.Type] || 99)
    })
  
  // Add totals row
  const totalDebit = trialBalanceData.reduce((sum, row) => sum + row.Debit, 0)
  const totalCredit = trialBalanceData.reduce((sum, row) => sum + row.Credit, 0)
  const totalNet = totalCredit - totalDebit
  
  trialBalanceData.push({
    'Account': 'TOTAL',
    'Debit': totalDebit,
    'Credit': totalCredit,
    'Net Balance': totalNet,
    'Type': '',
  })
  
  // Create workbook with header
  const workbook = XLSX.utils.book_new()
  
  // Add header rows
  const headerData = [
    [companyName],
    [`ABN: ${abn}`],
    [`Trial Balance - Financial Year ${financialYear.start.split('-')[0]}-${financialYear.end.split('-')[0]}`],
    [''],
  ]
  
  // Combine header and data
  const allData = [
    ...headerData,
    ['Account', 'Debit', 'Credit', 'Net Balance', 'Type'],
    ...trialBalanceData.map(row => [row.Account, row.Debit, row.Credit, row['Net Balance'], row.Type]),
  ]
  
  const worksheet = XLSX.utils.aoa_to_sheet(allData)
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 40 }, // Account
    { wch: 15 }, // Debit
    { wch: 15 }, // Credit
    { wch: 15 }, // Net Balance
    { wch: 15 }, // Type
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
  const directorsLoanTransactions = transactions
    .filter(tx => {
      if (tx.department === 'personal') return true
      if (tx.category === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT') return true
      if (tx.category === 'LIABILITY_DIRECTORS_LOAN' || tx.isDirectorsLoan) return true
      return false
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Calculate running balance
  let runningBalance = openingDirectorLoanBalance
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
    { 'Item': 'Opening Balance', 'Amount': openingDirectorLoanBalance },
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
  const { transactions, periodStart, periodEnd, companyName, abn } = data
  
  // Filter transactions for the period
  const periodTransactions = transactions.filter(tx => {
    if (!periodStart || !periodEnd) return true
    const txDate = new Date(tx.date)
    const start = new Date(periodStart)
    const end = new Date(periodEnd)
    return txDate >= start && txDate <= end
  })
  
  const metrics = calculateBusinessMetrics(periodTransactions, data.openingDirectorLoanBalance)
  
  // GST Summary
  const gstCollected = metrics.gstPayable
  const gstPaid = metrics.gstClaimable
  const netGST = gstCollected - gstPaid
  
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
  
  // BAS Form Data (ATO format)
  const basData = [
    { 'Field': 'G1 Total sales and income', 'Amount': metrics.totalIncome },
    { 'Field': '1A GST on sales', 'Amount': gstCollected },
    { 'Field': '1B GST on purchases', 'Amount': gstPaid },
    { 'Field': '1C Net GST', 'Amount': netGST },
    { 'Field': '4 PAYG Withholding', 'Amount': totalPAYGWithholding },
  ]
  
  // Create workbook with header
  const workbook = XLSX.utils.book_new()
  
  // BAS Summary sheet with header
  const basHeader = [
    [companyName],
    [`ABN: ${abn}`],
    ['BAS Summary'],
    periodStart && periodEnd ? [`Period: ${formatDateAustralian(periodStart)} to ${formatDateAustralian(periodEnd)}`] : [''],
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
 * Helper: Get account name from category
 */
function getAccountName(category: string): string {
  const accountMap: Record<string, string> = {
    // Revenue
    'INCOME_TRADING_REVENUE': 'Trading Revenue',
    'INCOME_REFUND_REIMBURSEMENT': 'Refunds & Reimbursements',
    // Expenses
    'EXPENSE_OFFICE_SUPPLIES': 'Office Supplies',
    'EXPENSE_FUEL_TRAVEL': 'Fuel & Travel',
    'EXPENSE_INSURANCE_PROFESSIONAL': 'Insurance',
    'EXPENSE_REPAIRS_MAINTENANCE': 'Repairs & Maintenance',
    'EXPENSE_OFFICE_EQUIPMENT_ASSETS': 'Office Equipment',
    // Assets
    'ASSET_FIXED': 'Fixed Assets',
    // Liabilities
    'LIABILITY_DIRECTORS_LOAN': "Director's Loan",
    'EXPENSE_DIRECTOR_LOAN_REPAYMENT': "Director's Loan Repayment",
  }
  
  return accountMap[category] || category.replace(/_/g, ' ')
}

/**
 * Helper: Get account type
 */
function getAccountType(accountName: string): string {
  if (accountName.includes('Asset') || accountName.includes('Equipment')) return 'Asset'
  if (accountName.includes('Loan') || accountName.includes('Liability')) return 'Liability'
  if (accountName.includes('Revenue') || accountName.includes('Income')) return 'Revenue'
  if (accountName.includes('Expense') || accountName.includes('Cost')) return 'Expense'
  return 'Other'
}

/**
 * Generate Financial Statements (P&L + Balance Sheet) Excel
 */
export async function generateFinancialStatements(data: CompliancePackageData): Promise<XLSX.WorkBook> {
  const { transactions, openingDirectorLoanBalance, companyName, abn, financialYear } = data
  
  const metrics = calculateBusinessMetrics(transactions, openingDirectorLoanBalance)
  
  // Calculate Current Assets
  // 1. Cash/Bank Balance: Use the last transaction's balance if available, otherwise calculate net
  let cashBalance = 0
  const lastTransaction = transactions
    .filter(tx => (tx as any).balance !== null && (tx as any).balance !== undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  
  if (lastTransaction && (lastTransaction as any).balance !== null) {
    cashBalance = (lastTransaction as any).balance
  } else {
    // Calculate net cash flow (credits - debits)
    const totalCredits = transactions
      .filter(tx => tx.credit && tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' && tx.category !== 'NON_TAXABLE_TRANSFER')
      .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)
    const totalDebits = transactions
      .filter(tx => tx.debit && tx.category !== 'NON_TAXABLE_TRANSFER')
      .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
    cashBalance = totalCredits - totalDebits
  }
  
  // 2. Accounts Receivable (미수금): Credit transactions with receivable category
  const accountsReceivable = transactions
    .filter(tx => tx.credit && 
                  (tx.category === 'INCOME_TRADING' || 
                   tx.category === 'INCOME_SERVICE' ||
                   tx.description?.toUpperCase().includes('RECEIVABLE') ||
                   tx.description?.toUpperCase().includes('OUTSTANDING')))
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)
  
  const currentAssets = cashBalance + accountsReceivable
  
  // Calculate Fixed Assets: Sum of all registered assets' current values
  const allAssets = await indexedDBStorage.getAllAssets()
  
  // Calculate depreciation for each asset (matching AssetManagement logic)
  const calculateAssetDepreciation = (asset: any): number => {
    const purchaseDate = new Date(asset.purchaseDate)
    const now = new Date()
    const yearsElapsed = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    
    if (asset.depreciationMethod === 'straight-line') {
      const annualDepreciation = asset.purchaseAmount / asset.usefulLife
      return Math.min(annualDepreciation * yearsElapsed, asset.purchaseAmount)
    } else {
      // Diminishing value method (matching AssetManagement logic)
      const rate = asset.depreciationRate || 20 // Default 20% per year
      let currentValue = asset.purchaseAmount
      let totalDepreciation = 0
      
      for (let year = 0; year < Math.floor(yearsElapsed); year++) {
        const yearDepreciation = currentValue * (rate / 100)
        totalDepreciation += yearDepreciation
        currentValue -= yearDepreciation
      }
      
      // Partial year
      if (yearsElapsed % 1 > 0) {
        const partialDepreciation = currentValue * (rate / 100) * (yearsElapsed % 1)
        totalDepreciation += partialDepreciation
      }
      
      return Math.min(totalDepreciation, asset.purchaseAmount)
    }
  }
  
  const totalAccumulatedDepreciation = allAssets.reduce((sum, asset) => {
    return sum + calculateAssetDepreciation(asset)
  }, 0)
  
  const fixedAssets = allAssets.reduce((sum, asset) => {
    const depreciation = calculateAssetDepreciation(asset)
    const currentValue = asset.purchaseAmount - depreciation
    return sum + Math.max(0, currentValue)
  }, 0)
  
  const totalAssets = currentAssets + fixedAssets
  
  // Calculate Equity
  const retainedEarnings = metrics.netProfit // For now, use current period's net profit
  const openingCapital = 0 // TODO: Add to Business Profile settings
  const shareCapital = metrics.shareCapital || 0 // Share Capital from transactions
  const totalEquity = retainedEarnings + openingCapital + shareCapital
  
  // Profit & Loss Statement
  const plData = [
    ['Profit & Loss Statement'],
    [`Financial Year: ${financialYear.start.split('-')[0]}-${financialYear.end.split('-')[0]}`],
    [''],
    ['Revenue', ''],
    ['Trading Revenue', metrics.totalIncome],
    ['Total Revenue', metrics.totalIncome],
    [''],
    ['Expenses', ''],
    ['Total Expenses', metrics.totalExpenses],
    [''],
    ['Net Profit/(Loss)', metrics.netProfit],
  ]
  
  // Balance Sheet (with actual calculations)
  const balanceSheetData = [
    ['Balance Sheet'],
    [`As at ${financialYear.end}`],
    [''],
    ['Assets', ''],
    ['Current Assets', ''],
    ['  Cash & Bank', cashBalance],
    ['  Accounts Receivable', accountsReceivable],
    ['Total Current Assets', currentAssets],
    [''],
    ['Fixed Assets', ''],
    ['  Accumulated Depreciation', totalAccumulatedDepreciation],
    ['  Net Fixed Assets', fixedAssets],
    ['Total Assets', totalAssets],
    [''],
    ['Liabilities', ''],
    ['Director\'s Loan', metrics.directorsLoanBalance],
    ['Total Liabilities', metrics.directorsLoanBalance],
    [''],
    ['Equity', ''],
    ['Opening Capital', openingCapital],
    ['Share Capital', shareCapital],
    ['Retained Earnings', retainedEarnings],
    ['Total Equity', totalEquity],
    [''],
    ['Total Liabilities & Equity', metrics.directorsLoanBalance + totalEquity],
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
  const trialBalance = generateTrialBalance(data)
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
