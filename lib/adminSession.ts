import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AdminSession {
  id: string
  username: string
  role: 'admin' | 'super_admin'
  loginTime: string
  lastActivity: string
  ipAddress?: string
  userAgent?: string
  isActive: boolean
}

interface AdminSessionState {
  sessions: AdminSession[]
  currentSessionId: string | null
  sessionTimeout: number // milliseconds, 0 = disabled
  maxSessionsPerUser: number // 0 = unlimited
  
  // Session management
  createSession: (username: string, role: 'admin' | 'super_admin', ipAddress?: string, userAgent?: string) => string
  updateActivity: (sessionId: string) => void
  endSession: (sessionId: string) => void
  endAllSessionsForUser: (username: string) => void
  endAllSessions: () => void
  getActiveSessions: () => AdminSession[]
  getSessionsByUser: (username: string) => AdminSession[]
  isSessionValid: (sessionId: string) => boolean
  cleanupExpiredSessions: () => void
  
  // Settings
  setSessionTimeout: (timeout: number) => void
  setMaxSessionsPerUser: (max: number) => void
}

export const useAdminSession = create<AdminSessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      sessionTimeout: 60 * 60 * 1000, // Default: 60 minutes (3600000ms)
      maxSessionsPerUser: 0, // Default: unlimited

      createSession: (username, role, ipAddress, userAgent) => {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const now = new Date().toISOString()
        
        const session: AdminSession = {
          id: sessionId,
          username,
          role,
          loginTime: now,
          lastActivity: now,
          ipAddress,
          userAgent,
          isActive: true
        }

        set((state) => {
          // Check max sessions per user
          if (state.maxSessionsPerUser > 0) {
            const userSessions = state.sessions.filter(s => s.username === username && s.isActive)
            if (userSessions.length >= state.maxSessionsPerUser) {
              // End oldest session
              const oldestSession = userSessions.sort((a, b) => 
                new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime()
              )[0]
              const updatedSessions = state.sessions.map(s =>
                s.id === oldestSession.id ? { ...s, isActive: false } : s
              )
              return {
                sessions: [...updatedSessions, session],
                currentSessionId: sessionId
              }
            }
          }

          return {
            sessions: [...state.sessions, session],
            currentSessionId: sessionId
          }
        })

        return sessionId
      },

      updateActivity: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, lastActivity: new Date().toISOString() } : s
          )
        }))
      },

      endSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, isActive: false } : s
          ),
          currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId
        }))
      },

      endAllSessionsForUser: (username) => {
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.username === username ? { ...s, isActive: false } : s
          ),
          currentSessionId: state.sessions.find(s => s.username === username && s.id === state.currentSessionId)
            ? null
            : state.currentSessionId
        }))
      },

      endAllSessions: () => {
        set({
          sessions: get().sessions.map(s => ({ ...s, isActive: false })),
          currentSessionId: null
        })
      },

      getActiveSessions: () => {
        return get().sessions.filter(s => s.isActive)
      },

      getSessionsByUser: (username) => {
        return get().sessions.filter(s => s.username === username)
      },

      isSessionValid: (sessionId) => {
        const session = get().sessions.find(s => s.id === sessionId)
        if (!session || !session.isActive) return false

        // Check timeout
        const { sessionTimeout } = get()
        if (sessionTimeout > 0) {
          const lastActivity = new Date(session.lastActivity).getTime()
          const now = Date.now()
          if (now - lastActivity > sessionTimeout) {
            return false
          }
        }

        return true
      },

      cleanupExpiredSessions: () => {
        const { sessions, sessionTimeout } = get()
        if (sessionTimeout <= 0) return

        const now = Date.now()
        const updatedSessions = sessions.map(s => {
          if (!s.isActive) return s
          
          const lastActivity = new Date(s.lastActivity).getTime()
          if (now - lastActivity > sessionTimeout) {
            return { ...s, isActive: false }
          }
          return s
        })

        set({ sessions: updatedSessions })
      },

      setSessionTimeout: (timeout) => {
        console.log('🔄 [Session] Setting session timeout:', {
          timeout,
          timeoutMinutes: timeout / 60000,
          currentTimeout: get().sessionTimeout
        })
        
        set({ sessionTimeout: timeout })
        
        // Verify the update immediately
        setTimeout(() => {
          const updated = get().sessionTimeout
          if (updated === timeout) {
            console.log('✅ [Session] Session timeout updated successfully in store:', {
              stored: updated,
              storedMinutes: updated / 60000
            })
          } else {
            console.error('❌ [Session] Session timeout update failed!', {
              expected: timeout,
              actual: updated
            })
          }
        }, 50)
      },

      setMaxSessionsPerUser: (max) => {
        console.log('🔄 [Session] Setting max sessions per user:', {
          max,
          currentMax: get().maxSessionsPerUser
        })
        
        set({ maxSessionsPerUser: max })
        
        // Verify the update immediately
        setTimeout(() => {
          const updated = get().maxSessionsPerUser
          if (updated === max) {
            console.log('✅ [Session] Max sessions per user updated successfully in store:', {
              stored: updated
            })
          } else {
            console.error('❌ [Session] Max sessions per user update failed!', {
              expected: max,
              actual: updated
            })
          }
        }, 50)
      }
    }),
    {
      name: 'admin-session-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('❌ [Session] Rehydration error:', error)
          return
        }
        
        console.log('🔄 [Session] Rehydration started')
        console.log('🔄 [Session] Rehydrated state:', {
          hasState: !!state,
          sessionTimeout: state?.sessionTimeout,
          maxSessionsPerUser: state?.maxSessionsPerUser,
          sessionsCount: state?.sessions?.length || 0,
          currentSessionId: state?.currentSessionId
        })
        
        if (state) {
          // Ensure default values if missing
          if (state.sessionTimeout === undefined || state.sessionTimeout === null) {
            state.sessionTimeout = 60 * 60 * 1000 // Default: 60 minutes
            console.log('⚠️ [Session] sessionTimeout was undefined/null, set to default 60 minutes')
          }
          if (state.maxSessionsPerUser === undefined || state.maxSessionsPerUser === null) {
            state.maxSessionsPerUser = 0 // Default: unlimited
            console.log('⚠️ [Session] maxSessionsPerUser was undefined/null, set to 0 (unlimited)')
          }
          if (!Array.isArray(state.sessions)) {
            state.sessions = []
            console.log('⚠️ [Session] sessions was not an array, set to []')
          }
          if (state.currentSessionId === undefined) {
            state.currentSessionId = null
            console.log('⚠️ [Session] currentSessionId was undefined, set to null')
          }
          
          console.log('✅ [Session] Rehydration completed successfully:', {
            sessionTimeout: state.sessionTimeout,
            sessionTimeoutMinutes: state.sessionTimeout / 60000,
            maxSessionsPerUser: state.maxSessionsPerUser,
            sessionsCount: state.sessions?.length || 0
          })
        } else {
          console.warn('⚠️ [Session] No state found during rehydration, using defaults')
          // Return default state if no state found
          return {
            sessions: [],
            currentSessionId: null,
            sessionTimeout: 60 * 60 * 1000, // 60 minutes
            maxSessionsPerUser: 0
          }
        }
      }
    }
  )
)

// Auto cleanup expired sessions every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    useAdminSession.getState().cleanupExpiredSessions()
  }, 60000) // Every minute
}

