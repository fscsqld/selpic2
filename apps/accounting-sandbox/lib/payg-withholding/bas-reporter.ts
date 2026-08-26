/**
 * BAS (Business Activity Statement) Reporter
 * 
 * PAYG 원천징수 집계 및 BAS 리포트 생성
 */

import * as XLSX from 'xlsx'
import { PAYGConfigManager } from './config'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { applyKnownPurchaseGstTags } from '@/lib/gst/apply-known-purchase-gst'
import { calculatePAYG } from '@/src/shared/utils/tax-calculator'
import { 
  getAustralianQuarter, 
  getAustralianQuarterDates
} from '@/lib/utils/australian-financial-year'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

export interface BASReport {
  period: {
    startDate: string
    endDate: string
    type: 'monthly' | 'quarterly'
    label: string // e.g., "Q1 2026", "March 2026"
  }
  
  paygSummary: {
    totalGrossPay: number
    totalWithholdingTax: number
    totalNetPay: number
    transactionCount: number
    
    byRecipientType: {
      employee: {
        count: number
        totalGross: number
        totalTax: number
      }
      director: {
        count: number
        totalGross: number
        totalTax: number
      }
      contractor: {
        count: number
        totalGross: number
        totalTax: number
        noABNCount: number
        noABNWithholding: number
      }
      partner: {
        count: number
        totalGross: number
        totalTax: number
      }
    }
  }
  
  config: {
    isPAYGEnabled: boolean
    registrationNumber?: string
    registrationDate?: string
  }
  
  /** Aligns with Biz Intel GST Summary / calculateBusinessMetrics */
  gstSummary?: {
    /** G1 — Total sales (GST-inclusive business income) */
    g1TotalSales: number
    /** 1A — GST on sales (= income / 11) */
    label1A: number
    /** 1B — GST on purchases (= taxable expenses / 11) */
    label1B: number
    /** 1A − 1B (negative = refund) */
    gstNet: number
    gstRefund: boolean
    /** @deprecated alias of label1A — keep for older callers */
    gstCollected: number
    /** @deprecated alias of label1B */
    gstPaid: number
  }
}

export interface PayrollTransaction {
  date: string
  description: string
  grossAmount: number
  withholdingTax: number
  netAmount: number
  recipientType: 'employee' | 'director' | 'contractor' | 'partner'
  recipientName?: string
  hasABN?: boolean
  category: string
}

/**
 * Generate BAS Report from transactions
 */
export function generateBASReport(
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    department?: string
    source?: string
    requiresPAYG?: boolean
    isPayrollTransaction?: boolean
    payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
    noABNWarning?: {
      shouldWarn?: boolean
      withholdingAmount?: number
    }
    payrollMeta?: {
      payslipId?: string
      grossPay?: number
      withholdingTax?: number
      netPay?: number
      superannuation?: number
    }
    gstInfo?: {
      isGSTIncluded: boolean
      gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
      netAmount?: number
    }
  }>,
  startDate: string,
  endDate: string,
  periodType: 'monthly' | 'quarterly' = 'quarterly',
  accountType: 'individual' | 'company' | 'sole_trader' = 'company',
  /** When false, 1A/1B are 0 (not GST-registered). Default true. */
  gstRegistered: boolean = true
): BASReport {
  const config = PAYGConfigManager.loadConfig()
  
  // Filter payroll transactions within date range
  const payrollTransactions: PayrollTransaction[] = []
  
  transactions.forEach((tx) => {
    // Only process debit transactions (payments out)
    if (!tx.debit || !tx.isPayrollTransaction || !tx.requiresPAYG) {
      return
    }
    
    const txDate = new Date(tx.date)
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (txDate < start || txDate > end) {
      return
    }
    
    const grossAmount = tx.payrollMeta?.grossPay ?? Math.abs(tx.debit)
    const recipientType = tx.payrollType || 'employee'
    
    // Calculate withholding tax
    let withholdingTax = 0
    if (typeof tx.payrollMeta?.withholdingTax === 'number') {
      withholdingTax = tx.payrollMeta.withholdingTax
    } else if (config.isEnabled && config.autoCalculate) {
      const calculated = calculatePAYG(
        grossAmount,
        recipientType,
        true,
        'monthly'
      )
      withholdingTax = calculated || 0
    }
    
    // Check for No ABN withholding
    if (tx.noABNWarning?.shouldWarn && tx.noABNWarning.withholdingAmount) {
      withholdingTax = tx.noABNWarning.withholdingAmount
    }
    
    const netAmount = tx.payrollMeta?.netPay ?? grossAmount - withholdingTax
    
    payrollTransactions.push({
      date: tx.date,
      description: tx.description,
      grossAmount,
      withholdingTax,
      netAmount,
      recipientType,
      hasABN: !tx.noABNWarning?.shouldWarn,
      category: tx.category || 'UNCATEGORIZED',
    })
  })
  
  // Calculate summary
  const totalGrossPay = payrollTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0)
  const totalWithholdingTax = payrollTransactions.reduce((sum, tx) => sum + tx.withholdingTax, 0)
  const totalNetPay = payrollTransactions.reduce((sum, tx) => sum + tx.netAmount, 0)
  
  // Group by recipient type
  const byRecipientType = {
    employee: {
      count: 0,
      totalGross: 0,
      totalTax: 0,
    },
    director: {
      count: 0,
      totalGross: 0,
      totalTax: 0,
    },
    contractor: {
      count: 0,
      totalGross: 0,
      totalTax: 0,
      noABNCount: 0,
      noABNWithholding: 0,
    },
    partner: {
      count: 0,
      totalGross: 0,
      totalTax: 0,
    },
  }
  
  payrollTransactions.forEach((tx) => {
    const group = byRecipientType[tx.recipientType]
    group.count++
    group.totalGross += tx.grossAmount
    group.totalTax += tx.withholdingTax
    
    if (tx.recipientType === 'contractor' && !tx.hasABN) {
      byRecipientType.contractor.noABNCount++
      byRecipientType.contractor.noABNWithholding += tx.withholdingTax
    }
  })
  
  // Generate period label and adjust dates to match Australian BAS reporting periods
  // Use Australian Financial Year utilities for accurate period calculation
  const start = new Date(startDate)
  let periodLabel = ''
  let reportStartDate = startDate
  let reportEndDate = endDate
  
  if (periodType === 'quarterly') {
    // Get Australian quarter for the start date
    const { quarter, financialYear } = getAustralianQuarter(start)
    const quarterDates = getAustralianQuarterDates(quarter, financialYear)
    
    // Use standard quarter dates (1st of quarter start month to last day of quarter end month)
    reportStartDate = quarterDates.startDateStr
    reportEndDate = quarterDates.endDateStr
    periodLabel = `Q${quarter} ${financialYear}`
  } else {
    // Monthly reporting: use actual month boundaries
    const reportMonthStart = new Date(start.getFullYear(), start.getMonth(), 1)
    const reportMonthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    const formatLocal = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    reportStartDate = formatLocal(reportMonthStart)
    reportEndDate = formatLocal(reportMonthEnd)
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const year = start.getFullYear()
    const month = start.getMonth() // 0-11
    periodLabel = `${monthNames[month]} ${year}`
  }
  
  // GST — same engine as Biz Intel GST Summary / ATO lodgment (÷11 on taxable income & expenses)
  const startIso = toIsoDateString(reportStartDate) || reportStartDate.slice(0, 10)
  const endIso = toIsoDateString(reportEndDate) || reportEndDate.slice(0, 10)
  const periodTxs = applyKnownPurchaseGstTags(
    transactions.filter((tx) => {
      const iso = toIsoDateString(tx.date)
      if (!iso) return false
      return iso >= startIso && iso <= endIso
    })
  )
  const metrics = calculateBusinessMetrics(periodTxs, 0, accountType, 0, gstRegistered)
  const label1A = Math.round(metrics.gstPayable * 100) / 100
  const label1B = Math.round(metrics.gstClaimable * 100) / 100
  const gstNet = Math.round((label1A - label1B) * 100) / 100
  const g1TotalSales = Math.round(metrics.totalIncome * 100) / 100
  
  return {
    period: {
      startDate: reportStartDate, // BAS 신고 기간 시작일 (분기/월 시작일)
      endDate: reportEndDate, // BAS 신고 기간 종료일 (분기/월 종료일)
      type: periodType,
      label: periodLabel,
    },
    paygSummary: {
      totalGrossPay,
      totalWithholdingTax,
      totalNetPay,
      transactionCount: payrollTransactions.length,
      byRecipientType,
    },
    config: {
      isPAYGEnabled: config.isEnabled,
      registrationNumber: config.registrationNumber,
      registrationDate: config.registrationDate,
    },
    gstSummary: {
      g1TotalSales,
      label1A,
      label1B,
      gstNet,
      gstRefund: gstNet < 0,
      gstCollected: label1A,
      gstPaid: label1B,
    },
  }
}

/**
 * Export BAS Report to Excel
 */
export function exportBASToExcel(
  report: BASReport,
  payrollTransactions: PayrollTransaction[],
  fileName: string = 'bas-report'
): void {
  const allRows: any[][] = []
  
  // Header Section
  allRows.push(['Business Activity Statement (BAS) - PAYG Withholding Summary'])
  allRows.push([''])
  allRows.push(['Period:', report.period.label])
  allRows.push(['Start Date:', formatDateAustralian(report.period.startDate)])
  allRows.push(['End Date:', formatDateAustralian(report.period.endDate)])
  allRows.push(['Period Type:', formatBasPeriodTypeLabel(report.period.type)])
  allRows.push([''])
  
  // PAYG Registration Info
  allRows.push(['PAYG Registration Information'])
  allRows.push(['PAYG Enabled:', report.config.isPAYGEnabled ? 'Yes' : 'No'])
  if (report.config.registrationNumber) {
    allRows.push(['Registration Number:', report.config.registrationNumber])
  }
  if (report.config.registrationDate) {
    allRows.push(['Registration Date:', formatDateAustralian(report.config.registrationDate)])
  }
  allRows.push([''])
  
  // Summary Section
  allRows.push(['PAYG Withholding Summary'])
  allRows.push(['Total Gross Pay:', report.paygSummary.totalGrossPay])
  allRows.push(['Total Withholding Tax:', report.paygSummary.totalWithholdingTax])
  allRows.push(['Total Net Pay:', report.paygSummary.totalNetPay])
  allRows.push(['Transaction Count:', report.paygSummary.transactionCount])
  allRows.push([''])
  
  // By Recipient Type
  allRows.push(['Breakdown by Recipient Type'])
  allRows.push(['Type', 'Count', 'Total Gross', 'Total Tax', 'No ABN Count', 'No ABN Withholding'])
  
  const recipientTypes = ['employee', 'director', 'contractor', 'partner'] as const
  recipientTypes.forEach((type) => {
    const group = report.paygSummary.byRecipientType[type]
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
    
    if (type === 'contractor') {
      allRows.push([
        typeLabel,
        group.count,
        group.totalGross,
        group.totalTax,
        (group as any).noABNCount || 0,
        (group as any).noABNWithholding || 0,
      ])
    } else {
      allRows.push([
        typeLabel,
        group.count,
        group.totalGross,
        group.totalTax,
        '',
        '',
      ])
    }
  })
  
  allRows.push([''])
  allRows.push([''])
  
  // GST Summary — ATO field labels (same as on-screen GST Summary)
  if (report.gstSummary) {
    allRows.push(['GST Summary (ATO labels — matches Biz Intel)'])
    allRows.push(['G1 — Total sales (GST inclusive):', Number(report.gstSummary.g1TotalSales.toFixed(2))])
    allRows.push(['1A — GST on sales:', Number(report.gstSummary.label1A.toFixed(2))])
    allRows.push(['1B — GST on purchases:', Number(report.gstSummary.label1B.toFixed(2))])
    allRows.push([
      report.gstSummary.gstRefund ? '7C — GST refund due:' : '1C — Net GST payable:',
      Number(Math.abs(report.gstSummary.gstNet).toFixed(2)),
    ])
    allRows.push(['GST Refund:', report.gstSummary.gstRefund ? 'Yes' : 'No'])
    allRows.push([''])
    allRows.push([''])
  }
  
  // Detailed Transaction List
  allRows.push(['Detailed Payroll Transactions'])
  allRows.push(['Date', 'Description', 'Recipient Type', 'Gross Amount', 'Withholding Tax', 'Net Amount', 'Has ABN', 'Category'])
  
  payrollTransactions.forEach((tx) => {
    allRows.push([
      formatDateAustralian(tx.date),
      tx.description,
      tx.recipientType,
      tx.grossAmount,
      tx.withholdingTax,
      tx.netAmount,
      tx.hasABN ? 'Yes' : 'No',
      tx.category,
    ])
  })
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(allRows)
  
  // Format numeric cells
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  
  // Format summary amounts (Column B) - including GST amounts
  for (let row = 0; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ c: 1, r: row })
    if (worksheet[cellAddress] && typeof worksheet[cellAddress].v === 'number') {
      worksheet[cellAddress].t = 'n'
      worksheet[cellAddress].z = '#,##0.00'
    }
  }
  
  if (report.gstSummary) {
    const gstRowStart = allRows.findIndex(
      (row) => Array.isArray(row) && String(row[0] || '').startsWith('GST Summary')
    )
    if (gstRowStart >= 0) {
      for (let i = 1; i <= 4; i++) {
        const cell = XLSX.utils.encode_cell({ c: 1, r: gstRowStart + i })
        if (worksheet[cell] && typeof worksheet[cell].v === 'number') {
          worksheet[cell].t = 'n'
          worksheet[cell].z = '#,##0.00'
        }
      }
    }
  }
  
  // Format transaction amounts (Columns D, E, F)
  const transactionStartRow = allRows.findIndex(row => row[0] === 'Date' && row[1] === 'Description')
  if (transactionStartRow > 0) {
    for (let row = transactionStartRow + 1; row <= range.e.r; row++) {
      // Gross Amount (Column D, index 3)
      const grossCell = XLSX.utils.encode_cell({ c: 3, r: row })
      if (worksheet[grossCell] && typeof worksheet[grossCell].v === 'number') {
        worksheet[grossCell].t = 'n'
        worksheet[grossCell].z = '#,##0.00'
      }
      
      // Withholding Tax (Column E, index 4)
      const taxCell = XLSX.utils.encode_cell({ c: 4, r: row })
      if (worksheet[taxCell] && typeof worksheet[taxCell].v === 'number') {
        worksheet[taxCell].t = 'n'
        worksheet[taxCell].z = '#,##0.00'
      }
      
      // Net Amount (Column F, index 5)
      const netCell = XLSX.utils.encode_cell({ c: 5, r: row })
      if (worksheet[netCell] && typeof worksheet[netCell].v === 'number') {
        worksheet[netCell].t = 'n'
        worksheet[netCell].z = '#,##0.00'
      }
    }
  }
  
  // Format breakdown table amounts (Columns C, D, E, F)
  const breakdownStartRow = allRows.findIndex(row => row[0] === 'Type' && row[1] === 'Count')
  if (breakdownStartRow > 0) {
    for (let row = breakdownStartRow + 1; row < transactionStartRow - 2; row++) {
      // Count (Column B, index 1)
      const countCell = XLSX.utils.encode_cell({ c: 1, r: row })
      if (worksheet[countCell] && typeof worksheet[countCell].v === 'number') {
        worksheet[countCell].t = 'n'
        worksheet[countCell].z = '#,##0'
      }
      
      // Total Gross (Column C, index 2)
      const grossCell = XLSX.utils.encode_cell({ c: 2, r: row })
      if (worksheet[grossCell] && typeof worksheet[grossCell].v === 'number') {
        worksheet[grossCell].t = 'n'
        worksheet[grossCell].z = '#,##0.00'
      }
      
      // Total Tax (Column D, index 3)
      const taxCell = XLSX.utils.encode_cell({ c: 3, r: row })
      if (worksheet[taxCell] && typeof worksheet[taxCell].v === 'number') {
        worksheet[taxCell].t = 'n'
        worksheet[taxCell].z = '#,##0.00'
      }
      
      // No ABN Withholding (Column F, index 5)
      const noABNCell = XLSX.utils.encode_cell({ c: 5, r: row })
      if (worksheet[noABNCell] && typeof worksheet[noABNCell].v === 'number') {
        worksheet[noABNCell].t = 'n'
        worksheet[noABNCell].z = '#,##0.00'
      }
    }
  }
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Date / Type
    { wch: 50 }, // Description
    { wch: 15 }, // Recipient Type / Count
    { wch: 15 }, // Gross Amount / Total Gross
    { wch: 15 }, // Withholding Tax / Total Tax
    { wch: 15 }, // Net Amount / No ABN Count
    { wch: 10 }, // Has ABN / No ABN Withholding
    { wch: 30 }, // Category
  ]
  
  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BAS Report')
  
  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0]
  const fullFileName = `${fileName}_${report.period.label.replace(/\s+/g, '_')}_${timestamp}.xlsx`
  
  // Write file
  XLSX.writeFile(workbook, fullFileName)
  console.log('[BAS Export] File exported:', fullFileName)
  console.log('[BAS Export] Total payroll transactions:', payrollTransactions.length)
  console.log('[BAS Export] Total withholding tax:', report.paygSummary.totalWithholdingTax)
}

/**
 * Get date range for period
 */
/**
 * Get period date range for Australian Financial Year
 * @param year - Calendar year (for monthly) or start year of financial year (for quarterly)
 * @param period - Quarter number (1-4) or month number (1-12)
 * @param periodType - 'monthly' or 'quarterly'
 * @returns Date range in YYYY-MM-DD format
 */
export function getPeriodDateRange(
  year: number,
  period: number,
  periodType: 'monthly' | 'quarterly'
): { startDate: string; endDate: string } {
  if (periodType === 'quarterly') {
    // Australian Financial Year Quarters
    // period: 1 = Q1 (Jul-Sep), 2 = Q2 (Oct-Dec), 3 = Q3 (Jan-Mar), 4 = Q4 (Apr-Jun)
    const financialYear = period === 1 || period === 2 
      ? `${year}-${year + 1}`  // Q1, Q2: current year to next year
      : `${year - 1}-${year}`  // Q3, Q4: previous year to current year
    
    const quarterDates = getAustralianQuarterDates(period as 1 | 2 | 3 | 4, financialYear)
    return {
      startDate: quarterDates.startDateStr,
      endDate: quarterDates.endDateStr,
    }
  } else {
    // Monthly: use standard month boundaries
    const start = new Date(year, period - 1, 1)
    const end = new Date(year, period, 0) // Last day of month
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }
}

