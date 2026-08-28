'use client'

import { useState, useEffect, useCallback } from 'react'
import { History, Clock, Edit2, Trash2, Plus, FileText, Loader2 } from 'lucide-react'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface AuditTrailEntry {
  id: string
  transactionId: string
  action: 'created' | 'updated' | 'deleted' | 'category_changed' | 'department_changed'
  userId: string
  userName: string
  oldValue?: unknown
  newValue?: unknown
  description?: string
  timestamp: string
}

interface AuditTrailViewProps {
  transactionId?: string
  showAll?: boolean
}

export function AuditTrailView({ transactionId, showAll = false }: AuditTrailViewProps) {
  const [auditEntries, setAuditEntries] = useState<AuditTrailEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [clearMessage, setClearMessage] = useState<string | null>(null)

  const loadAuditTrail = useCallback(async () => {
    try {
      setIsLoading(true)
      let entries: AuditTrailEntry[] = []

      if (transactionId) {
        entries = await indexedDBStorage.getAuditTrail(transactionId)
      } else if (showAll) {
        entries = await indexedDBStorage.getAllAuditTrails()
      }

      setAuditEntries(entries)
    } catch (err) {
      console.error('Failed to load audit trail:', err)
    } finally {
      setIsLoading(false)
    }
  }, [transactionId, showAll])

  const handleClearAll = async () => {
    if (!showAll || isClearing || auditEntries.length === 0) return

    const confirmed = window.confirm(
      [
        `Clear all ${auditEntries.length} audit trail ${auditEntries.length === 1 ? 'entry' : 'entries'}?`,
        '',
        'This removes modification history only. Bank statements, cash expenses, payroll, and P&L figures are not changed.',
        '',
        'This cannot be undone. Export a backup from Data Management first if you need a copy for compliance.',
      ].join('\n')
    )

    if (!confirmed) return

    setIsClearing(true)
    setClearMessage(null)
    try {
      await indexedDBStorage.init()
      const removed = await indexedDBStorage.clearAllAuditTrails()
      setAuditEntries([])
      setClearMessage(
        removed > 0
          ? `Cleared ${removed} audit ${removed === 1 ? 'entry' : 'entries'}. Ledger data was not changed.`
          : 'Audit trail is already empty.'
      )
    } catch (err) {
      console.error('Failed to clear audit trail:', err)
      alert('Failed to clear audit trail. Please try again.')
    } finally {
      setIsClearing(false)
    }
  }

  const headerActions = showAll ? (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
        {auditEntries.length} {auditEntries.length === 1 ? 'entry' : 'entries'}
      </span>
      {auditEntries.length > 0 && (
        <button
          type="button"
          onClick={() => void handleClearAll()}
          disabled={isClearing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-60 transition-colors"
          title="Remove all audit trail logs (ledger data is not changed)"
        >
          {isClearing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          {isClearing ? 'Clearing…' : 'Clear all audit entries'}
        </button>
      )}
    </div>
  ) : transactionId ? (
    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
      Transaction: {transactionId.substring(0, 20)}...
    </span>
  ) : null

  useEffect(() => {
    void loadAuditTrail()
  }, [loadAuditTrail])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-600" />
      case 'updated':
        return <Edit2 className="w-4 h-4 text-blue-600" />
      case 'deleted':
        return <Trash2 className="w-4 h-4 text-red-600" />
      case 'category_changed':
        return <FileText className="w-4 h-4 text-orange-600" />
      case 'department_changed':
        return <FileText className="w-4 h-4 text-purple-600" />
      default:
        return <History className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return 'Created'
      case 'updated':
        return 'Updated'
      case 'deleted':
        return 'Deleted'
      case 'category_changed':
        return 'Category Changed'
      case 'department_changed':
        return 'Department Changed'
      default:
        return action
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (auditEntries.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
          </div>
          {headerActions}
        </div>
        {clearMessage && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            {clearMessage}
          </p>
        )}
        {showAll && (
          <p className="text-sm text-gray-600 mb-4">
            Modification history for categories, departments, dates, amounts, and period locks.
            Clearing entries does not change your ledger — use Data Management to export a backup
            before cleanup if you need a compliance copy.
          </p>
        )}
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No audit trail entries found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
        </div>
        {headerActions}
      </div>

      {clearMessage && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md p-3 mb-4">
          {clearMessage}
        </p>
      )}

      {showAll && (
        <p className="text-sm text-gray-600 mb-4">
          Modification history only — bank statements, cash, payroll, and P&L are unchanged when you
          clear entries here.
        </p>
      )}

      <div className="space-y-3">
        {auditEntries.map((entry) => (
          <div key={entry.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getActionIcon(entry.action)}
                  <span className="font-semibold text-gray-900">
                    {getActionLabel(entry.action)}
                  </span>
                  <span className="text-xs text-gray-500">
                    by {entry.userName || entry.userId || 'System'}
                  </span>
                </div>

                {entry.description && (
                  <p className="text-sm text-gray-700 mb-2">{entry.description}</p>
                )}

                {(entry.oldValue !== undefined || entry.newValue !== undefined) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {entry.oldValue !== undefined && (
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-red-700 font-medium mb-1">Old Value:</p>
                        <p className="text-red-600">{formatValue(entry.oldValue)}</p>
                      </div>
                    )}
                    {entry.newValue !== undefined && (
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-green-700 font-medium mb-1">New Value:</p>
                        <p className="text-green-600">{formatValue(entry.newValue)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateAustralian(entry.timestamp)}</span>
                  </div>
                  {!transactionId && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span className="font-mono">{entry.transactionId.substring(0, 12)}...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
