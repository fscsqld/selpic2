import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NotificationPreferences {
  orderConfirmations: boolean
  systemAlerts: boolean
  weeklyReports: boolean
  salesReports: boolean
  orderNotifications: boolean
}

interface AdminNotificationState {
  // 관리자별 알림 설정 (username을 key로 사용)
  adminPreferences: Record<string, NotificationPreferences>
  
  // 기본 알림 설정
  defaultPreferences: NotificationPreferences
  
  // 현재 관리자의 알림 설정 가져오기
  getPreferences: (username: string) => NotificationPreferences
  
  // 현재 관리자의 알림 설정 업데이트
  updatePreferences: (username: string, preferences: Partial<NotificationPreferences>) => void
  
  // 기본 설정으로 초기화
  resetToDefault: (username: string) => void
}

export const useAdminNotifications = create<AdminNotificationState>()(
  persist(
    (set, get) => ({
      // 기본 알림 설정
      defaultPreferences: {
        orderConfirmations: true,
        systemAlerts: true,
        weeklyReports: false,
        salesReports: true,
        orderNotifications: true
      },
      
      // 관리자별 알림 설정
      adminPreferences: {},
      
      // 현재 관리자의 알림 설정 가져오기
      getPreferences: (username: string) => {
        const state = get()
        // 해당 관리자의 설정이 있으면 반환, 없으면 기본 설정 반환
        return state.adminPreferences[username] || state.defaultPreferences
      },
      
      // 현재 관리자의 알림 설정 업데이트
      updatePreferences: (username: string, preferences: Partial<NotificationPreferences>) => {
        set((state) => {
          const currentPreferences = state.adminPreferences[username] || state.defaultPreferences
          return {
            adminPreferences: {
              ...state.adminPreferences,
              [username]: {
                ...currentPreferences,
                ...preferences
              }
            }
          }
        })
      },
      
      // 기본 설정으로 초기화
      resetToDefault: (username: string) => {
        set((state) => {
          const newPreferences = { ...state.adminPreferences }
          delete newPreferences[username]
          return {
            adminPreferences: newPreferences
          }
        })
      }
    }),
    {
      name: 'admin-notifications-store',
      version: 1
    }
  )
)

