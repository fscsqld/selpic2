'use client'

import { useState, useEffect } from 'react'
import { History, User, Clock, Edit2, Trash2, Plus, FileText } from 'lucide-react'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface AuditTrailEntry {
  id: string
  transactionId: string
  action: 'created' | 'updated' | 'deleted' | 'category_changed' | 'department_changed'
  userId: string
  userName: string
  oldValue?: any
  newValue?: any
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

  useEffect(() => {
    loadAuditTrail()
  }, [transactionId, showAll])

  const loadAuditTrail = async () => {
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
  }

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
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No audit trail entries found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
        </div>
        {transactionId && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Transaction: {transactionId.substring(0, 20)}...
          </span>
        )}
      </div>

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
