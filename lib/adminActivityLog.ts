import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Staff account events + operational storefront changes (super-admin audit). */
export type ActivityLogAction =
  | 'login'
  | 'logout'
  | 'password_changed'
  | 'permissions_updated'
  | 'status_toggled'
  | 'admin_created'
  | 'admin_deleted'
  | 'profile_updated'
  | 'username_changed'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'product_stock_adjusted'
  | 'cms_content_created'
  | 'cms_content_updated'
  | 'cms_content_deleted'
  | 'promo_code_created'
  | 'promo_code_updated'
  | 'promo_code_deleted'
  | 'media_uploaded'
  | 'media_deleted'

export interface ActivityLog {
  id: string
  timestamp: string
  action: ActivityLogAction
  performedBy: string
  /** Staff username OR operational target id (product/content/media). */
  targetAdmin?: string
  ipAddress?: string
  userAgent?: string
  details?: {
    field?: string
    oldValue?: unknown
    newValue?: unknown
    description?: string
  }
}

interface AdminActivityLogState {
  logs: ActivityLog[]
  addLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>, opts?: { skipRemote?: boolean }) => void
  mergeRemoteLogs: (remote: ActivityLog[]) => number
  getLogsByAdmin: (username: string) => ActivityLog[]
  getLogsByAction: (action: ActivityLog['action']) => ActivityLog[]
  getRecentLogs: (limit?: number) => ActivityLog[]
  clearLogs: () => void
  deleteLog: (logId: string) => void
  deleteLogsByDate: (beforeDate: Date) => void
  getClientIP: () => Promise<string>
  getUserAgent: () => string
}

const KNOWN_ACTIONS = new Set<string>([
  'login',
  'logout',
  'password_changed',
  'permissions_updated',
  'status_toggled',
  'admin_created',
  'admin_deleted',
  'profile_updated',
  'username_changed',
  'product_created',
  'product_updated',
  'product_deleted',
  'product_stock_adjusted',
  'cms_content_created',
  'cms_content_updated',
  'cms_content_deleted',
  'promo_code_created',
  'promo_code_updated',
  'promo_code_deleted',
  'media_uploaded',
  'media_deleted',
])

function normalizeRemoteLog(raw: unknown): ActivityLog | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id.trim() : ''
  const action = typeof r.action === 'string' ? r.action.trim() : ''
  const performedBy = typeof r.performedBy === 'string' ? r.performedBy.trim() : ''
  const timestamp = typeof r.timestamp === 'string' ? r.timestamp : ''
  if (!id || !KNOWN_ACTIONS.has(action) || !performedBy || !timestamp) return null
  return {
    id,
    action: action as ActivityLogAction,
    performedBy,
    timestamp,
    targetAdmin: typeof r.targetAdmin === 'string' ? r.targetAdmin : undefined,
    ipAddress: typeof r.ipAddress === 'string' ? r.ipAddress : undefined,
    userAgent: typeof r.userAgent === 'string' ? r.userAgent : undefined,
    details:
      r.details && typeof r.details === 'object' && !Array.isArray(r.details)
        ? (r.details as ActivityLog['details'])
        : undefined,
  }
}

export const useAdminActivityLog = create<AdminActivityLogState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (logData, opts) => {
        const log: ActivityLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          ...logData,
        }

        set((state) => ({
          logs: [log, ...state.logs].slice(0, 10000),
        }))

        if (typeof window !== 'undefined' && !opts?.skipRemote) {
          void import('@/lib/logAdminActivity').then(({ syncActivityLogToServer }) => {
            void syncActivityLogToServer(log)
          })
        }
      },

      mergeRemoteLogs: (remote) => {
        const normalized = remote.map(normalizeRemoteLog).filter(Boolean) as ActivityLog[]
        if (!normalized.length) return 0

        const existing = get().logs
        const byId = new Map(existing.map((l) => [l.id, l]))
        let added = 0
        for (const row of normalized) {
          if (!byId.has(row.id)) {
            byId.set(row.id, row)
            added += 1
          }
        }
        if (added === 0) return 0

        const merged = Array.from(byId.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        set({ logs: merged.slice(0, 10000) })
        return added
      },

      getLogsByAdmin: (username) => {
        return get().logs.filter(
          (log) => log.performedBy === username || log.targetAdmin === username
        )
      },

      getLogsByAction: (action) => {
        return get().logs.filter((log) => log.action === action)
      },

      getRecentLogs: (limit = 100) => {
        return get().logs.slice(0, limit)
      },

      clearLogs: () => {
        set({ logs: [] })
      },

      deleteLog: (logId: string) => {
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== logId),
        }))
      },

      deleteLogsByDate: (beforeDate: Date) => {
        set((state) => ({
          logs: state.logs.filter((log) => new Date(log.timestamp) >= beforeDate),
        }))
      },

      getClientIP: async () => {
        try {
          const storedIP = localStorage.getItem('admin-client-ip')
          if (storedIP) return storedIP
          return 'Unknown'
        } catch {
          return 'Unknown'
        }
      },

      getUserAgent: () => {
        if (typeof window === 'undefined') return 'Unknown'
        return navigator.userAgent || 'Unknown'
      },
    }),
    {
      name: 'admin-activity-log-store',
      version: 2,
      migrate: (persistedState, fromVersion) => {
        // v1 → v2: same persisted shape; action union widened for operational audits.
        const state = (persistedState || {}) as { logs?: unknown }
        const logs = Array.isArray(state.logs)
          ? state.logs.filter((row) => normalizeRemoteLog(row) != null)
          : []
        if (fromVersion < 2 && typeof console !== 'undefined') {
          console.info(
            `[admin-activity-log] migrated persist store v${fromVersion} → v2 (${logs.length} logs kept)`
          )
        }
        return { logs } as AdminActivityLogState
      },
    }
  )
)
