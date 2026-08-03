'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  Cloud,
  Eye,
  FileText,
  Filter,
  History,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  DocumentSendLog,
  DocumentSendLogType,
  searchDocumentSendLogs,
  useDocumentSendLogStore,
} from '@/lib/documentSendLogStore'
import { syncDocumentSendLogsWithSupabase } from '@/lib/documentSendLogClient'

type Props = {
  /** When set, only show these types (Create & Send page uses invoice + quote). */
  typesFilter?: DocumentSendLogType[]
  onOpenInEditor?: (log: DocumentSendLog) => void
  onResend?: (log: DocumentSendLog) => void | Promise<void>
  resendingId?: string | null
}

function statusClass(status: DocumentSendLog['status']): string {
  if (status === 'sent') return 'bg-green-100 text-green-800'
  if (status === 'failed') return 'bg-red-100 text-red-800'
  return 'bg-yellow-100 text-yellow-800'
}

function typeLabel(type: DocumentSendLogType): string {
  switch (type) {
    case 'invoice':
      return 'Invoice'
    case 'quote':
      return 'Quote'
    case 'order_confirmation':
      return 'Order Confirmation'
    case 'shipping_notification':
      return 'Shipping Notification'
    case 'receipt':
      return 'Receipt'
    case 'contract':
      return 'Contract'
    default:
      return 'Other'
  }
}

export default function InvoiceQuoteSendHistoryPanel({
  typesFilter,
  onOpenInEditor,
  onResend,
  resendingId = null,
}: Props) {
  const logs = useDocumentSendLogStore((s) => s.logs)
  const removeSendLog = useDocumentSendLogStore((s) => s.removeSendLog)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentSendLogType>('all')
  const [selected, setSelected] = useState<DocumentSendLog | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncOk, setSyncOk] = useState<boolean | null>(null)

  const runSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncDocumentSendLogsWithSupabase()
      setSyncOk(result.ok)
      setSyncMessage(result.message || null)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    void runSync()
  }, [])

  const scopedLogs = useMemo(() => {
    if (!typesFilter || typesFilter.length === 0) return logs
    return logs.filter((log) => typesFilter.includes(log.documentType))
  }, [logs, typesFilter])

  const filtered = useMemo(
    () => searchDocumentSendLogs(scopedLogs, query, typeFilter),
    [scopedLogs, query, typeFilter]
  )

  const typeOptions: Array<'all' | DocumentSendLogType> = typesFilter?.length
    ? ['all', ...typesFilter]
    : ['all', 'invoice', 'quote', 'order_confirmation', 'shipping_notification', 'receipt', 'contract', 'other']

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <History className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Send History</h3>
              <p className="text-sm text-gray-600 mt-1">
                Verify what was sent, to whom, and when. History syncs to Supabase so all admins can review it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            Sync
          </button>
        </div>

        {syncMessage && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              syncOk
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {syncMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email, name, document number, subject…"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | DocumentSendLogType)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All types' : typeLabel(opt)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type / No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No send history yet. Sent invoices and quotes will appear here.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{typeLabel(log.documentType)}</div>
                      <div className="text-xs text-gray-500">{log.documentNumber || '—'}</div>
                      {log.resentFromId && (
                        <div className="text-xs text-amber-600 mt-0.5">Resend</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.recipientName}</div>
                      <div className="text-xs text-gray-500">{log.recipientEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{log.subject}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2 shrink-0" />
                        {new Date(log.sentAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">by {log.sentBy}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${statusClass(log.status)}`}>
                        {log.status}
                      </span>
                      {log.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 max-w-[10rem] truncate" title={log.errorMessage}>
                          {log.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(log)}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {onOpenInEditor && log.documentSnapshot && (
                          <button
                            type="button"
                            onClick={() => onOpenInEditor(log)}
                            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            <FileText className="w-4 h-4" />
                            Open
                          </button>
                        )}
                        {onResend && log.documentSnapshot && (
                          <button
                            type="button"
                            disabled={resendingId === log.id}
                            onClick={() => void onResend(log)}
                            className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {resendingId === log.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            Resend
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete this send history entry?\n\n${typeLabel(log.documentType)} ${log.documentNumber || ''}\n${log.recipientEmail}`
                              )
                            ) {
                              removeSendLog(log.id)
                              if (selected?.id === log.id) setSelected(null)
                            }
                          }}
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h4 className="text-lg font-semibold text-gray-900">Send details</h4>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-3 text-sm">
              <DetailRow label="Type" value={typeLabel(selected.documentType)} />
              <DetailRow label="Document number" value={selected.documentNumber || '—'} />
              <DetailRow label="Recipient name" value={selected.recipientName} />
              <DetailRow label="Recipient email" value={selected.recipientEmail} />
              <DetailRow label="Subject" value={selected.subject} />
              <DetailRow label="Sent at" value={new Date(selected.sentAt).toLocaleString()} />
              <DetailRow label="Sent by" value={selected.sentBy} />
              <DetailRow label="Status" value={selected.status} />
              <DetailRow label="Source" value={selected.source} />
              {selected.relatedOrderId && <DetailRow label="Related order" value={selected.relatedOrderId} />}
              {selected.resentFromId && <DetailRow label="Resent from" value={selected.resentFromId} />}
              {selected.errorMessage && <DetailRow label="Error" value={selected.errorMessage} />}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Message</div>
                <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 border p-3 text-gray-800 font-sans">
                  {selected.content || '(empty)'}
                </pre>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Snapshot</div>
                <p className="text-gray-600">
                  {selected.documentSnapshot
                    ? 'Document data is saved. Use Open or Resend to reload / send again.'
                    : 'No document snapshot stored for this entry.'}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex flex-wrap justify-end gap-2">
              {onOpenInEditor && selected.documentSnapshot && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenInEditor(selected)
                    setSelected(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Open in editor
                </button>
              )}
              {onResend && selected.documentSnapshot && (
                <button
                  type="button"
                  disabled={resendingId === selected.id}
                  onClick={() => void onResend(selected)}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Resend now
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-xs font-medium text-gray-500 uppercase col-span-1">{label}</div>
      <div className="text-gray-900 col-span-2 break-words">{value}</div>
    </div>
  )
}
