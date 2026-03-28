import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number // days, 0 = no expiration
  preventReuse: number // number of previous passwords to prevent reuse, 0 = disabled
  lockoutAttempts: number // failed login attempts before lockout, 0 = disabled
  lockoutDuration: number // minutes, 0 = permanent until manual unlock
}

interface AdminPasswordPolicyState {
  policy: PasswordPolicy
  passwordHistory: Record<string, string[]> // username -> array of password hashes (for demo, we'll store plain text)
  
  setPolicy: (policy: Partial<PasswordPolicy>) => void
  validatePassword: (password: string, username?: string) => { valid: boolean; errors: string[] }
  addPasswordToHistory: (username: string, password: string) => void
  isPasswordInHistory: (username: string, password: string) => boolean
  getPasswordAge: (username: string) => number | null // days since last password change
  shouldExpirePassword: (username: string) => boolean
}

export const useAdminPasswordPolicy = create<AdminPasswordPolicyState>()(
  persist(
    (set, get) => ({
      policy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        maxAge: 90, // 90 days
        preventReuse: 5, // Prevent reusing last 5 passwords
        lockoutAttempts: 5,
        lockoutDuration: 30 // 30 minutes
      },
      passwordHistory: {},

      setPolicy: (newPolicy) => {
        set((state) => ({
          policy: { ...state.policy, ...newPolicy }
        }))
      },

      validatePassword: (password, username) => {
        const { policy } = get()
        const errors: string[] = []

        // Length check
        if (password.length < policy.minLength) {
          errors.push(`Password must be at least ${policy.minLength} characters long`)
        }

        // Uppercase check
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
          errors.push('Password must contain at least one uppercase letter')
        }

        // Lowercase check
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
          errors.push('Password must contain at least one lowercase letter')
        }

        // Numbers check
        if (policy.requireNumbers && !/[0-9]/.test(password)) {
          errors.push('Password must contain at least one number')
        }

        // Special characters check
        if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          errors.push('Password must contain at least one special character')
        }

        // Reuse check
        if (username && policy.preventReuse > 0) {
          if (get().isPasswordInHistory(username, password)) {
            errors.push(`Password cannot be one of the last ${policy.preventReuse} passwords`)
          }
        }

        return {
          valid: errors.length === 0,
          errors
        }
      },

      addPasswordToHistory: (username, password) => {
        set((state) => {
          const history = state.passwordHistory[username] || []
          const newHistory = [password, ...history].slice(0, state.policy.preventReuse)
          
          return {
            passwordHistory: {
              ...state.passwordHistory,
              [username]: newHistory
            }
          }
        })
      },

      isPasswordInHistory: (username, password) => {
        const { passwordHistory, policy } = get()
        if (policy.preventReuse === 0) return false

        const history = passwordHistory[username] || []
        return history.slice(0, policy.preventReuse).includes(password)
      },

      getPasswordAge: (username) => {
        // In a real application, this would check when the password was last changed
        // For demo purposes, we'll return null (unknown)
        const lastChange = localStorage.getItem(`admin-password-changed-${username}`)
        if (!lastChange) return null

        const changeDate = new Date(lastChange)
        const now = new Date()
        const diffTime = now.getTime() - changeDate.getTime()
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)) // days
      },

      shouldExpirePassword: (username) => {
        const { policy } = get()
        if (policy.maxAge === 0) return false

        const age = get().getPasswordAge(username)
        if (age === null) return false

        return age >= policy.maxAge
      }
    }),
    {
      name: 'admin-password-policy-store',
      version: 1
    }
  )
)

