'use client'

import { useState } from 'react'
import { Download, Upload, AlertCircle, CheckCircle, Loader2, Database, Trash2 } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

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

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setError(null)
      setSuccess(null)

      const data = await indexedDBStorage.exportAllData()
      
      // Create JSON file
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `selpic-accounting-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess('Data exported successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Failed to export data:', err)
      setError(err.message || 'Failed to export data')
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

      // Read file
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup file format')
      }

      // Confirm before importing
      const confirmed = window.confirm(
        '⚠️ Warning: This will replace all existing data. Are you sure you want to continue?'
      )

      if (!confirmed) {
        return
      }

      // Import data
      await indexedDBStorage.importAllData(data)

      setSuccess('Data imported successfully. Please refresh the page.')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      console.error('Failed to import data:', err)
      setError(err.message || 'Failed to import data')
    } finally {
      setIsImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleClearAllData = async () => {
    try {
      setIsClearing(true)
      setError(null)
      setSuccess(null)

      // Clear IndexedDB
      await indexedDBStorage.deleteAllStatements()
      await indexedDBStorage.deleteAllCashExpenses()
      
      // Clear localStorage (except API keys and director name for user convenience)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accounting_transactions')
        localStorage.removeItem('opening_director_loan_balance')
        // Note: We keep API keys and director name as they are user settings
      }

      // Call parent callback to clear transactions state
      if (onClearAllData) {
        onClearAllData()
      }

      setSuccess('All data cleared successfully. Page will reload...')
      setShowClearConfirm(false)
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      console.error('Failed to clear data:', err)
      setError(err.message || 'Failed to clear data')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Database className="w-6 h-6" />
        Data Backup & Restore
      </h2>

      <p className="text-sm text-gray-600 mb-4">
        The backup file includes all transaction history, cash expenses, receipts, business profile, and user settings.
        API keys are excluded from backups for security reasons.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Export (Backup)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Download all data as a JSON file.
          </p>
          <button
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
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
            Upload a backup file to restore data. All existing data will be replaced.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isExporting || isImporting}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 cursor-pointer ${
                isExporting || isImporting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
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
          <h3 className="text-lg font-semibold mb-2 text-red-600">Clear All Data</h3>
          <p className="text-sm text-gray-600 mb-3">
            Permanently delete all transactions, statements, and local storage data. This action cannot be undone.
            <strong className="text-red-600"> Make sure to export your data first!</strong>
          </p>
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing || isExporting || isImporting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800 mb-4">
                ⚠️ Are you absolutely sure? This will delete:
              </p>
              <ul className="text-xs text-red-700 mb-4 list-disc list-inside space-y-1">
                <li>All transaction history</li>
                <li>All uploaded statements</li>
                <li>All cash expenses</li>
                <li>All receipts</li>
                <li>Local storage data (transactions, opening balance)</li>
              </ul>
              <p className="text-xs text-red-700 mb-4 font-medium">
                API keys and director name will be preserved.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isClearing}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllData}
                  disabled={isClearing}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Yes, Clear Everything
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
