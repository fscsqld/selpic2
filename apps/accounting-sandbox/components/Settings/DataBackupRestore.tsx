'use client'

import { useState } from 'react'
import { Download, Upload, AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  analyzeBackupPayload,
  formatBackupFilename,
  validateBackupPayload,
  BACKUP_SCHEMA_VERSION,
} from '@/lib/storage/backup-schema'

interface DataBackupRestoreProps {
  onClearAllData?: () => void
}

export function DataBackupRestore({ onClearAllData }: DataBackupRestoreProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importWarnings, setImportWarnings] = useState<string[]>([])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setError(null)
      setSuccess(null)
      setImportWarnings([])

      const data = await indexedDBStorage.exportAllData()
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = formatBackupFilename()
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess(`Backup downloaded (schema v${BACKUP_SCHEMA_VERSION}).`)
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: unknown) {
      console.error('Failed to export data:', err)
      setError(err instanceof Error ? err.message : 'Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      setError(null)
      setSuccess(null)
      setImportWarnings([])

      const text = await file.text()
      const data = JSON.parse(text)
      validateBackupPayload(data)

      const analysis = analyzeBackupPayload(data)
      if (analysis.warnings.length > 0) {
        setImportWarnings(analysis.warnings)
      }

      const confirmed = window.confirm(
        [
          'This will REPLACE all ledger data in this browser (statements, cash, periods, payroll, journals, bank recon, lodgment worksheets).',
          analysis.isLegacy
            ? `Legacy backup detected (${analysis.label}). Some fields may be missing.`
            : analysis.label,
          'API keys and director name are kept. Continue?',
        ].join('\n\n')
      )

      if (!confirmed) {
        return
      }

      // Must wipe first — otherwise restore merges and doubles the ledger
      await indexedDBStorage.importAllData(data, { replaceExisting: true })

      setSuccess('Backup restored. Reloading…')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: unknown) {
      console.error('Failed to import data:', err)
      setError(err instanceof Error ? err.message : 'Failed to import data')
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const handleClearAllData = async () => {
    try {
      setIsClearing(true)
      setError(null)
      setSuccess(null)
      setImportWarnings([])

      await indexedDBStorage.wipeAllAccountingData()
      onClearAllData?.()

      setSuccess('All ledger data cleared. Reloading…')
      setShowClearConfirm(false)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: unknown) {
      console.error('Failed to clear data:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear data')
    } finally {
      setIsClearing(false)
    }
  }

  const busy = isExporting || isImporting || isClearing

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Full JSON backup of this browser&apos;s accounting database (statements, cash expenses,
        periods, payroll, journals, bank reconciliation, lodgment worksheets, and related settings).
        API keys are never written into backup files. To delete only uploaded bank statements, use{' '}
        <strong>History → Clear All History</strong>.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {importWarnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm">
          <p className="font-medium mb-1">Backup notes</p>
          <ul className="list-disc list-inside space-y-1">
            {importWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-2">Export (Backup)</h3>
        <p className="text-sm text-gray-600 mb-3">
          Download a restore file before clearing data or switching browsers.
        </p>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={busy}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Backup
            </>
          )}
        </button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-semibold mb-2">Import (Restore)</h3>
        <p className="text-sm text-gray-600 mb-3">
          Upload a backup JSON. Existing ledger data is wiped first, then replaced (not merged).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => void handleImport(e)}
            disabled={busy}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className={`px-4 py-2 rounded-md transition-colors inline-flex items-center gap-2 ${
              busy ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
            }`}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Backup
              </>
            )}
          </label>
        </div>
      </div>

      <div className="border-t border-red-200 pt-4">
        <h3 className="text-lg font-semibold mb-2 text-red-700">Clear all ledger data</h3>
        <p className="text-sm text-gray-600 mb-3">
          Permanently deletes the same stores a restore wipe uses: statements, cash, periods, HR/payroll,
          journals, bank recon, receipts, and lodgment progress. Business profile and API keys are kept.
          <strong className="text-red-700"> Export a backup first.</strong>
        </p>
        {!showClearConfirm ? (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            disabled={busy}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Ledger Data
          </button>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-800 mb-3">
              This cannot be undone. Confirm wipe of all ledger data in this browser?
            </p>
            <ul className="text-xs text-red-700 mb-4 list-disc list-inside space-y-1">
              <li>Bank statements and cash expenses</li>
              <li>Periods, director loan carry-forward, bank reconciliations</li>
              <li>Employees, payslips, timesheets, leave, attendance</li>
              <li>Journals, AR/AP, receipts, lodgment worksheets</li>
            </ul>
            <p className="text-xs text-red-700 mb-4">
              Kept: API keys, director name, business profile. Statement-only delete remains on History.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleClearAllData()}
                disabled={isClearing}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 inline-flex items-center gap-2"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Clearing…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Yes, wipe ledger
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
