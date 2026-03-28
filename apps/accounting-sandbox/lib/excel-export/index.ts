/**
 * Excel Export Engine
 * 
 * Exports transactions to ATO-compliant General Ledger format
 */

import * as XLSX from 'xlsx'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { strings } from '@/lib/i18n/strings'

export interface ExportTransaction {
  date: string
  description: string
  category: string
  gst?: number
  debit: number | null
  credit: number | null
  department: string
  status: string
  balance?: number
}

/**
 * Calculate GST (10% of amount)
 * GST = Amount / 11 (inclusive GST)
 */
export function calculateGST(amount: number, isInclusive: boolean = true): number {
  if (isInclusive) {
    // If amount includes GST, GST = amount / 11
    return Math.round((amount / 11) * 100) / 100
  } else {
    // If amount excludes GST, GST = amount * 0.1
    return Math.round((amount * 0.1) * 100) / 100
  }
}

/**
 * Check if category has GST
 */
export function hasGST(category: string): boolean {
  // Categories that typically have GST
  const gstCategories = [
    'EXPENSE_OFFICE_SUPPLIES',
    'EXPENSE_MARKETING',
    'EXPENSE_RENT',
    'EXPENSE_UTILITIES',
    'EXPENSE_CLEANING_SUBCONTRACTOR',
    'EXPENSE_STICKER_PRODUCTION',
    'EXPENSE_TRAVEL_TRANSPORT', // Travel - Transport (Business Deductible)
    'EXPENSE_TRAVEL_ACCOMMODATION', // Travel - Accommodation (Business Deductible)
    'EXPENSE_TRAVEL_MEALS', // Travel - Meals (Business Deductible)
    'EXPENSE_TRAVEL_PARKING_TOLLS', // Travel - Parking/Tolls (Business Deductible)
    'EXPENSE_MEALS_ENTERTAINMENT', // Meals & Entertainment
    'INCOME_SALES',
    'INCOME_SALES_CLEANING',
    'INCOME_SALES_STICKER',
  ]

  // Categories that don't have GST
  const noGSTCategories = [
    'LIABILITY_DIRECTORS_LOAN',
    'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL',
    'EXPENSE_STARTUP_INCORPORATION', // Incorporation fees may not have GST
    'TRANSFER_PARTNERSHIP_TO_COMPANY',
  ]

  if (noGSTCategories.includes(category)) {
    return false
  }

  return gstCategories.includes(category) || category.startsWith('EXPENSE_') || category.startsWith('INCOME_')
}

/**
 * Clean and simplify transaction description for Excel export
 * Uses the same logic as TransactionTable component
 */
function cleanDescriptionForExport(description: string): string {
  if (!description) return ''
  
  const desc = description.trim()
  const descLower = desc.toLowerCase()
  
  // Known merchant name mappings (priority order - most specific first)
  const merchantMap: Array<{ pattern: RegExp | string, name: string }> = [
    { pattern: /bcc\s+kgs\s+car\s+park|king\s+george\s+square/i, name: 'King George Square Car Park' },
    { pattern: /associated\s+cleaning?|associatedclean/i, name: 'Associated Cleaning' },
    { pattern: /jason\s+family(?:\s+shine)?/i, name: 'Jason Family Shine' },
    { pattern: /ak\s+innovation/i, name: 'AK Innovation' },
    { pattern: /aseeos(?:\s+homes)?/i, name: 'Aseeos Homes' },
    { pattern: /7[- ]?eleven|7eleven/i, name: '7-Eleven' },
    { pattern: /kleenhub/i, name: 'KleenHub' },
    { pattern: /ampol/i, name: 'Ampol' },
    { pattern: /bunnings/i, name: 'Bunnings' },
    { pattern: /malatang/i, name: 'Malatang' },
    { pattern: /mjr\s+enterprise/i, name: 'MJR Enterprise' },
    { pattern: /oktax/i, name: 'OKTAX' },
    { pattern: /tpg(?:\s+(?:internet|telecom))?/i, name: 'TPG Internet' },
    { pattern: /alinta\s+energy/i, name: 'Alinta Energy' },
    { pattern: /brisbane\s+city\s+council/i, name: 'Brisbane City Council' },
    { pattern: /allianz/i, name: 'Allianz' },
    { pattern: /racq/i, name: 'RACQ' },
    { pattern: /nrma/i, name: 'NRMA' },
    { pattern: /secure\s+parking/i, name: 'Secure Parking' },
    { pattern: /uptown\s+parking/i, name: 'Uptown Parking' },
    { pattern: /supercheap\s+auto/i, name: 'Supercheap Auto' },
    { pattern: /total\s+tools/i, name: 'Total Tools' },
    { pattern: /bp\b/i, name: 'BP' },
    { pattern: /shell\b/i, name: 'Shell' },
    { pattern: /liberty\b/i, name: 'Liberty' },
    { pattern: /united\b/i, name: 'United' },
  ]
  
  // Check for known merchant patterns first
  for (const { pattern, name } of merchantMap) {
    if (typeof pattern === 'string') {
      if (descLower.includes(pattern)) {
        return name
      }
    } else {
      if (pattern.test(desc)) {
        return name
      }
    }
  }
  
  // Remove common prefixes and patterns
  let cleaned = desc
    .replace(/^(V\d+|EFTPOS|VISA|MASTERCARD|DEBIT|CREDIT|ATM|NABATM)\s+/i, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\s*/g, '')
    .replace(/\d{1,2}:\d{2}\s*/g, '')
    .replace(/\s+\d{8,}$/g, '')
    .replace(/\b\d{4,5}[A-Z]?\b/g, '')
    .replace(/\b(QLD|NSW|VIC|SA|WA|NT|ACT|TAS)\b/gi, '')
    .replace(/\b(MOUNT|MT|ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|BOULEVARD)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  // If cleaned description is still long, try to extract first meaningful words
  if (cleaned.length > 30) {
    const words = cleaned.split(/\s+/).filter(word => 
      word.length > 2 && 
      !/^\d+$/.test(word) && 
      !['THE', 'AND', 'FOR', 'FROM', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY'].includes(word.toUpperCase())
    )
    
    if (words.length > 0) {
      const extracted = words.slice(0, 3).join(' ')
      return extracted.split(/\s+/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    }
  }
  
  if (cleaned.length > 50) {
    return cleaned.substring(0, 50) + '...'
  }
  
  return cleaned.split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

/**
 * Get department display name for Excel (matches UI display)
 */
function getDepartmentDisplayName(dept?: string): string {
  if (!dept) return strings.departments.unknown
  
  // Unified: 'sticker' is automatically converted to 'cleaning' (both display as 'Company')
  const normalizedDept = dept === 'sticker' ? 'cleaning' : dept
  
  const deptMap: Record<string, string> = {
    'cleaning': strings.departments.cleaning, // 'Company'
    'sticker': strings.departments.cleaning, // 'Company' (legacy support - auto-convert to cleaning)
    'personal': strings.departments.personal, // 'Personal'
    'general': strings.departments.general, // 'General'
    'unknown': strings.departments.unknown, // 'Unknown'
  }
  
  return deptMap[normalizedDept] || strings.departments.unknown
}

/**
 * Get category display name for Excel
 */
function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    // 수입 (Income)
    'INCOME_SALES_CLEANING': 'Trading Revenue', // 통합: 모든 사업적 입금 (Cleaning + Sticker)
    'INCOME_SALES_STICKER': 'Trading Revenue', // Legacy: 자동으로 INCOME_SALES_CLEANING으로 변환
    'NON_TAXABLE_CASH_DEPOSIT': 'Non-Taxable cash deposit', // 개인 ATM 입금
    'LIABILITY_DIRECTORS_LOAN': "Director's Loan", // Director's Loan (통합)
    'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL': "Director's Loan", // Director's Loan (통합)
    
    // 자본 (Equity)
    'EQUITY_SHARE_CAPITAL': 'Share Capital', // 주식 납입금 (Net Profit에 영향 없음, Balance Sheet Equity에만 반영)
    
    // 지출 (Expenses)
    'EXPENSE_STARTUP_INCORPORATION': 'Startup Costs', // Startup Costs (통합)
    'EXPENSE_STARTUP_DOMAIN': 'Startup Costs', // Legacy: 자동으로 EXPENSE_STARTUP_INCORPORATION으로 변환
    'EXPENSE_STARTUP_SAMPLE': 'Startup Costs', // Legacy: 자동으로 EXPENSE_STARTUP_INCORPORATION으로 변환
    'EXPENSE_FUEL_TRAVEL': 'Fuel', // 주유소만 (주차장 제거)
    'EXPENSE_MOTOR_VEHICLE': 'Vehicle Maintenance',
    // 출장 경비 (Travel Expenses) - Business Deductible
    'EXPENSE_TRAVEL_TRANSPORT': 'Travel - Transport',
    'EXPENSE_TRAVEL_ACCOMMODATION': 'Travel - Accommodation',
    'EXPENSE_TRAVEL_MEALS': 'Travel - Meals',
    'EXPENSE_TRAVEL_PARKING_TOLLS': 'Travel - Parking/Tolls',
    'EXPENSE_MEALS_ENTERTAINMENT': 'Meals & Entertainment', // 클라이언트 접대비만
    'EXPENSE_INSURANCE_PROFESSIONAL': 'Insurance/Professional',
    'EXPENSE_CLEANING_SUPPLIES': 'Cleaning Supplies',
    'EXPENSE_UTILITIES_PHONE': 'Utilities/Phone',
    'EXPENSE_CLEANING_SUBCONTRACTOR': 'Subcontractor',
    'EXPENSE_REPAIRS_MAINTENANCE': 'Repairs & Maintenance',
    'EXPENSE_OFFICE_EQUIPMENT': 'Office Equipment & Assets',
    'EXPENSE_OFFICE_SUPPLIES': 'Office Supplies',
    'EXPENSE_RENT': 'Rent',
    'EXPENSE_MARKETING': 'Marketing & Advertising',
    'EXPENSE_WAGES_SALARIES': 'Wages & Salaries',
    'EXPENSE_SUPERANNUATION': 'Superannuation',
    'EXPENSE_ATO_GST_BAS': 'ATO - GST & BAS',
    'EXPENSE_ATO_PAYG_WITHHOLDING': 'ATO - PAYG Withholding',
    'EXPENSE_COMPANY_INCOME_TAX': 'Company Income Tax',
    'EXPENSE_WORKERS_COMPENSATION': 'Workers Compensation',
    'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES': 'Accounting & Professional Fees',
    'EXPENSE_DIRECTOR_LOAN_REPAYMENT': 'Director Loan Repayment',
    'EXPENSE_DIVIDENDS_PAID': 'Dividends Paid',
    'EXPENSE_DIRECTORS_FEES': "Director's Fees",
    'CASH_EXPENSE_PETTY': 'Cash & Petty Cash', // 현금 지출
    
    // 이체 및 기타
    'NON_TAXABLE_TRANSFER': 'Non-Taxable Transfer', // Non-Taxable Transfer (통합)
    'TRANSFER_INTERNAL': 'Non-Taxable Transfer', // Non-Taxable Transfer (통합)
    'TRANSFER_PARTNERSHIP_TO_COMPANY': 'Non-Taxable Transfer', // Non-Taxable Transfer (통합)
    'UNCATEGORIZED': 'Uncategorized',
    
    // Legacy categories (하위 호환성)
    'INCOME_SALES': 'Sales Income',
    'INCOME_CASH_DEPOSIT_REVIEW': 'Non-Taxable cash deposit', // Legacy
    'EXPENSE_UTILITIES': 'Utilities/Phone', // Legacy
    'EXPENSE_STICKER_PRODUCTION': 'Sticker Production', // Legacy
  }
  return categoryMap[category] || category
}

/**
 * Export transactions to Excel with Summary Table at the bottom
 */
export function exportToExcel(
  transactions: ExportTransaction[],
  fileName: string = 'general-ledger'
): void {
  // Filter to all business transactions (consolidated: cleaning/sticker unified as Company + no department)
  const companyTransactions = transactions.filter(tx => {
    // Include all business transactions (exclude personal, general, unknown)
    // Unified: 'cleaning' and 'sticker' are both treated as 'Company' (business)
    return tx.department !== 'personal' && 
           tx.department !== 'unknown' &&
           tx.department !== 'general' &&
           (tx.department === 'cleaning' || 
            tx.department === 'sticker' || // Legacy support: auto-convert to 'cleaning'
            !tx.department) // Include transactions without department as business
  })

  // Calculate category totals (Company Department only)
  const categoryTotals: Record<string, number> = {}
  companyTransactions.forEach((tx) => {
    const amount = (tx.debit || 0) + (tx.credit || 0)
    const category = tx.category || 'UNCATEGORIZED'
    categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(amount)
  })

  // Prepare main transaction data with cleaned descriptions
  const mainData = transactions.map((tx) => {
    const amount = tx.debit || tx.credit || 0
    const gst = hasGST(tx.category) ? calculateGST(Math.abs(amount)) : 0
    const netAmount = Math.abs(amount) - gst

    return {
      Date: formatDateAustralian(tx.date), // Australian format: DD/MM/YYYY
      Description: cleanDescriptionForExport(tx.description), // Use cleaned description
      Category: getCategoryDisplayName(tx.category || 'UNCATEGORIZED'), // Use display name (matches UI)
      'GST (10%)': gst,
      'Net Amount': netAmount,
      Debit: tx.debit || 0,
      Credit: tx.credit || 0,
      Department: getDepartmentDisplayName(tx.department), // Use display name (matches UI: 'cleaning' → 'Company')
      Status: tx.status || '',
      Balance: tx.balance || 0,
    }
  })

  // Calculate grand totals
  const totalDebit = transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0)
  const totalCredit = transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0)

  // Build Excel rows: Headers → Data → Empty rows → Summary → Grand Total
  const allRows: any[][] = []
  
  // Step 1: Add main data headers (Row 1)
  allRows.push(['Date', 'Description', 'Category', 'GST (10%)', 'Net Amount', 'Debit', 'Credit', 'Department', 'Status', 'Balance'])
  
  // Step 2: Add main transaction data (Rows 2+)
  mainData.forEach((row) => {
    allRows.push([
      row.Date,
      row.Description,
      row.Category,
      row['GST (10%)'],
      row['Net Amount'],
      row.Debit,
      row.Credit,
      row.Department,
      row.Status,
      row.Balance,
    ])
  })
  
  // Step 3: Add GRAND TOTAL row for transactions
  allRows.push([
    'GRAND TOTAL',
    '',
    '',
    '',
    '',
    totalDebit,
    totalCredit,
    '',
    '',
    '',
  ])
  
  // Calculate transaction row count (for formatting purposes)
  const transactionRowCount = allRows.length - 1 // Headers (1) + Data (N) + GRAND TOTAL (1) = N+2, but 0-based = N+1
  
  // Step 4: Add two empty rows as visual separator
  allRows.push(['', '', '', '', '', '', '', '', '', ''])
  allRows.push(['', '', '', '', '', '', '', '', '', ''])
  
  // Step 5: Add Tax Category Summary at the bottom
  allRows.push(['Tax Category Summary (Company Department Only)', '', '', '', '', '', '', '', '', ''])
  allRows.push(['Tax Category', 'Total Amount', '', '', '', '', '', '', '', ''])
  
  // Add category totals (sorted by amount descending)
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20) // Allow more categories

  sortedCategories.forEach(([category, total]) => {
    allRows.push([
      getCategoryDisplayName(category), // Use display name instead of code
      total,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ])
  })
  
  // Step 6: Add GRAND TOTAL for summary (Net Profit/Loss for Company Department)
  const summaryTotal = Object.values(categoryTotals).reduce((sum, total) => sum + total, 0)
  allRows.push([
    'GRAND TOTAL',
    summaryTotal,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ])

  // Create worksheet from array of arrays
  const worksheet = XLSX.utils.aoa_to_sheet(allRows)

  // Format numeric cells as numbers with currency format
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  
  // Find where summary starts (after empty rows and transaction GRAND TOTAL)
  const emptyRows = 2
  const summaryStartRow = transactionRowCount + emptyRows + 1 // +1 for 0-based indexing
  
  // Format summary amounts (Column B, starting from summaryStartRow + 2)
  // Summary header is at summaryStartRow, column headers at summaryStartRow + 1, data starts at summaryStartRow + 2
  for (let row = summaryStartRow + 2; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ c: 1, r: row })
    if (worksheet[cellAddress] && typeof worksheet[cellAddress].v === 'number') {
      worksheet[cellAddress].t = 'n'
      worksheet[cellAddress].z = '#,##0.00'
    }
  }

  // Format all numeric cells in main data (GST, Net Amount, Debit, Credit, Balance)
  // Only format transaction rows (not summary rows)
  // transactionRowCount includes: Headers (1) + Data (N) + GRAND TOTAL (1) = N+2 rows (0-based: 0 to N+1)
  const transactionEndRow = transactionRowCount // 0-based index of last transaction row
  for (let row = 0; row <= transactionEndRow; row++) {
    // GST (Column D, index 3)
    const gstCell = XLSX.utils.encode_cell({ c: 3, r: row })
    if (worksheet[gstCell] && typeof worksheet[gstCell].v === 'number') {
      worksheet[gstCell].t = 'n'
      worksheet[gstCell].z = '#,##0.00'
    }
    
    // Net Amount (Column E, index 4)
    const netCell = XLSX.utils.encode_cell({ c: 4, r: row })
    if (worksheet[netCell] && typeof worksheet[netCell].v === 'number') {
      worksheet[netCell].t = 'n'
      worksheet[netCell].z = '#,##0.00'
    }
    
    // Debit (Column F, index 5)
    const debitCell = XLSX.utils.encode_cell({ c: 5, r: row })
    if (worksheet[debitCell] && typeof worksheet[debitCell].v === 'number') {
      worksheet[debitCell].t = 'n'
      worksheet[debitCell].z = '#,##0.00'
    }
    
    // Credit (Column G, index 6)
    const creditCell = XLSX.utils.encode_cell({ c: 6, r: row })
    if (worksheet[creditCell] && typeof worksheet[creditCell].v === 'number') {
      worksheet[creditCell].t = 'n'
      worksheet[creditCell].z = '#,##0.00'
    }
    
    // Balance (Column J, index 9)
    const balanceCell = XLSX.utils.encode_cell({ c: 9, r: row })
    if (worksheet[balanceCell] && typeof worksheet[balanceCell].v === 'number') {
      worksheet[balanceCell].t = 'n'
      worksheet[balanceCell].z = '#,##0.00'
    }
  }

  // Format transaction GRAND TOTAL row
  const transactionGrandTotalRow = transactionRowCount // Headers (0) + Data (1 to N) + GRAND TOTAL (N+1)
  const transactionGrandTotalDebitCell = XLSX.utils.encode_cell({ c: 5, r: transactionGrandTotalRow })
  const transactionGrandTotalCreditCell = XLSX.utils.encode_cell({ c: 6, r: transactionGrandTotalRow })
  
  if (worksheet[transactionGrandTotalDebitCell]) {
    worksheet[transactionGrandTotalDebitCell].t = 'n'
    worksheet[transactionGrandTotalDebitCell].z = '#,##0.00'
  }
  
  if (worksheet[transactionGrandTotalCreditCell]) {
    worksheet[transactionGrandTotalCreditCell].t = 'n'
    worksheet[transactionGrandTotalCreditCell].z = '#,##0.00'
  }
  
  // Format summary GRAND TOTAL row (last row)
  const summaryGrandTotalRow = range.e.r
  const summaryGrandTotalCell = XLSX.utils.encode_cell({ c: 1, r: summaryGrandTotalRow })
  
  if (worksheet[summaryGrandTotalCell]) {
    worksheet[summaryGrandTotalCell].t = 'n'
    worksheet[summaryGrandTotalCell].z = '#,##0.00'
  }

  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 40 }, // Description
    { wch: 30 }, // Category
    { wch: 12 }, // GST
    { wch: 12 }, // Net Amount
    { wch: 12 }, // Debit
    { wch: 12 }, // Credit
    { wch: 15 }, // Department
    { wch: 12 }, // Status
    { wch: 12 }, // Balance
  ]

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'General Ledger')

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0]
  const fullFileName = `${fileName}_${timestamp}.xlsx`

  // Write file
  XLSX.writeFile(workbook, fullFileName)
  console.log('[Excel Export] File exported:', fullFileName)
  console.log('[Excel Export] Summary categories:', Object.keys(categoryTotals).length)
  console.log('[Excel Export] Total transactions:', transactions.length)
}

/**
 * Export summary to Excel
 */
export function exportSummary(
  summary: {
    totalIncome: number
    totalExpenses: number
    netProfit: number
    totalGSTPayable: number
    totalGSTClaimable: number
    directorsLoanBalance: number
    cleaningIncome: number
    stickerIncome: number
  },
  fileName: string = 'financial-summary'
): void {
  const summaryData = [
    { Metric: 'Total Income', Amount: summary.totalIncome.toFixed(2) },
    { Metric: 'Total Expenses', Amount: summary.totalExpenses.toFixed(2) },
    { Metric: 'Net Profit', Amount: summary.netProfit.toFixed(2) },
    { Metric: 'Total GST Payable', Amount: summary.totalGSTPayable.toFixed(2) },
    { Metric: 'Total GST Claimable', Amount: summary.totalGSTClaimable.toFixed(2) },
    { Metric: "Director's Loan Balance", Amount: summary.directorsLoanBalance.toFixed(2) },
    // Cleaning Income과 Sticker Income은 Trading Revenue로 통합되어 Total Income에 포함됨
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(summaryData)

  worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Summary')

  const timestamp = new Date().toISOString().split('T')[0]
  const fullFileName = `${fileName}_${timestamp}.xlsx`

  XLSX.writeFile(workbook, fullFileName)
  console.log('[Excel Export] Summary exported:', fullFileName)
}

