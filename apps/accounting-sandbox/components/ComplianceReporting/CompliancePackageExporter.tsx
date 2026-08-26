'use client'

import { useState } from 'react'
import { Download, Package, Loader2, CheckCircle } from 'lucide-react'
import {
  generateCompliancePackage,
  CompliancePackageData,
  resolveComplianceReportPeriod,
} from '@/lib/compliance-reporting/compliance-package'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

interface CompliancePackageExporterProps {
  transactions: Array<{
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
      /** @deprecated legacy shape — prefer gstType */
      hasGST?: boolean
    }
  }>
  openingDirectorLoanBalance: number
  companyName: string
  abn: string
  acn?: string
  periodStart?: string
  periodEnd?: string
}

function periodFileSlug(label: string, start: string, end: string): string {
  const fromLabel = label.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  if (fromLabel) return fromLabel
  return `${start}_${end}`.replace(/-/g, '')
}

export function CompliancePackageExporter({
  transactions,
  openingDirectorLoanBalance,
  companyName,
  abn,
  acn,
  periodStart,
  periodEnd,
}: CompliancePackageExporterProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  /** Prefer P&L / banner window; else AU FY from those dates; never wall-clock alone. */
  const resolveFinancialYear = () => {
    const start = periodStart?.slice(0, 10)
    const end = periodEnd?.slice(0, 10)
    if (start && end) {
      const mid = start
      const y = Number(mid.slice(0, 4))
      const m = Number(mid.slice(5, 7))
      if (m >= 7) {
        return { start: `${y}-07-01`, end: `${y + 1}-06-30` }
      }
      return { start: `${y - 1}-07-01`, end: `${y}-06-30` }
    }
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    if (month >= 7) {
      return { start: `${year}-07-01`, end: `${year + 1}-06-30` }
    }
    return { start: `${year - 1}-07-01`, end: `${year}-06-30` }
  }

  const handleExportPackage = async () => {
    setIsGenerating(true)
    setGenerated(false)

    try {
      const financialYear = resolveFinancialYear()

      const packageData: CompliancePackageData = {
        transactions,
        openingDirectorLoanBalance,
        companyName,
        abn,
        acn,
        financialYear,
        // Prefer P&L banner dates for every sheet (do not expand a quarter to FY alone)
        periodStart: periodStart || financialYear.start,
        periodEnd: periodEnd || financialYear.end,
      }

      const reportPeriod = resolveComplianceReportPeriod(packageData)

      const { financialStatements, trialBalance, directorsLoanReport, basPackage, auditTrail } =
        await generateCompliancePackage(packageData)

      const zip = new JSZip()

      const financialStatementsBuffer = XLSX.write(financialStatements, {
        type: 'array',
        bookType: 'xlsx',
      })
      zip.file('Financial_Statements.xlsx', financialStatementsBuffer)

      const trialBalanceBuffer = XLSX.write(trialBalance, { type: 'array', bookType: 'xlsx' })
      zip.file('Trial_Balance.xlsx', trialBalanceBuffer)

      const directorsLoanBuffer = XLSX.write(directorsLoanReport, {
        type: 'array',
        bookType: 'xlsx',
      })
      zip.file('Directors_Loan_Report.xlsx', directorsLoanBuffer)

      const basPackageBuffer = XLSX.write(basPackage, { type: 'array', bookType: 'xlsx' })
      zip.file('BAS_Package.xlsx', basPackageBuffer)

      const auditTrailWithHeader = {
        companyName,
        abn,
        generatedAt: new Date().toISOString(),
        period: reportPeriod.label,
        periodStart: reportPeriod.start,
        periodEnd: reportPeriod.end,
        totalEntries: auditTrail.length,
        entries: auditTrail,
      }
      zip.file('Audit_Trail.json', JSON.stringify(auditTrailWithHeader, null, 2))

      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Accountant_Pack_${periodFileSlug(reportPeriod.label, reportPeriod.start, reportPeriod.end)}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setGenerated(true)
      setTimeout(() => setGenerated(false), 3000)
    } catch (error) {
      console.error('Failed to generate compliance package:', error)
      alert('Failed to generate compliance package. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Compliance Reporting Package</h3>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-teal-900 mb-4">
          Uses the selected P&amp;L period for every sheet (same window as Biz Intel / Export BAS).
          Choosing Q4 exports Q4 figures — not the full FY snapped from the start date.
        </p>

        <h4 className="font-semibold text-gray-900 mb-2">Financial package</h4>
        <ul className="text-sm text-gray-700 space-y-1 mb-4">
          <li>• Financial Statements (P&amp;L + Balance Sheet) - Excel</li>
          <li>• Trial Balance - Excel</li>
          <li>• Director&apos;s Loan Report - Excel</li>
        </ul>
        <p className="text-xs text-teal-800 mb-4">
          P&amp;L, Balance Sheet, Trial Balance, and BAS G1 use ledger-integrated figures (bank
          transactions + journal entries, including AR/AP accrual journals when enabled).
        </p>

        <h4 className="font-semibold text-gray-900 mb-2">BAS package</h4>
        <ul className="text-sm text-gray-700 space-y-1 mb-4">
          <li>• BAS Summary (ATO format: G1, 1A, 1B, 7C/1C) — same GST rules as Biz Intel</li>
          <li>• PAYG Withholding Summary</li>
        </ul>

        <h4 className="font-semibold text-gray-900 mb-2">Additional Documents</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Audit Trail (Transaction History Log)</li>
          <li>• Company Information: {companyName} / ABN: {abn}</li>
        </ul>
      </div>

      <button
        onClick={handleExportPackage}
        disabled={isGenerating || transactions.length === 0}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Package...
          </>
        ) : generated ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Package Generated!
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Export Compliance Package (ZIP)
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 mt-2 text-center">
        All reports include company header: {companyName} / ABN: {abn}
      </p>
    </div>
  )
}
