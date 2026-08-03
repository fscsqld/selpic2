import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DocumentSendLogType =
  | 'invoice'
  | 'quote'
  | 'order_confirmation'
  | 'shipping_notification'
  | 'receipt'
  | 'contract'
  | 'other'

export type DocumentSendLogSource = 'create_send' | 'documents' | 'other'

export interface DocumentSendLog {
  id: string
  documentType: DocumentSendLogType
  documentNumber?: string
  recipientEmail: string
  recipientName: string
  subject: string
  content: string
  sentAt: string
  sentBy: string
  status: 'sent' | 'failed' | 'pending'
  relatedOrderId?: string
  source: DocumentSendLogSource
  /** Snapshot used to reload invoice/quote into the editor for verification / resend */
  documentSnapshot?: Record<string, unknown>
  errorMessage?: string
  resentFromId?: string
}

interface DocumentSendLogStore {
  logs: DocumentSendLog[]
  addSendLog: (entry: Omit<DocumentSendLog, 'id' | 'sentAt'> & { id?: string; sentAt?: string }) => DocumentSendLog
  removeSendLog: (id: string) => void
  clearSendLogs: () => void
  replaceLogs: (logs: DocumentSendLog[]) => void
  getLogById: (id: string) => DocumentSendLog | undefined
}

const MAX_LOGS = 300

function createLogId(): string {
  return `doc-send-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function persistLogToSupabase(log: DocumentSendLog): void {
  if (typeof window === 'undefined') return
  void import('@/lib/documentSendLogClient')
    .then(({ upsertDocumentSendLogToApi }) => upsertDocumentSendLogToApi(log))
    .then((result) => {
      if (!result.ok) {
        console.warn('[documentSendLog] Supabase upsert failed:', result.error)
      }
    })
    .catch((e) => {
      console.warn('[documentSendLog] Supabase upsert error:', e)
    })
}

function deleteLogFromSupabase(id: string): void {
  if (typeof window === 'undefined') return
  void import('@/lib/documentSendLogClient')
    .then(({ deleteDocumentSendLogFromApi }) => deleteDocumentSendLogFromApi(id))
    .then((result) => {
      if (!result.ok) {
        console.warn('[documentSendLog] Supabase delete failed:', result.error)
      }
    })
    .catch((e) => {
      console.warn('[documentSendLog] Supabase delete error:', e)
    })
}

export const useDocumentSendLogStore = create<DocumentSendLogStore>()(
  persist(
    (set, get) => ({
      logs: [],

      addSendLog: (entry) => {
        const log: DocumentSendLog = {
          ...entry,
          id: entry.id || createLogId(),
          sentAt: entry.sentAt || new Date().toISOString(),
        }
        set((state) => ({
          logs: [log, ...state.logs].slice(0, MAX_LOGS),
        }))
        persistLogToSupabase(log)
        return log
      },

      removeSendLog: (id) => {
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== id),
        }))
        deleteLogFromSupabase(id)
      },

      clearSendLogs: () => set({ logs: [] }),

      replaceLogs: (logs) => {
        set({
          logs: [...logs]
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
            .slice(0, MAX_LOGS),
        })
      },

      getLogById: (id) => get().logs.find((log) => log.id === id),
    }),
    {
      name: 'document-send-log-store',
      version: 2,
      partialize: (state) => ({ logs: state.logs }),
    }
  )
)

export function searchDocumentSendLogs(
  logs: DocumentSendLog[],
  query: string,
  documentType: 'all' | DocumentSendLogType = 'all'
): DocumentSendLog[] {
  const q = query.trim().toLowerCase()
  return logs
    .filter((log) => (documentType === 'all' ? true : log.documentType === documentType))
    .filter((log) => {
      if (!q) return true
      return (
        log.recipientEmail.toLowerCase().includes(q) ||
        log.recipientName.toLowerCase().includes(q) ||
        log.subject.toLowerCase().includes(q) ||
        (log.documentNumber || '').toLowerCase().includes(q) ||
        (log.relatedOrderId || '').toLowerCase().includes(q) ||
        log.sentBy.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
}
