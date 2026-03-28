import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SalesGoal {
  id: 'daily' | 'weekly' | 'monthly' | 'yearly'
  targetRevenue: number
  targetOrders?: number
  enabled: boolean
  updatedAt: string
}

export interface SalesAlert {
  id: string
  type: 'goal_achievement' | 'goal_under_80' | 'revenue_drop' | 'zero_revenue'
  enabled: boolean
  threshold?: number // percentage or amount
  recipients: 'super_admin' | 'all_admins' | string[] // admin usernames
  methods: ('email' | 'dashboard_badge' | 'browser')[]
}

export interface SalesNotification {
  id: string
  type: 'goal_achieved' | 'goal_under_80' | 'revenue_drop' | 'zero_revenue'
  title: string
  message: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  goalId?: string
  currentRevenue: number
  targetRevenue: number
  percentage: number
  timestamp: string
  isRead: boolean
  readAt?: string
}

export interface ReportSchedule {
  id: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
  day?: number // 1-7 for weekly (1=Monday), 1-31 for monthly
  time: string // HH:MM format
  format: ('pdf' | 'excel' | 'csv')[]
  recipients: string[] // email addresses
  includeCharts: boolean
  includeDetails: boolean
}

interface SalesGoalsState {
  goals: SalesGoal[]
  alerts: SalesAlert[]
  reportSchedules: ReportSchedule[]
  notifications: SalesNotification[]
  
  // Goals
  setGoal: (goal: SalesGoal) => void
  getGoal: (id: SalesGoal['id']) => SalesGoal | undefined
  toggleGoal: (id: SalesGoal['id']) => void
  
  // Alerts
  setAlert: (alert: SalesAlert) => void
  getAlert: (id: string) => SalesAlert | undefined
  toggleAlert: (id: string) => void
  
  // Report Schedules
  setReportSchedule: (schedule: ReportSchedule) => void
  getReportSchedule: (id: ReportSchedule['id']) => ReportSchedule | undefined
  toggleReportSchedule: (id: ReportSchedule['id']) => void
  
  // Notifications
  addNotification: (notification: Omit<SalesNotification, 'id' | 'timestamp' | 'isRead'>) => void
  markNotificationAsRead: (id: string) => void
  markAllNotificationsAsRead: () => void
  deleteNotification: (id: string) => void
  clearAllNotifications: () => void
  getUnreadNotifications: () => SalesNotification[]
  getUnreadCount: () => number
}

const defaultGoals: SalesGoal[] = [
  { id: 'daily', targetRevenue: 0, enabled: false, updatedAt: new Date().toISOString() },
  { id: 'weekly', targetRevenue: 0, enabled: false, updatedAt: new Date().toISOString() },
  { id: 'monthly', targetRevenue: 0, enabled: false, updatedAt: new Date().toISOString() },
  { id: 'yearly', targetRevenue: 0, enabled: false, updatedAt: new Date().toISOString() }
]

const defaultAlerts: SalesAlert[] = [
  {
    id: 'goal_achievement',
    type: 'goal_achievement',
    enabled: false,
    threshold: 100, // 100% achievement
    recipients: 'super_admin',
    methods: ['email', 'dashboard_badge', 'browser']
  },
  {
    id: 'goal_under_80',
    type: 'goal_under_80',
    enabled: false,
    threshold: 80,
    recipients: 'super_admin',
    methods: ['email', 'dashboard_badge']
  },
  {
    id: 'revenue_drop',
    type: 'revenue_drop',
    enabled: false,
    threshold: 20, // 20% drop
    recipients: 'super_admin',
    methods: ['email']
  },
  {
    id: 'zero_revenue',
    type: 'zero_revenue',
    enabled: false,
    recipients: 'super_admin',
    methods: ['dashboard_badge', 'browser']
  }
]

const defaultReportSchedules: ReportSchedule[] = [
  {
    id: 'daily',
    enabled: false,
    time: '09:00',
    format: ['pdf'],
    recipients: [],
    includeCharts: true,
    includeDetails: false
  },
  {
    id: 'weekly',
    enabled: false,
    day: 1, // Monday
    time: '09:00',
    format: ['pdf', 'excel'],
    recipients: [],
    includeCharts: true,
    includeDetails: true
  },
  {
    id: 'monthly',
    enabled: false,
    day: 1, // 1st of month
    time: '09:00',
    format: ['pdf', 'excel'],
    recipients: [],
    includeCharts: true,
    includeDetails: true
  }
]

export const useSalesGoals = create<SalesGoalsState>()(
  persist(
    (set, get) => ({
      goals: defaultGoals,
      alerts: defaultAlerts,
      reportSchedules: defaultReportSchedules,
      
      setGoal: (goal) => {
        set((state) => ({
          goals: state.goals.map((g) => 
            g.id === goal.id 
              ? { ...goal, updatedAt: new Date().toISOString() }
              : g
          )
        }))
      },
      
      getGoal: (id) => {
        return get().goals.find((g) => g.id === id)
      },
      
      toggleGoal: (id) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, enabled: !g.enabled } : g
          )
        }))
      },
      
      setAlert: (alert) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alert.id ? alert : a
          )
        }))
      },
      
      getAlert: (id) => {
        return get().alerts.find((a) => a.id === id)
      },
      
      toggleAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
          )
        }))
      },
      
      setReportSchedule: (schedule) => {
        set((state) => ({
          reportSchedules: state.reportSchedules.map((s) =>
            s.id === schedule.id ? schedule : s
          )
        }))
      },
      
      getReportSchedule: (id) => {
        return get().reportSchedules.find((s) => s.id === id)
      },
      
      toggleReportSchedule: (id) => {
        set((state) => ({
          reportSchedules: state.reportSchedules.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
          )
        }))
      },
      
      // Notifications
      addNotification: (notificationData) => {
        const notification: SalesNotification = {
          ...notificationData,
          id: `sales-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          isRead: false
        }
        set((state) => ({
          notifications: [notification, ...(state.notifications || [])].slice(0, 100) // Keep last 100 notifications
        }))
      },
      
      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: (state.notifications || []).map((n) =>
            n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        }))
      },
      
      markAllNotificationsAsRead: () => {
        set((state) => ({
          notifications: (state.notifications || []).map((n) => ({
            ...n,
            isRead: true,
            readAt: n.readAt || new Date().toISOString()
          }))
        }))
      },
      
      deleteNotification: (id) => {
        set((state) => ({
          notifications: (state.notifications || []).filter((n) => n.id !== id)
        }))
      },
      
      clearAllNotifications: () => {
        set({ notifications: [] })
      },
      
      getUnreadNotifications: () => {
        const state = get()
        return (state.notifications || []).filter((n) => !n.isRead)
      },
      
      getUnreadCount: () => {
        const state = get()
        return (state.notifications || []).filter((n) => !n.isRead).length
      }
    }),
    {
      name: 'sales-goals-store',
      partialize: (state) => ({
        goals: state.goals,
        alerts: state.alerts,
        reportSchedules: state.reportSchedules,
        notifications: state.notifications || []
      })
    }
  )
)

