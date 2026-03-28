'use client'

import { useState } from 'react'
import { Download, FileText, Package, Loader2, CheckCircle } from 'lucide-react'
import { generateCompliancePackage, CompliancePackageData } from '@/lib/compliance-reporting/compliance-package'
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
    isDirectorsLoan?: boolean
    isPayrollTransaction?: boolean
    requiresPAYG?: boolean
    gstInfo?: {
      hasGST: boolean
      gstAmount?: number
    }
  }>
  openingDirectorLoanBalance: number
  companyName: string
  abn: string
  acn?: string
  periodStart?: string
  periodEnd?: string
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

  // Get current financial year
  const getFinancialYear = () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    
    if (month >= 7) {
      return {
        start: `${year}-07-01`,
        end: `${year + 1}-06-30`,
      }
    } else {
      return {
        start: `${year - 1}-07-01`,
        end: `${year}-06-30`,
      }
    }
  }

  const handleExportPackage = async () => {
    setIsGenerating(true)
    setGenerated(false)

    try {
      const financialYear = getFinancialYear()
      
      const packageData: CompliancePackageData = {
        transactions,
        openingDirectorLoanBalance,
        companyName,
        abn,
        acn,
        financialYear,
        periodStart,
        periodEnd,
      }

      // Generate all reports
      const { financialStatements, trialBalance, directorsLoanReport, basPackage, auditTrail } = 
        await generateCompliancePackage(packageData)

      // Create ZIP file
      const zip = new JSZip()

      // Convert workbooks to binary strings and add to ZIP
      const financialStatementsBuffer = XLSX.write(financialStatements, { type: 'array', bookType: 'xlsx' })
      zip.file('Financial_Statements.xlsx', financialStatementsBuffer)

      const trialBalanceBuffer = XLSX.write(trialBalance, { type: 'array', bookType: 'xlsx' })
      zip.file('Trial_Balance.xlsx', trialBalanceBuffer)

      const directorsLoanBuffer = XLSX.write(directorsLoanReport, { type: 'array', bookType: 'xlsx' })
      zip.file('Directors_Loan_Report.xlsx', directorsLoanBuffer)

      const basPackageBuffer = XLSX.write(basPackage, { type: 'array', bookType: 'xlsx' })
      zip.file('BAS_Package.xlsx', basPackageBuffer)

      // Add Audit Trail as JSON with header
      const auditTrailWithHeader = {
        companyName,
        abn,
        generatedAt: new Date().toISOString(),
        totalEntries: auditTrail.length,
        entries: auditTrail,
      }
      const auditTrailJson = JSON.stringify(auditTrailWithHeader, null, 2)
      zip.file('Audit_Trail.json', auditTrailJson)

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      // Download
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Accountant_Pack_FY${financialYear.start.split('-')[0]}-${financialYear.end.split('-')[0]}.zip`
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
        <h4 className="font-semibold text-gray-900 mb-2">Annual Tax Package</h4>
        <ul className="text-sm text-gray-700 space-y-1 mb-4">
          <li>• Financial Statements (P&L + Balance Sheet) - Excel</li>
          <li>• Trial Balance - Excel</li>
          <li>• Director's Loan Report - Excel</li>
        </ul>

        <h4 className="font-semibold text-gray-900 mb-2">Quarterly BAS Package</h4>
        <ul className="text-sm text-gray-700 space-y-1 mb-4">
          <li>• BAS Summary (ATO format: G1, 1A, 1B, 1C)</li>
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
