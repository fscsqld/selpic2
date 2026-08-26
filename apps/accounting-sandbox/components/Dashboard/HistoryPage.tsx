'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { formatDateObjectAustralian } from '@/lib/utils/date-format'
import { isRecoveredCacheStatement } from '@/lib/storage/recovered-statement'
import { LedgerDateAuditPanel } from '@/components/Dashboard/LedgerDateAuditPanel'

export interface HistoryPageProps {
  statementHistory: any[]
  storageSize: number
  formatStorageSize: (bytes: number) => string
  onLoadStatement: (id: string) => void
  onDeleteStatement: (id: string) => Promise<void>
  onDeleteAllStatements: () => Promise<void>
  showDeleteConfirm: string | null
  setShowDeleteConfirm: (id: string | null) => void
  onReloadHistory: () => Promise<void>
  /** IndexedDB read failure — empty list is not the same as “no statements”. */
  historyLoadError?: string | null
  /** Browser/local cache txs when IndexedDB History is empty — enables Recover. */
  unsavedCacheTransactionCount?: number
  onRecoverFromBrowserCache?: () => Promise<void>
}

export function HistoryPage({
  statementHistory,
  storageSize,
  formatStorageSize,
  onLoadStatement,
  onDeleteStatement,
  onDeleteAllStatements,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onReloadHistory,
  historyLoadError = null,
  unsavedCacheTransactionCount = 0,
  onRecoverFromBrowserCache,
}: HistoryPageProps) {
  const [recovering, setRecovering] = useState(false)

  const handleDelete = async (id: string) => {
    try {
      await onDeleteStatement(id)
      await onReloadHistory()
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete statement:', err)
    }
  }

  const handleRecover = async () => {
    if (!onRecoverFromBrowserCache || recovering) return
    setRecovering(true)
    try {
      await onRecoverFromBrowserCache()
    } finally {
      setRecovering(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Statement History</h2>
          {statementHistory.length > 0 && (
            <button
              type="button"
              onClick={onDeleteAllStatements}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
              title="Delete all saved statements. Export a JSON backup from Settings → Data Management first."
            >
              <Trash2 className="w-4 h-4" />
              Clear All History
            </button>
          )}
        </div>

        {storageSize > 4 * 1024 * 1024 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Storage Usage: {formatStorageSize(storageSize)}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                History is large. Export a JSON backup from Settings → Data Management, then clear old
                statements here if needed.
              </p>
            </div>
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Data Storage:</strong> Your history is stored in <strong>IndexedDB</strong> (browser storage).
            Data persists across page refreshes but can be cleared by browser settings.
          </p>
          <p className="text-xs text-blue-700 mt-2">
            <strong>Important:</strong> Before clearing history, download a JSON backup from Settings →
            Data Management (not only Excel reports).
            History is local to this browser only — another device or user profile will not see these statements.
          </p>
        </div>

        {historyLoadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{historyLoadError}</p>
              <p className="text-xs text-red-700 mt-1">
                This is a storage read failure, not proof that statements were deleted. Try Refresh, then re-open
                History. If it persists, export a backup from Settings before clearing site data.
              </p>
              <button
                type="button"
                onClick={() => void onReloadHistory()}
                className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Retry load
              </button>
            </div>
          </div>
        )}

        {statementHistory.length === 0 && unsavedCacheTransactionCount > 0 && onRecoverFromBrowserCache && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-md">
            <p className="text-sm font-medium text-amber-900">
              Browser cache has {unsavedCacheTransactionCount} transaction
              {unsavedCacheTransactionCount === 1 ? '' : 's'}, but Statement History is empty.
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Use Recover to save that cache into History without re-uploading. Prefer this only when
              the original PDF/CSV rows are missing from IndexedDB — not when a real statement is
              already listed (that doubles the ledger).
            </p>
            <button
              type="button"
              onClick={() => void handleRecover()}
              disabled={recovering}
              className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-60 text-sm font-medium"
            >
              {recovering ? 'Recovering…' : 'Recover to Statement History'}
            </button>
          </div>
        )}

        {statementHistory.length === 0 ? (
          <div className="space-y-2">
            <p className="text-gray-500">No saved statements found.</p>
            <p className="text-sm text-gray-500">
              Upload bank PDF/CSV from the <strong>Biz Intel</strong> tab. History only lists
              statements already saved in this browser — it does not upload files itself.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Records
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statementHistory.map((stmt) => (
                  <tr key={stmt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateObjectAustralian(new Date(stmt.uploadedAt))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{stmt.fileName}</div>
                      {stmt.accountNumber && (
                        <div className="text-xs text-gray-500">Account: {stmt.accountNumber}</div>
                      )}
                      {isRecoveredCacheStatement(stmt) && (
                        <div className="text-xs text-amber-700 mt-1">
                          Cache recovery — prefer a real PDF/CSV upload; delete this row if a bank file is also listed.
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stmt.bankName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {stmt.transactions?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onLoadStatement(stmt.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                          title="Load this statement"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteConfirm(stmt.id)
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          title="Delete this statement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this statement and all its transactions? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <LedgerDateAuditPanel />
    </div>
  )
}
