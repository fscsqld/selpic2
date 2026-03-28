import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ActivityLog {
  id: string
  timestamp: string
  action: 
    | 'login' 
    | 'logout' 
    | 'password_changed' 
    | 'permissions_updated' 
    | 'status_toggled' 
    | 'admin_created' 
    | 'admin_deleted'
    | 'profile_updated'
    | 'username_changed'
  performedBy: string // Admin username
  targetAdmin?: string // Target admin username (for actions on other admins)
  ipAddress?: string
  userAgent?: string
  details?: {
    field?: string
    oldValue?: any
    newValue?: any
    description?: string
  }
}

interface AdminActivityLogState {
  logs: ActivityLog[]
  addLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void
  getLogsByAdmin: (username: string) => ActivityLog[]
  getLogsByAction: (action: ActivityLog['action']) => ActivityLog[]
  getRecentLogs: (limit?: number) => ActivityLog[]
  clearLogs: () => void
  deleteLog: (logId: string) => void
  deleteLogsByDate: (beforeDate: Date) => void
  getClientIP: () => Promise<string>
  getUserAgent: () => string
}

export const useAdminActivityLog = create<AdminActivityLogState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (logData) => {
        const log: ActivityLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          ...logData
        }
        
        set((state) => ({
          logs: [log, ...state.logs].slice(0, 10000) // Keep last 10,000 logs
        }))
      },

      getLogsByAdmin: (username) => {
        return get().logs.filter(log => 
          log.performedBy === username || log.targetAdmin === username
        )
      },

      getLogsByAction: (action) => {
        return get().logs.filter(log => log.action === action)
      },

      getRecentLogs: (limit = 100) => {
        return get().logs.slice(0, limit)
      },

      clearLogs: () => {
        set({ logs: [] })
      },

      deleteLog: (logId: string) => {
        set((state) => ({
          logs: state.logs.filter(log => log.id !== logId)
        }))
      },

      deleteLogsByDate: (beforeDate: Date) => {
        set((state) => ({
          logs: state.logs.filter(log => new Date(log.timestamp) >= beforeDate)
        }))
      },

      getClientIP: async () => {
        // Try to get IP from various sources
        try {
          // In a real application, this would come from the server
          // For now, we'll use a placeholder
          const storedIP = localStorage.getItem('admin-client-ip')
          if (storedIP) return storedIP
          
          // Try to get from a service (for demo purposes)
          // In production, this should come from the server
          return 'Unknown'
        } catch (error) {
          return 'Unknown'
        }
      },

      getUserAgent: () => {
        if (typeof window === 'undefined') return 'Unknown'
        return navigator.userAgent || 'Unknown'
      }
    }),
    {
      name: 'admin-activity-log-store',
      version: 1
    }
  )
)

