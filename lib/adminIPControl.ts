import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type IPRuleType = 'whitelist' | 'blacklist'

export interface IPRule {
  id: string
  type: IPRuleType
  ipAddress: string
  description?: string
  createdAt: string
  createdBy: string
  isActive: boolean
}

export interface AdminIPRule {
  username: string
  rules: IPRule[]
}

interface AdminIPControlState {
  globalRules: IPRule[] // Global IP rules (apply to all admins)
  adminRules: Record<string, IPRule[]> // Admin-specific IP rules
  
  // Global rules
  addGlobalRule: (rule: Omit<IPRule, 'id' | 'createdAt'>) => void
  removeGlobalRule: (ruleId: string) => void
  toggleGlobalRule: (ruleId: string) => void
  getActiveGlobalRules: () => IPRule[]
  
  // Admin-specific rules
  addAdminRule: (username: string, rule: Omit<IPRule, 'id' | 'createdAt'>) => void
  removeAdminRule: (username: string, ruleId: string) => void
  toggleAdminRule: (username: string, ruleId: string) => void
  getAdminRules: (username: string) => IPRule[]
  getActiveAdminRules: (username: string) => IPRule[]
  
  // Validation
  isIPAllowed: (ipAddress: string, username?: string) => boolean
  validateIP: (ipAddress: string) => boolean
}

export const useAdminIPControl = create<AdminIPControlState>()(
  persist(
    (set, get) => ({
      globalRules: [],
      adminRules: {},

      addGlobalRule: (ruleData) => {
        const rule: IPRule = {
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          ...ruleData
        }

        set((state) => ({
          globalRules: [...state.globalRules, rule]
        }))
      },

      removeGlobalRule: (ruleId) => {
        set((state) => ({
          globalRules: state.globalRules.filter(r => r.id !== ruleId)
        }))
      },

      toggleGlobalRule: (ruleId) => {
        set((state) => ({
          globalRules: state.globalRules.map(r =>
            r.id === ruleId ? { ...r, isActive: !r.isActive } : r
          )
        }))
      },

      getActiveGlobalRules: () => {
        return get().globalRules.filter(r => r.isActive)
      },

      addAdminRule: (username, ruleData) => {
        const rule: IPRule = {
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          ...ruleData
        }

        set((state) => ({
          adminRules: {
            ...state.adminRules,
            [username]: [...(state.adminRules[username] || []), rule]
          }
        }))
      },

      removeAdminRule: (username, ruleId) => {
        set((state) => ({
          adminRules: {
            ...state.adminRules,
            [username]: (state.adminRules[username] || []).filter(r => r.id !== ruleId)
          }
        }))
      },

      toggleAdminRule: (username, ruleId) => {
        set((state) => ({
          adminRules: {
            ...state.adminRules,
            [username]: (state.adminRules[username] || []).map(r =>
              r.id === ruleId ? { ...r, isActive: !r.isActive } : r
            )
          }
        }))
      },

      getAdminRules: (username) => {
        return get().adminRules[username] || []
      },

      getActiveAdminRules: (username) => {
        return get().getAdminRules(username).filter(r => r.isActive)
      },

      validateIP: (ipAddress) => {
        // Basic IP validation (IPv4 and IPv6)
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
        
        return ipv4Regex.test(ipAddress) || ipv6Regex.test(ipAddress) || cidrRegex.test(ipAddress)
      },

      isIPAllowed: (ipAddress, username) => {
        const { globalRules, adminRules } = get()

        // Check global blacklist first
        const globalBlacklist = globalRules.filter(r => r.type === 'blacklist' && r.isActive)
        for (const rule of globalBlacklist) {
          if (matchesIP(ipAddress, rule.ipAddress)) {
            return false
          }
        }

        // Check admin-specific blacklist
        if (username) {
          const adminBlacklist = (adminRules[username] || []).filter(r => r.type === 'blacklist' && r.isActive)
          for (const rule of adminBlacklist) {
            if (matchesIP(ipAddress, rule.ipAddress)) {
              return false
            }
          }
        }

        // Check if whitelist exists
        const globalWhitelist = globalRules.filter(r => r.type === 'whitelist' && r.isActive)
        const hasGlobalWhitelist = globalWhitelist.length > 0

        let hasAdminWhitelist = false
        let adminWhitelist: IPRule[] = []
        if (username) {
          adminWhitelist = (adminRules[username] || []).filter(r => r.type === 'whitelist' && r.isActive)
          hasAdminWhitelist = adminWhitelist.length > 0
        }

        // If whitelist exists, IP must be in whitelist
        if (hasGlobalWhitelist || hasAdminWhitelist) {
          // Check global whitelist
          if (hasGlobalWhitelist) {
            const inGlobalWhitelist = globalWhitelist.some(r => matchesIP(ipAddress, r.ipAddress))
            if (inGlobalWhitelist) return true
          }

          // Check admin whitelist
          if (hasAdminWhitelist) {
            const inAdminWhitelist = adminWhitelist.some(r => matchesIP(ipAddress, r.ipAddress))
            if (inAdminWhitelist) return true
          }

          // Not in any whitelist
          return false
        }

        // No whitelist, only blacklist checked (already passed)
        return true
      }
    }),
    {
      name: 'admin-ip-control-store',
      version: 1
    }
  )
)

// Helper function to match IP addresses (supports CIDR notation)
function matchesIP(ip: string, ruleIP: string): boolean {
  // Exact match
  if (ip === ruleIP) return true

  // CIDR notation
  if (ruleIP.includes('/')) {
    const [ruleIPBase, prefixLength] = ruleIP.split('/')
    const prefix = parseInt(prefixLength, 10)
    
    // Simple CIDR matching (for demo purposes)
    // In production, use a proper CIDR library
    if (prefix >= 0 && prefix <= 32) {
      const ipParts = ip.split('.').map(Number)
      const ruleParts = ruleIPBase.split('.').map(Number)
      
      if (ipParts.length !== 4 || ruleParts.length !== 4) return false
      
      const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0
      const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3]
      const ruleNum = (ruleParts[0] << 24) + (ruleParts[1] << 16) + (ruleParts[2] << 8) + ruleParts[3]
      
      return (ipNum & mask) === (ruleNum & mask)
    }
  }

  return false
}

