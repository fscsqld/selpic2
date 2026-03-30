'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, Users, Lock, Shield, Plus, Trash2, Eye, EyeOff,
  X, UserPlus, Globe, Database, Bell, ShieldCheck, ArrowLeft, Key, Crown,
  Moon, Sun, Monitor, RefreshCw, FileText, Palette, Mail, Phone, Building2, UserCircle, Image as ImageIcon, Edit,
  Menu, ChevronDown, ChevronRight, ChevronLeft, Folder, DollarSign, TrendingUp, Target, AlertTriangle,
  Download, ExternalLink, Calendar, Clock, GitCompare, Copy, CheckCircle, AlertCircle
} from 'lucide-react'
import { useAdminAuth } from '@/lib/adminAuth'
import { useStore } from '@/lib/store'
import AdminRoute from '@/components/AdminRoute'
import { useTranslation } from '@/lib/useTranslation'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useAdminActivityLog } from '@/lib/adminActivityLog'
import { useAdminSession } from '@/lib/adminSession'
import { useAdminPasswordPolicy } from '@/lib/adminPasswordPolicy'
import { useAdminIPControl } from '@/lib/adminIPControl'
import { useAdminNotifications } from '@/lib/adminNotifications'
import { useUserAuth } from '@/lib/userAuth'
import { useSalesGoals } from '@/lib/salesGoals'
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime,
  getCurrencyDisplayName,
  getDateFormatPreview,
  getTimezoneDisplayName,
  getCurrentTimeInTimezone,
  type Currency,
  type DateFormat,
  type Timezone
} from '@/lib/formatUtils'
import PermissionManager from '@/components/PermissionManager'
import { useWatermarkStore, WatermarkPosition } from '@/lib/watermarkStore'

export default function AdminSettingsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { 
    adminUser, adminUsers, changeAdminPassword, changePassword, updateAdminPermissions, 
    toggleAdminStatus, createAdmin, deleteAdmin, updateMyUsername, updateAdminProfile 
  } = useAdminAuth()
  const { 
    goals, setGoal, getGoal, 
    alerts, setAlert, 
    reportSchedules, setReportSchedule,
    notifications, addNotification, markNotificationAsRead, getUnreadCount
  } = useSalesGoals()
  const { 
    language, 
    setLanguage, 
    orders,
    products,
    currency,
    setCurrency,
    dateFormat,
    setDateFormat,
    timezone,
    setTimezone,
    defaultPageSize,
    setDefaultPageSize,
    theme,
    setTheme,
    autoRefreshInterval,
    setAutoRefreshInterval
  } = useStore()
  const { users } = useUserAuth()
  const { settings: watermarkSettings, setWatermarkImage, updateWatermarkSettings } = useWatermarkStore()
  
  // Sales Goals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | null>(null)
  const [goalFormData, setGoalFormData] = useState({ targetRevenue: 0, targetOrders: 0, enabled: false })
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<string | null>(null)
  const [alertFormData, setAlertFormData] = useState({ enabled: false, threshold: 80, recipients: 'super_admin' as 'super_admin' | 'all_admins', methods: [] as ('email' | 'dashboard_badge' | 'browser')[] })
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<'daily' | 'weekly' | 'monthly' | null>(null)
  const [reportFormData, setReportFormData] = useState({ enabled: false, day: 1, time: '09:00', format: [] as ('pdf' | 'excel' | 'csv')[], recipients: '', includeCharts: true, includeDetails: false })
  const [exportPeriod, setExportPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv')

  // 테마 초기화 및 시스템 설정 감지
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const root = document.documentElement
    
    // 초기 테마 적용
    const applyTheme = () => {
      if (theme === 'dark') {
        root.classList.add('dark')
      } else if (theme === 'auto') {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      } else {
        root.classList.remove('dark')
      }
    }
    
    applyTheme()
    
    // Auto 모드일 때 시스템 설정 변경 감지
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Track adminUsers changes for real-time updates
  // Zustand automatically triggers re-renders when adminUsers changes
  // This memoized version ensures we detect all property changes
  const memoizedAdminUsers = useMemo(() => {
    console.log('📊 memoizedAdminUsers calculation:', {
      adminUsersLength: adminUsers.length,
      adminUsers: adminUsers.map(a => ({ username: a.username, role: a.role, isActive: a.isActive }))
    })
    
    // Return a new array reference to ensure React detects changes
    const mapped = adminUsers.map(admin => ({
      ...admin,
      // Explicitly include all properties that might change
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      lastModified: admin.lastModified,
      email: admin.email,
      phone: admin.phone,
      department: admin.department,
      notes: admin.notes,
      avatar: admin.avatar
    }))
    
    console.log('📊 memoizedAdminUsers result:', mapped.length, 'admins')
    return mapped
  }, [adminUsers])

  // Force re-render when adminUsers changes
  const [, setForceUpdate] = useState(0)
  
  // Listen for storage changes (when another tab/window updates adminUsers)
  // Also listen for custom events from same-tab updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin-auth-store') {
        // Force re-render to pick up changes from localStorage
        setForceUpdate(prev => prev + 1)
      }
    }
    
    // Listen for custom storage events (for same-tab updates)
    const handleCustomStorageChange = () => {
      // Force re-render to pick up changes
      // Zustand will automatically update, but we ensure re-render here
      setForceUpdate(prev => prev + 1)
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('admin-auth-updated', handleCustomStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('admin-auth-updated', handleCustomStorageChange)
    }
  }, [])

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isMyPasswordModalOpen, setIsMyPasswordModalOpen] = useState(false)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)
  const [isBulkPermissionsModalOpen, setIsBulkPermissionsModalOpen] = useState(false)
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [selectedAdmins, setSelectedAdmins] = useState<Set<string>>(new Set())
  const [bulkPermissions, setBulkPermissions] = useState<string[]>([])
  const [compareAdmin1, setCompareAdmin1] = useState<string>('')
  const [compareAdmin2, setCompareAdmin2] = useState<string>('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isMyProfileModalOpen, setIsMyProfileModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['general', 'admin', 'system']))

  // Form states
  const [newAdminData, setNewAdminData] = useState({
    username: '', password: '', role: 'admin' as 'admin' | 'super_admin', permissions: [] as string[]
  })
  const [passwordChangeData, setPasswordChangeData] = useState({ username: '', newPassword: '', confirmPassword: '' })
  const [myPasswordData, setMyPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [permissionsData, setPermissionsData] = useState({ username: '', permissions: [] as string[] })
  const [adminToDelete, setAdminToDelete] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    phone: '',
    department: '',
    notes: '',
    avatar: ''
  })
  const [avatarUploadMethod, setAvatarUploadMethod] = useState<'url' | 'upload' | 'template'>('url')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // UI states
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restorePreview, setRestorePreview] = useState<any>(null)
  
  // Notification preferences
  const { getPreferences, updatePreferences } = useAdminNotifications()
  const currentUsername = adminUser?.username || ''
  const notificationPrefs = getPreferences(currentUsername)
  
  // Notification state
  const [notificationSettings, setNotificationSettings] = useState<{
    orderConfirmations: boolean
    systemAlerts: boolean
    weeklyReports: boolean
    salesReports: boolean
    orderNotifications: boolean
  }>(notificationPrefs)
  
  // 알림 설정 초기화 (관리자 변경 시)
  useEffect(() => {
    if (currentUsername) {
      const prefs = getPreferences(currentUsername)
      setNotificationSettings(prefs)
    }
  }, [currentUsername, getPreferences])
  
  // 알림 설정 저장 핸들러
  const handleNotificationChange = (key: keyof typeof notificationSettings, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value }
    setNotificationSettings(newSettings)
    if (currentUsername) {
      updatePreferences(currentUsername, newSettings)
      setMessage('Notification preferences saved successfully')
      setTimeout(() => setMessage(''), 3000)
    }
  }
  
  // Get last backup time from localStorage
  const getLastBackupTime = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('last-backup-time')
  }
  
  // Save backup time
  const saveBackupTime = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem('last-backup-time', new Date().toISOString())
  }
  
  // Update backup time when backup is created
  const handleBackupDataWithTime = () => {
    handleBackupData()
    saveBackupTime()
  }
  
  // Restore Data Handler
  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.name.endsWith('.json')) {
      setMessage('Please select a valid JSON backup file.')
      setTimeout(() => setMessage(''), 5000)
      return
    }
    
    setRestoreFile(file)
    
    // Read and preview file
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const data = JSON.parse(content)
        setRestorePreview(data)
      } catch (error) {
        setMessage('Invalid JSON file. Please check the file format.')
        setTimeout(() => setMessage(''), 5000)
        setRestoreFile(null)
        setRestorePreview(null)
      }
    }
    reader.readAsText(file)
  }
  
  // Create automatic backup before restore
  const createPreRestoreBackup = (): string | null => {
    try {
      // Collect all current localStorage data
      const currentBackup: Record<string, string> = {}
      Object.keys(localStorage).forEach(key => {
        currentBackup[key] = localStorage.getItem(key) || ''
      })
      
      // Save to localStorage as temporary backup
      const backupKey = 'pre-restore-backup-' + Date.now()
      localStorage.setItem(backupKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        data: currentBackup
      }))
      
      // Also save the backup key for easy retrieval
      localStorage.setItem('last-pre-restore-backup-key', backupKey)
      
      return backupKey
    } catch (error) {
      console.error('Failed to create pre-restore backup:', error)
      return null
    }
  }
  
  // Restore from pre-restore backup (rollback)
  const restoreFromPreRestoreBackup = (backupKey: string): boolean => {
    try {
      const backupData = localStorage.getItem(backupKey)
      if (!backupData) {
        return false
      }
      
      const parsed = JSON.parse(backupData)
      if (!parsed.data) {
        return false
      }
      
      // Clear current localStorage (except admin-auth to keep login)
      const currentAdminAuth = localStorage.getItem('admin-auth-store')
      localStorage.clear()
      if (currentAdminAuth) {
        localStorage.setItem('admin-auth-store', currentAdminAuth)
      }
      
      // Restore all data from backup
      Object.entries(parsed.data).forEach(([key, value]) => {
        if (key !== 'admin-auth-store' || !currentAdminAuth) {
          localStorage.setItem(key, value as string)
        }
      })
      
      // Clean up backup key
      localStorage.removeItem(backupKey)
      localStorage.removeItem('last-pre-restore-backup-key')
      
      return true
    } catch (error) {
      console.error('Failed to restore from pre-restore backup:', error)
      return false
    }
  }
  
  const handleRestoreData = () => {
    if (!restorePreview) {
      setMessage('Please select a backup file first.')
      setTimeout(() => setMessage(''), 5000)
      return
    }
    
    let preRestoreBackupKey: string | null = null
    
    try {
      setIsLoading(true)
      
      // Validate backup data structure
      if (!restorePreview.stores && !restorePreview.allLocalStorage) {
        throw new Error('Invalid backup file format')
      }
      
      // Confirm before restore
      const confirmed = window.confirm(
        '⚠️ WARNING: This will replace all current data with the backup data.\n\n' +
        'A backup of your current data will be created automatically before restore.\n\n' +
        'Are you sure you want to continue?'
      )
      
      if (!confirmed) {
        setIsLoading(false)
        return
      }
      
      // Step 1: Create automatic backup before restore
      setMessage('Creating backup of current data...')
      preRestoreBackupKey = createPreRestoreBackup()
      
      if (!preRestoreBackupKey) {
        throw new Error('Failed to create backup. Restore cancelled for safety.')
      }
      
      // Step 2: Validate backup file more thoroughly
      setMessage('Validating backup file...')
      
      // Check if backup has required stores
      const requiredStores = ['selpic-store']
      if (restorePreview.stores) {
        const missingStores = requiredStores.filter(store => !restorePreview.stores[store])
        if (missingStores.length > 0) {
          throw new Error(`Backup file is missing required stores: ${missingStores.join(', ')}`)
        }
      } else if (restorePreview.allLocalStorage) {
        const missingStores = requiredStores.filter(store => !restorePreview.allLocalStorage[store])
        if (missingStores.length > 0) {
          throw new Error(`Backup file is missing required stores: ${missingStores.join(', ')}`)
        }
      }
      
      // Step 3: Begin restore (transaction-like approach)
      setMessage('Restoring data...')
      
      // Store current state for rollback
      const restoreStartTime = Date.now()
      const restoreErrors: string[] = []
      
      // Restore from allLocalStorage if available, otherwise from stores
      if (restorePreview.allLocalStorage) {
        // Clear current localStorage (except admin-auth to keep login)
        const currentAdminAuth = localStorage.getItem('admin-auth-store')
        localStorage.clear()
        if (currentAdminAuth) {
          localStorage.setItem('admin-auth-store', currentAdminAuth)
        }
        
        // Restore all data with error tracking
        Object.entries(restorePreview.allLocalStorage).forEach(([key, value]) => {
          try {
            if (key !== 'admin-auth-store' || !currentAdminAuth) {
              localStorage.setItem(key, value as string)
            }
          } catch (error) {
            restoreErrors.push(`Failed to restore ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        })
      } else if (restorePreview.stores) {
        // Restore from stores object with error tracking
        Object.entries(restorePreview.stores).forEach(([key, value]) => {
          try {
            if (value) {
              localStorage.setItem(key, value as string)
            }
          } catch (error) {
            restoreErrors.push(`Failed to restore ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        })
      }
      
      // Step 4: Check if restore was successful
      if (restoreErrors.length > 0) {
        // Partial restore failed - rollback
        throw new Error(`Restore partially failed. Rolling back...\nErrors: ${restoreErrors.join(', ')}`)
      }
      
      // Step 5: Verify restore success
      const verifyKeys = ['selpic-store']
      const missingKeys = verifyKeys.filter(key => !localStorage.getItem(key))
      if (missingKeys.length > 0) {
        throw new Error(`Restore verification failed. Missing keys: ${missingKeys.join(', ')}`)
      }
      
      // Step 6: Update backup time if available
      if (restorePreview.timestamp) {
        localStorage.setItem('last-backup-time', restorePreview.timestamp)
      }
      
      // Step 7: Clean up pre-restore backup (restore was successful)
      if (preRestoreBackupKey) {
        localStorage.removeItem(preRestoreBackupKey)
        localStorage.removeItem('last-pre-restore-backup-key')
      }
      
      setMessage('Data restored successfully. Please refresh the page to see changes.')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
      setIsRestoreModalOpen(false)
      setRestoreFile(null)
      setRestorePreview(null)
      setIsLoading(false)
      
    } catch (error) {
      // Rollback on error
      setIsLoading(true)
      setMessage('Restore failed. Attempting to restore previous state...')
      
      try {
        // Attempt to restore from pre-restore backup
        if (preRestoreBackupKey) {
          const rollbackSuccess = restoreFromPreRestoreBackup(preRestoreBackupKey)
          
          if (rollbackSuccess) {
            setMessage('Restore failed, but previous state has been restored successfully. No data was lost.')
            setTimeout(() => setMessage(''), 8000)
          } else {
            // Try to get backup key from localStorage
            const savedBackupKey = localStorage.getItem('last-pre-restore-backup-key')
            if (savedBackupKey) {
              const rollbackSuccess2 = restoreFromPreRestoreBackup(savedBackupKey)
              if (rollbackSuccess2) {
                setMessage('Restore failed, but previous state has been restored successfully. No data was lost.')
                setTimeout(() => setMessage(''), 8000)
              } else {
                throw new Error('Failed to restore previous state. Please manually restore from backup.')
              }
            } else {
              throw new Error('No backup found to restore from. Please manually restore from backup.')
            }
          }
        } else {
          throw new Error('No backup was created before restore. Please manually restore from backup.')
        }
      } catch (rollbackError) {
        setMessage(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}. Rollback also failed: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown error'}. Please contact support.`)
        setTimeout(() => setMessage(''), 10000)
      }
      
      setIsLoading(false)
    }
  }
  
  // Get Activity Log info
  const { logs } = useAdminActivityLog()
  
  // Calculate localStorage usage
  const localStorageUsage = useMemo(() => {
    if (typeof window === 'undefined') {
      return { current: 0, max: 0, percentage: 0, storeSizes: {} }
    }
    
    let totalSize = 0
    const storeSizes: Record<string, number> = {}
    
    Object.keys(localStorage).forEach(key => {
      const value = localStorage.getItem(key) || ''
      const size = new Blob([value]).size
      totalSize += size
      
      // Group by store
      if (key.includes('-store')) {
        const storeName = key.replace('-store', '')
        storeSizes[storeName] = (storeSizes[storeName] || 0) + size
      }
    })
    
    // Estimate max localStorage size (typically 5-10MB, using 5MB as conservative estimate)
    const estimatedMax = 5 * 1024 * 1024 // 5MB
    const percentage = (totalSize / estimatedMax) * 100
    
    return {
      current: totalSize,
      max: estimatedMax,
      percentage: Math.min(percentage, 100),
      storeSizes
    }
  }, [])
  
  // Calculate statistics
  const systemStats = useMemo(() => {
    const totalOrders = orders.length
    const totalProducts = products.length
    const totalUsers = users.length
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const lastBackupTime = getLastBackupTime()
    
    // Activity Log statistics
    const activityLogSize = logs.length
    const activityLogSizeInMB = logs.reduce((sum, log) => {
      const logSize = new Blob([JSON.stringify(log)]).size
      return sum + logSize
    }, 0) / (1024 * 1024)
    
    return {
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue,
      lastBackupTime: lastBackupTime ? new Date(lastBackupTime) : null,
      activityLogSize,
      activityLogSizeInMB
    }
  }, [orders, products, users, logs])
  
  // Format size helper
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const isSuperAdmin = adminUser?.role === 'super_admin'
  
  // System Actions Handlers
  const handleClearCache = () => {
    try {
      // Clear specific cache keys (keep important data)
      const keysToKeep = [
        'admin-auth-store',
        'selpic-store',
        'admin-activity-log-store',
        'admin-session-store',
        'admin-password-policy-store',
        'admin-ip-control-store',
        'admin-notifications-store'
      ]
      
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage)
      
      // Count cleared items
      let clearedCount = 0
      allKeys.forEach(key => {
        // Only clear keys that are not in keep list and are cache-related
        if (!keysToKeep.includes(key) && (key.includes('cache') || key.includes('Cache') || key.startsWith('next-'))) {
          localStorage.removeItem(key)
          clearedCount++
        }
      })
      
      setMessage(`Cache cleared successfully. ${clearedCount} items removed.`)
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      setMessage('Error clearing cache. Please try again.')
      setTimeout(() => setMessage(''), 5000)
    }
  }
  
  const handleBackupData = () => {
    try {
      setIsLoading(true)
      
      // Collect all store data
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        stores: {
          adminAuth: localStorage.getItem('admin-auth-store'),
          mainStore: localStorage.getItem('selpic-store'),
          activityLog: localStorage.getItem('admin-activity-log-store'),
          session: localStorage.getItem('admin-session-store'),
          passwordPolicy: localStorage.getItem('admin-password-policy-store'),
          ipControl: localStorage.getItem('admin-ip-control-store'),
          notifications: localStorage.getItem('admin-notifications-store')
        },
        allLocalStorage: {} as Record<string, string>
      }
      
      // Get all localStorage items
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        backupData.allLocalStorage[key] = localStorage.getItem(key) || ''
      })
      
      // Create JSON file and download
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `selpic-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setMessage('Data backup completed successfully. File downloaded.')
      setTimeout(() => setMessage(''), 5000)
      setIsLoading(false)
    } catch (error) {
      setMessage('Error creating backup. Please try again.')
      setTimeout(() => setMessage(''), 5000)
      setIsLoading(false)
    }
  }
  
  const handleHealthCheck = () => {
    try {
      setIsLoading(true)
      
      // Calculate localStorage usage
      let totalSize = 0
      let itemCount = 0
      const storeSizes: Record<string, number> = {}
      
      Object.keys(localStorage).forEach(key => {
        const value = localStorage.getItem(key) || ''
        const size = new Blob([value]).size
        totalSize += size
        itemCount++
        
        // Group by store
        if (key.includes('-store')) {
          const storeName = key.replace('-store', '')
          storeSizes[storeName] = (storeSizes[storeName] || 0) + size
        }
      })
      
      // Format sizes
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
      }
      
      // Get browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }
      
      // Create health report
      const healthReport = `
System Health Check Report
==========================
Date: ${new Date().toLocaleString()}

LocalStorage Usage:
- Total Items: ${itemCount}
- Total Size: ${formatSize(totalSize)}
- Estimated Limit: ~5-10 MB

Store Sizes:
${Object.entries(storeSizes).map(([name, size]) => `- ${name}: ${formatSize(size)}`).join('\n')}

Browser Information:
- Platform: ${browserInfo.platform}
- Language: ${browserInfo.language}
- Cookies: ${browserInfo.cookieEnabled ? 'Enabled' : 'Disabled'}
- Online: ${browserInfo.onLine ? 'Yes' : 'No'}

System Status: ${totalSize > 5 * 1024 * 1024 ? '⚠️ Warning: High storage usage' : '✅ Normal'}
      `.trim()
      
      // Show in alert (can be improved with modal)
      alert(healthReport)
      
      setMessage('Health check completed. See details in alert.')
      setTimeout(() => setMessage(''), 5000)
      setIsLoading(false)
    } catch (error) {
      setMessage('Error performing health check. Please try again.')
      setTimeout(() => setMessage(''), 5000)
      setIsLoading(false)
    }
  }
  
  // Debug logging for admin role and users
  useEffect(() => {
    console.log('🔍 Admin Settings Debug:', {
      adminUser: adminUser?.username,
      role: adminUser?.role,
      isSuperAdmin,
      adminUsersCount: adminUsers.length,
      adminUsers: adminUsers.map(a => ({ username: a.username, role: a.role, isActive: a.isActive })),
      memoizedCount: memoizedAdminUsers.length
    })
  }, [adminUser, isSuperAdmin, adminUsers, memoizedAdminUsers])
  
  const availablePermissions = [
    'dashboard:read', 'products:read', 'products:write', 'content:read', 
    'content:write', 'users:read', 'users:write', 'analytics:read',
    'orders:read', 'orders:write', 'messages:read', 'messages:write',
    'community:read', 'community:write', 'community:moderate',
    'images:read', 'images:write', 'invoices:read', 'invoices:write',
    'system:admin', 'admin:manage'
  ]

  // 탭 그룹 정의
  const tabGroups = [
    {
      id: 'general',
      label: 'General Settings',
      icon: Settings,
      tabs: [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'security', label: t('admin.settings.security.title'), icon: Shield },
        { id: 'notifications', label: t('admin.settings.notifications.title'), icon: Bell },
        { id: 'media', label: 'Media', icon: ImageIcon }
      ]
    },
    {
      id: 'admin',
      label: 'Admin Management',
      icon: Users,
      superAdminOnly: true,
      tabs: [
        { id: 'admin-management', label: t('admin.settings.adminManagement.title') || 'Admin Management', icon: Users },
        { id: 'activity-log', label: 'Activity Log', icon: FileText },
        { id: 'sessions', label: 'Session Management', icon: Shield }
      ]
    },
    {
      id: 'system',
      label: 'System',
      icon: Database,
      superAdminOnly: true,
      tabs: [
        { id: 'system', label: t('admin.settings.system.title'), icon: Database },
        { id: 'sales', label: t('admin.settings.sales.title'), icon: Database }
      ]
    }
  ]

  // 모든 탭을 평탄화 (기존 코드 호환성)
  const tabs = tabGroups.flatMap(group => group.tabs)

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const success = await createAdmin(
        newAdminData.username, newAdminData.password, 
        newAdminData.role, newAdminData.permissions
      )
              if (success) {
          setMessage(t('admin.settings.messages.adminCreated'))
          setIsCreateModalOpen(false)
          setNewAdminData({ username: '', password: '', role: 'admin', permissions: [] })
        } else {
          setMessage(t('admin.settings.messages.accessDenied'))
        }
      } catch (error) {
        setMessage(t('admin.settings.messages.errorCreating'))
      } finally {
        setIsLoading(false)
      }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    // Validation
    if (passwordChangeData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long.')
      setIsLoading(false)
      return
    }
    
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setMessage('Passwords do not match.')
      setIsLoading(false)
      return
    }
    
    try {
      const success = await changeAdminPassword(
        passwordChangeData.username, passwordChangeData.newPassword
      )
      if (success) {
        setMessage(t('admin.settings.messages.passwordUpdated') || 'Password updated successfully')
        // Force re-render to show updated lastModified
        setForceUpdate(prev => prev + 1)
        // Close modal after a short delay to show success message
        setTimeout(() => {
          setIsPasswordModalOpen(false)
          setPasswordChangeData({ username: '', newPassword: '', confirmPassword: '' })
          setMessage('')
        }, 1500)
      } else {
        setMessage(t('admin.settings.messages.accessDenied') || 'Access denied')
      }
    } catch (error) {
      setMessage(t('admin.settings.messages.errorUpdating'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    // Validation
    if (!myPasswordData.currentPassword) {
      setMessage('Please enter your current password.')
      setIsLoading(false)
      return
    }

    if (myPasswordData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long.')
      setIsLoading(false)
      return
    }

    if (myPasswordData.newPassword !== myPasswordData.confirmPassword) {
      setMessage('New passwords do not match.')
      setIsLoading(false)
      return
    }

    try {
      const success = await changePassword(myPasswordData.currentPassword, myPasswordData.newPassword)
      if (success) {
        setMessage('Password changed successfully!')
        // Close modal after a short delay to show success message
        setTimeout(() => {
          setIsMyPasswordModalOpen(false)
          setMyPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
          setMessage('')
        }, 1500)
      } else {
        setMessage('Current password is incorrect.')
      }
    } catch (error) {
      console.error('Password change error:', error)
      setMessage('An error occurred while changing password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const success = await updateAdminPermissions(
        permissionsData.username, permissionsData.permissions
      )
              if (success) {
          setMessage(t('admin.settings.messages.permissionsUpdated'))
          setIsPermissionsModalOpen(false)
          setPermissionsData({ username: '', permissions: [] })
        } else {
          setMessage(t('admin.settings.messages.accessDenied'))
        }
      } catch (error) {
        setMessage(t('admin.settings.messages.errorUpdating'))
      } finally {
        setIsLoading(false)
      }
  }

  const handleToggleStatus = async (username: string) => {
    if (username === adminUser?.username) {
      setMessage(t('admin.settings.adminManagement.cannotModifySelf'))
      return
    }
    setIsLoading(true)
    try {
      const success = await toggleAdminStatus(username)
      if (success) {
        setMessage(t('admin.settings.messages.statusUpdated'))
        // Force re-render by accessing adminUsers again
        // Zustand will automatically trigger re-render, but we ensure it here
      } else {
        setMessage(t('admin.settings.messages.accessDenied'))
      }
    } catch (error) {
      setMessage(t('admin.settings.messages.errorUpdating'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAdmin = async () => {
          if (adminToDelete === adminUser?.username) {
        setMessage(t('admin.settings.adminManagement.cannotModifySelf'))
        return
      }
      setIsLoading(true)
      try {
        const success = await deleteAdmin(adminToDelete)
        if (success) {
          setMessage(t('admin.settings.messages.adminDeleted'))
          setIsDeleteModalOpen(false)
          setAdminToDelete('')
        } else {
          setMessage(t('admin.settings.messages.accessDenied'))
        }
      } catch (error) {
        setMessage(t('admin.settings.messages.errorDeleting'))
      } finally {
        setIsLoading(false)
      }
  }

  const openPasswordModal = (username: string) => {
    setPasswordChangeData({ username, newPassword: '', confirmPassword: '' })
    setMessage('')
    setIsPasswordModalOpen(true)
  }

  const openPermissionsModal = (username: string) => {
    const admin = adminUsers.find(u => u.username === username)
    if (admin) {
      setPermissionsData({ username, permissions: [...admin.permissions] })
      setIsPermissionsModalOpen(true)
    }
  }

  const openDeleteModal = (username: string) => {
    setAdminToDelete(username)
    setIsDeleteModalOpen(true)
  }

  // Bulk Permission Management function
  const handleBulkPermissionsUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedAdmins.size === 0) {
      setMessage('Please select at least one admin.')
      return
    }
    setIsLoading(true)
    try {
      let successCount = 0
      let failCount = 0
      for (const username of Array.from(selectedAdmins)) {
        if (username === adminUser?.username) {
          failCount++
          continue
        }
        const success = await updateAdminPermissions(username, bulkPermissions)
        if (success) {
          successCount++
        } else {
          failCount++
        }
      }
      if (successCount > 0) {
        setMessage(`Permissions updated for ${successCount} admin(s).${failCount > 0 ? ` (${failCount} failed)` : ''}`)
        setIsBulkPermissionsModalOpen(false)
        setSelectedAdmins(new Set())
        setBulkPermissions([])
      } else {
        setMessage('Failed to update permissions.')
      }
    } catch (error) {
      setMessage('An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  // Permission Comparison function
  const getPermissionDifference = (admin1: string, admin2: string) => {
    const a1 = adminUsers.find(a => a.username === admin1)
    const a2 = adminUsers.find(a => a.username === admin2)
    if (!a1 || !a2) return { onlyIn1: [], onlyIn2: [], common: [] }
    
    const perms1 = new Set(a1.permissions)
    const perms2 = new Set(a2.permissions)
    
    const onlyIn1 = a1.permissions.filter(p => !perms2.has(p))
    const onlyIn2 = a2.permissions.filter(p => !perms1.has(p))
    const common = a1.permissions.filter(p => perms2.has(p))
    
    return { onlyIn1, onlyIn2, common }
  }

  const openProfileModal = (username: string) => {
    const admin = adminUsers.find(u => u.username === username)
    if (admin) {
      setProfileData({
        username: admin.username,
        email: admin.email || '',
        phone: admin.phone || '',
        department: admin.department || '',
        notes: admin.notes || '',
        avatar: admin.avatar || ''
      })
      setIsProfileModalOpen(true)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      const success = await updateAdminProfile(profileData.username, {
        email: profileData.email || undefined,
        phone: profileData.phone || undefined,
        department: profileData.department || undefined,
        notes: profileData.notes || undefined,
        avatar: profileData.avatar || undefined
      })
      
      if (success) {
        setMessage('Profile updated successfully.')
        setIsProfileModalOpen(false)
        setIsMyProfileModalOpen(false)
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Failed to update profile.')
      }
    } catch (error) {
      setMessage('Error updating profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    if (!newUsername || newUsername.trim().length < 3) {
      setMessage('Username must be at least 3 characters.')
      setIsLoading(false)
      return
    }

    try {
      const success = await updateMyUsername(newUsername.trim())
      if (success) {
        setMessage('Username changed successfully.')
        setIsUsernameModalOpen(false)
        setNewUsername('')
      } else {
        setMessage('Failed to change username. The username may already be in use.')
      }
    } catch (error) {
      setMessage('An error occurred while changing username.')
    } finally {
      setIsLoading(false)
    }
  }

  // 매출 계산 함수들 (useMemo로 최적화하여 orders 변경 시에만 재계산)
  // 취소된 주문(status === 'cancelled')은 매출 계산에서 제외
  const weeklySales = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
    
    const weeklyOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAtIso)
      // 취소된 주문 제외
      return orderDate >= weekStart && orderDate <= weekEnd && order.status !== 'cancelled'
    })
    
    const totalRevenue = weeklyOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrders = weeklyOrders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    return { totalRevenue, totalOrders, averageOrderValue, weekStart, weekEnd }
  }, [orders])

  const monthlySales = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const monthlyOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAtIso)
      // 취소된 주문 제외
      return orderDate >= monthStart && orderDate <= monthEnd && order.status !== 'cancelled'
    })
    
    const totalRevenue = monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrders = monthlyOrders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    return { totalRevenue, totalOrders, averageOrderValue, monthStart, monthEnd }
  }, [orders])

  const yearlySales = useMemo(() => {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31)
    
    const yearlyOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAtIso)
      // 취소된 주문 제외
      return orderDate >= yearStart && orderDate <= yearEnd && order.status !== 'cancelled'
    })
    
    const totalRevenue = yearlyOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrders = yearlyOrders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    return { totalRevenue, totalOrders, averageOrderValue, yearStart, yearEnd }
  }, [orders])
  
  // Calculate goal progress
  const getGoalProgress = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const goal = getGoal(period)
    if (!goal || !goal.enabled || goal.targetRevenue === 0) return null
    
    let currentRevenue = 0
    if (period === 'daily') {
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      currentRevenue = orders
        .filter(o => {
          const orderDate = new Date(o.createdAtIso)
          return orderDate >= todayStart && orderDate < todayEnd && o.status !== 'cancelled'
        })
        .reduce((sum, o) => sum + (o.total || 0), 0)
    } else if (period === 'weekly') {
      currentRevenue = weeklySales.totalRevenue
    } else if (period === 'monthly') {
      currentRevenue = monthlySales.totalRevenue
    } else if (period === 'yearly') {
      currentRevenue = yearlySales.totalRevenue
    }
    
    const percentage = (currentRevenue / goal.targetRevenue) * 100
    return { currentRevenue, targetRevenue: goal.targetRevenue, percentage: Math.min(percentage, 100) }
  }
  
  // Check for goal achievements and trigger notifications
  useEffect(() => {
    if (!isSuperAdmin) return
    
    const checkGoalAchievements = () => {
      const achievementAlert = alerts.find(a => a.id === 'goal_achievement' && a.enabled)
      const under80Alert = alerts.find(a => a.id === 'goal_under_80' && a.enabled)
      
      ;(['weekly', 'monthly', 'yearly'] as const).forEach((period) => {
        const goal = getGoal(period)
        if (!goal || !goal.enabled || goal.targetRevenue === 0) return
        
        const progress = getGoalProgress(period)
        if (!progress) return
        
        const periodLabel = period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'Yearly'
        
        // Goal Achievement (100% or more)
        if (achievementAlert && progress.percentage >= (achievementAlert.threshold || 100)) {
          // Check if notification already exists for this goal today
          const today = new Date().toISOString().split('T')[0]
          const existingNotification = (notifications || []).find(
            n => n.type === 'goal_achieved' && 
                 n.period === period && 
                 n.timestamp.startsWith(today)
          )
          
          if (!existingNotification && achievementAlert.methods.includes('dashboard_badge')) {
            addNotification({
              type: 'goal_achieved',
              title: `🎉 ${periodLabel} Goal Achieved!`,
              message: `Congratulations! You've reached ${periodLabel.toLowerCase()} sales goal of ${formatCurrency(goal.targetRevenue, currency)}. Current: ${formatCurrency(progress.currentRevenue, currency)} (${progress.percentage.toFixed(1)}%)`,
              period,
              goalId: goal.id,
              currentRevenue: progress.currentRevenue,
              targetRevenue: goal.targetRevenue,
              percentage: progress.percentage
            })
          }
        }
        
        // Goal Under 80%
        if (under80Alert && progress.percentage < (under80Alert.threshold || 80)) {
          // Check if notification already exists for this goal today
          const today = new Date().toISOString().split('T')[0]
          const existingNotification = (notifications || []).find(
            n => n.type === 'goal_under_80' && 
                 n.period === period && 
                 n.timestamp.startsWith(today)
          )
          
          if (!existingNotification && under80Alert.methods.includes('dashboard_badge')) {
            addNotification({
              type: 'goal_under_80',
              title: `⚠️ ${periodLabel} Goal Below ${under80Alert.threshold}%`,
              message: `${periodLabel} sales goal is at ${progress.percentage.toFixed(1)}% (${formatCurrency(progress.currentRevenue, currency)} / ${formatCurrency(goal.targetRevenue, currency)})`,
              period,
              goalId: goal.id,
              currentRevenue: progress.currentRevenue,
              targetRevenue: goal.targetRevenue,
              percentage: progress.percentage
            })
          }
        }
      })
    }
    
    // Check immediately and then every 5 minutes
    checkGoalAchievements()
    const interval = setInterval(checkGoalAchievements, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [orders, goals, alerts, isSuperAdmin, getGoal, getGoalProgress, notifications, addNotification, formatCurrency, currency])
  
  // Export functions
  const handleExportData = () => {
    let data: any[] = []
    
    if (exportPeriod === 'weekly') {
      data = orders.filter(o => {
        const orderDate = new Date(o.createdAtIso)
        return orderDate >= weeklySales.weekStart && orderDate <= weeklySales.weekEnd && o.status !== 'cancelled'
      })
    } else if (exportPeriod === 'monthly') {
      data = orders.filter(o => {
        const orderDate = new Date(o.createdAtIso)
        return orderDate >= monthlySales.monthStart && orderDate <= monthlySales.monthEnd && o.status !== 'cancelled'
      })
    } else if (exportPeriod === 'yearly') {
      data = orders.filter(o => {
        const orderDate = new Date(o.createdAtIso)
        return orderDate >= yearlySales.yearStart && orderDate <= yearlySales.yearEnd && o.status !== 'cancelled'
      })
    }
    
    if (exportFormat === 'csv') {
      const csv = [
        ['Order ID', 'Date', 'Customer', 'Total', 'Status', 'Items'].join(','),
        ...data.map(order => [
          order.id,
          formatDate(new Date(order.createdAtIso), dateFormat, timezone),
          order.customerName || order.email || 'N/A',
          formatCurrency(order.total || 0, currency),
          order.status,
          order.items.length
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales_${exportPeriod}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMessage(`Exported ${data.length} orders as CSV`)
      setTimeout(() => setMessage(''), 5000)
    } else if (exportFormat === 'excel') {
      const csv = [
        ['Order ID', 'Date', 'Customer', 'Total', 'Status', 'Items'].join('\t'),
        ...data.map(order => [
          order.id,
          formatDate(new Date(order.createdAtIso), dateFormat, timezone),
          order.customerName || order.email || 'N/A',
          (order.total || 0).toString(),
          order.status,
          order.items.length.toString()
        ].join('\t'))
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/tab-separated-values;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales_${exportPeriod}_${new Date().toISOString().slice(0, 10)}.xls`
      a.click()
      URL.revokeObjectURL(url)
      setMessage(`Exported ${data.length} orders as Excel`)
      setTimeout(() => setMessage(''), 5000)
    } else if (exportFormat === 'pdf') {
      router.push('/admin/sales-overview')
      setMessage('Redirecting to Sales Overview for PDF export...')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title="Settings"
          icon={<Settings className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel="Dashboard"
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        {/* Main Content */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-[calc(100vh-120px)]">
          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-md flex-shrink-0 ${
              message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Sidebar Navigation */}
          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 lg:h-[calc(100vh-200px)]">
            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Menu className="h-5 w-5" />
                <span>Menu</span>
              </button>
            </div>

            {/* Sidebar */}
            <aside className={`
              ${isMobileMenuOpen ? 'block' : 'hidden'} lg:block
              ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} w-full
              flex-shrink-0
              bg-white border-r border-gray-200
              transition-all duration-300
              ${isMobileMenuOpen 
                ? 'fixed inset-y-0 left-0 z-50 h-screen overflow-hidden lg:relative lg:z-auto lg:h-full lg:overflow-visible' 
                : 'lg:h-full'
              }
            `}>
              <div className={`h-full flex flex-col ${isMobileMenuOpen ? 'h-screen' : 'lg:h-full lg:max-h-[calc(100vh-120px)]'}`}>
                {/* Mobile Close Button */}
                {isMobileMenuOpen && (
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                )}

                {/* Desktop Header */}
                <div className={`hidden lg:flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 ${isSidebarCollapsed ? 'flex-col gap-2' : ''}`}>
                  {!isSidebarCollapsed && <h2 className="text-lg font-semibold text-gray-900">Settings</h2>}
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                    title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {isSidebarCollapsed ? (
                      <ChevronRight className="h-5 w-5" />
                    ) : (
                      <ChevronLeft className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Tab Groups */}
                <nav className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin">
                  {tabGroups.map((group) => {
                    // Super admin only 그룹 체크
                    if (group.superAdminOnly && !isSuperAdmin) return null

                    const isExpanded = expandedGroups.has(group.id) && !isSidebarCollapsed
                    const GroupIcon = group.icon

                    return (
                      <div key={group.id} className="mb-3">
                        {/* Group Header */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (isSidebarCollapsed) {
                              setIsSidebarCollapsed(false)
                              return
                            }
                            
                            // currentTarget을 변수에 저장 (setTimeout 내부에서 사용하기 위해)
                            const targetElement = e.currentTarget
                            
                            const newExpanded = new Set(expandedGroups)
                            if (isExpanded) {
                              newExpanded.delete(group.id)
                            } else {
                              newExpanded.add(group.id)
                            }
                            setExpandedGroups(newExpanded)
                            
                            // 그룹이 펼쳐질 때 해당 그룹으로 스크롤
                            if (!isExpanded && targetElement) {
                              setTimeout(() => {
                                const groupElement = targetElement.closest('.mb-3')
                                if (groupElement) {
                                  groupElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                                }
                              }, 100)
                            }
                          }}
                          className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-md transition-colors cursor-pointer`}
                          title={isSidebarCollapsed ? group.label : ''}
                        >
                          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                            <Folder className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            {!isSidebarCollapsed && <span className="truncate">{group.label}</span>}
                          </div>
                          {!isSidebarCollapsed && (
                            <div className="flex-shrink-0 ml-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                          )}
                        </button>

                        {/* Group Tabs */}
                        {isExpanded && !isSidebarCollapsed && (
                          <div className="ml-2 mt-1.5 space-y-0.5">
                            {group.tabs.map((tab) => {
                              const TabIcon = tab.icon
                              const isActive = activeTab === tab.id

                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setActiveTab(tab.id)
                                    setIsMobileMenuOpen(false) // Mobile에서 탭 클릭 시 사이드바 닫기
                                  }}
                                  className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-all
                                    ${isActive
                                      ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-4 border-indigo-500'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                  `}
                                >
                                  <TabIcon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                                  <span className="truncate">{tab.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Collapsed Sidebar - Show only icons */}
                        {isSidebarCollapsed && (
                          <div className="mt-1.5 space-y-0.5">
                            {group.tabs.map((tab) => {
                              const TabIcon = tab.icon
                              const isActive = activeTab === tab.id

                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setActiveTab(tab.id)
                                    setIsSidebarCollapsed(false) // 탭 클릭 시 사이드바 확장
                                  }}
                                  className={`
                                    w-full flex items-center justify-center p-2.5 rounded-md transition-all
                                    ${isActive
                                      ? 'bg-indigo-50 text-indigo-700'
                                      : 'text-gray-600 hover:bg-gray-50'
                                    }
                                  `}
                                  title={tab.label}
                                >
                                  <TabIcon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </nav>
              </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden overflow-hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto w-full min-w-0 lg:max-h-[calc(100vh-200px)]">
            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <div className="bg-white shadow rounded-lg p-6 w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  {t('admin.settings.general.title')}
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.settings.general.language')}</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'ko' | 'en')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ko">{t('admin.settings.general.languageOptions.ko')}</option>
                      <option value="en">{t('admin.settings.general.languageOptions.en')}</option>
                    </select>
                  </div>

                  {/* Currency Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">{getCurrencyDisplayName('USD')}</option>
                      <option value="KRW">{getCurrencyDisplayName('KRW')}</option>
                      <option value="EUR">{getCurrencyDisplayName('EUR')}</option>
                      <option value="GBP">{getCurrencyDisplayName('GBP')}</option>
                      <option value="AUD">{getCurrencyDisplayName('AUD')}</option>
                      <option value="JPY">{getCurrencyDisplayName('JPY')}</option>
                      <option value="CNY">{getCurrencyDisplayName('CNY')}</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Preview: {formatCurrency(1234.56, currency)}
                    </p>
                  </div>

                  {/* Date Format Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD ({getDateFormatPreview('YYYY-MM-DD')})</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY ({getDateFormatPreview('MM/DD/YYYY')})</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY ({getDateFormatPreview('DD/MM/YYYY')})</option>
                      <option value="DD MMM YYYY">DD MMM YYYY ({getDateFormatPreview('DD MMM YYYY')})</option>
                      <option value="YYYY년 MM월 DD일">YYYY년 MM월 DD일 ({getDateFormatPreview('YYYY년 MM월 DD일')})</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Current preview: {getDateFormatPreview(dateFormat)}
                    </p>
                  </div>

                  {/* Timezone Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value as Timezone)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTC">{getTimezoneDisplayName('UTC')}</option>
                      <option value="Asia/Seoul">{getTimezoneDisplayName('Asia/Seoul')}</option>
                      <option value="America/New_York">{getTimezoneDisplayName('America/New_York')}</option>
                      <option value="America/Los_Angeles">{getTimezoneDisplayName('America/Los_Angeles')}</option>
                      <option value="Europe/London">{getTimezoneDisplayName('Europe/London')}</option>
                      <option value="Europe/Paris">{getTimezoneDisplayName('Europe/Paris')}</option>
                      <option value="Australia/Sydney">{getTimezoneDisplayName('Australia/Sydney')}</option>
                      <option value="Australia/Melbourne">{getTimezoneDisplayName('Australia/Melbourne')}</option>
                      <option value="Australia/Brisbane">{getTimezoneDisplayName('Australia/Brisbane')}</option>
                      <option value="Asia/Tokyo">{getTimezoneDisplayName('Asia/Tokyo')}</option>
                      <option value="Asia/Shanghai">{getTimezoneDisplayName('Asia/Shanghai')}</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Current time: {formatDateTime(new Date(), dateFormat, timezone)}
                    </p>
                  </div>

                  {/* Default Page Size Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Default Items Per Page
                    </label>
                    <select
                      value={defaultPageSize}
                      onChange={(e) => setDefaultPageSize(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={10}>10 items</option>
                      <option value={25}>25 items</option>
                      <option value={50}>50 items</option>
                      <option value={100}>100 items</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      This will be the default page size for all list pages (Orders, Products, Users, etc.)
                    </p>
                  </div>

                  {/* Theme Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Palette className="h-4 w-4 mr-2" />
                      Theme
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => {
                        const newTheme = e.target.value as 'light' | 'dark' | 'auto'
                        setTheme(newTheme)
                        // 즉시 테마 적용
                        if (typeof window !== 'undefined') {
                          const root = document.documentElement
                          if (newTheme === 'dark' || (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                            root.classList.add('dark')
                          } else {
                            root.classList.remove('dark')
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {typeof window !== 'undefined' && theme === 'auto' 
                        ? `Following system preference (${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'})`
                        : `Current theme: ${theme === 'dark' ? 'Dark Mode' : 'Light Mode'}`
                      }
                    </p>
                  </div>

                  {/* Auto Refresh Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Auto Refresh Interval
                    </label>
                    <select
                      value={autoRefreshInterval}
                      onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Off</option>
                      <option value={30000}>30 seconds</option>
                      <option value={60000}>1 minute</option>
                      <option value={300000}>5 minutes</option>
                      <option value={600000}>10 minutes</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {autoRefreshInterval === 0 
                        ? 'Auto refresh is disabled'
                        : `Data will automatically refresh every ${autoRefreshInterval / 1000} second(s) on dashboard and list pages`
                      }
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.settings.general.currentAdmin')}</label>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{adminUser?.username}</div>
                        <div className="text-sm text-gray-500 capitalize">{adminUser?.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Management Tab */}
            {activeTab === 'admin-management' && isSuperAdmin && (
              <div className="bg-white shadow rounded-lg p-6 w-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <UserPlus className="h-5 w-5 mr-2" />
                      {t('admin.settings.adminManagement.title') || 'Admin Management'}
                    </h3>
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                      {memoizedAdminUsers.length} {memoizedAdminUsers.length === 1 ? 'admin' : 'admins'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedAdmins.size > 0 && (
                      <button
                        onClick={() => {
                          setBulkPermissions([])
                          setIsBulkPermissionsModalOpen(true)
                        }}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Bulk Permission Management ({selectedAdmins.size})
                      </button>
                    )}
                    <button
                      onClick={() => setIsCompareModalOpen(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <GitCompare className="h-4 w-4 mr-2" />
                      Compare Permissions
                    </button>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('admin.settings.adminManagement.createNewAdmin') || 'Create New Admin'}
                    </button>
                  </div>
                </div>

                {/* Admin Users Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          <input
                            type="checkbox"
                            checked={selectedAdmins.size === memoizedAdminUsers.length && memoizedAdminUsers.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAdmins(new Set(memoizedAdminUsers.map(a => a.username)))
                              } else {
                                setSelectedAdmins(new Set())
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Login Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Permissions</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {memoizedAdminUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Users className="h-12 w-12 text-gray-400 mb-4" />
                              <p className="text-sm font-medium text-gray-900 mb-1">No administrators found</p>
                              <p className="text-xs text-gray-500 mb-4">Click "Create New Admin" to add an administrator</p>
                              {process.env.NODE_ENV === 'development' && (
                                <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded border border-gray-200 text-left max-w-md">
                                  <p className="font-medium mb-2">Debug Info:</p>
                                  <p>adminUsers.length: {adminUsers.length}</p>
                                  <p>memoizedAdminUsers.length: {memoizedAdminUsers.length}</p>
                                  <p>isSuperAdmin: {isSuperAdmin ? 'true' : 'false'}</p>
                                  <p>adminUser: {adminUser?.username || 'null'}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        memoizedAdminUsers.map((admin) => (
                        <tr key={admin.username} className={`hover:bg-gray-50 transition-colors ${selectedAdmins.has(admin.username) ? 'bg-indigo-50' : ''}`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedAdmins.has(admin.username)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedAdmins)
                                if (e.target.checked) {
                                  newSelected.add(admin.username)
                                } else {
                                  newSelected.delete(admin.username)
                                }
                                setSelectedAdmins(newSelected)
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  {admin.avatar ? (
                                    <img 
                                      src={admin.avatar} 
                                      alt={admin.username}
                                      className="h-10 w-10 rounded-full object-cover border-2 border-indigo-200"
                                      onError={(e) => {
                                        // Fallback to icon if image fails to load
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const parent = target.parentElement
                                        if (parent) {
                                          parent.innerHTML = '<div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center"><svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>'
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                      <Users className="h-6 w-6 text-indigo-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{admin.username}</div>
                                  {admin.email && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {admin.email}
                                    </div>
                                  )}
                                  {admin.department && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {admin.department}
                                    </div>
                                  )}
                                  {admin.lastModified && (
                                    <div className="text-sm text-gray-500">
                                      {t('admin.settings.adminManagement.modified')}: {new Date(admin.lastModified).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {admin.role === 'super_admin' ? (
                                <Crown className="h-4 w-4 text-purple-600" />
                              ) : (
                                <Shield className="h-4 w-4 text-blue-600" />
                              )}
                              <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                                admin.role === 'super_admin' 
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                admin.username === adminUser?.username && adminUser ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {admin.username === adminUser?.username && adminUser ? 'Online' : 'Offline'}
                              </span>
                              {admin.lastLogin && (
                                <div className="text-xs text-gray-500">
                                  {new Date(admin.lastLogin).toLocaleString('en-US')}
                                </div>
                              )}
                              {!admin.lastLogin && (
                                <div className="text-xs text-gray-400">
                                  No login record
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{admin.permissions.length} permissions</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {admin.permissions.slice(0, 3).join(', ')}
                              {admin.permissions.length > 3 && '...'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => openPasswordModal(admin.username)}
                                className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Change Password"
                              >
                                <Lock className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => openPermissionsModal(admin.username)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                                title="Update Permissions"
                              >
                                <Shield className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => openProfileModal(admin.username)}
                                className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-md transition-colors"
                                title="Edit Profile"
                              >
                                <UserCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(admin.username)}
                                className={`p-2 rounded-md transition-colors ${
                                  admin.isActive 
                                    ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50' 
                                    : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                }`}
                                title="Toggle Status"
                              >
                                {admin.isActive ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                              {admin.username !== adminUser?.username && (
                                <button
                                  onClick={() => openDeleteModal(admin.username)}
                                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                                  title="Delete Admin"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Activity Log Tab */}
            {activeTab === 'activity-log' && isSuperAdmin && (
              <div className="bg-white shadow rounded-lg p-6 w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Activity Log
                </h3>
                
                <ActivityLogView />
              </div>
            )}

            {/* Session Management Tab */}
            {activeTab === 'sessions' && isSuperAdmin && (
              <div className="bg-white shadow rounded-lg p-6 w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Session Management
                </h3>
                
                <SessionManagementView />
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-white shadow rounded-lg p-6 w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <ShieldCheck className="h-5 w-5 mr-2" />
                  {t('admin.settings.security.title')}
                </h3>
                
                <div className="space-y-6">
                  {/* Change My Username Section */}
                  <div className="border-b border-gray-200 pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Change My Username
                      </h4>
                      <button
                        onClick={() => {
                          setNewUsername(adminUser?.username || '')
                          setIsUsernameModalOpen(true)
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Change Username
                      </button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Current Username: <span className="font-medium text-gray-900">{adminUser?.username}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Username must be at least 3 characters and cannot be used if another admin is already using it.
                      </p>
                    </div>
                  </div>

                  {/* 내 비밀번호 변경 섹션 */}
                  <div className="border-b border-gray-200 pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900 flex items-center">
                        <Key className="h-4 w-4 mr-2" />
                        {t('admin.settings.security.changeMyPassword')}
                      </h4>
                      <button
                        onClick={() => setIsMyPasswordModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {t('admin.settings.security.changePasswordButton')}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('admin.settings.security.changePasswordRecommendation')}
                    </p>
                  </div>

                  {/* My Profile Section */}
                  <div className="border-b border-gray-200 pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900 flex items-center">
                        <UserCircle className="h-4 w-4 mr-2" />
                        My Profile
                      </h4>
                      <button
                        onClick={() => {
                          if (adminUser) {
                            setProfileData({
                              username: adminUser.username,
                              email: adminUser.email || '',
                              phone: adminUser.phone || '',
                              department: adminUser.department || '',
                              notes: adminUser.notes || '',
                              avatar: adminUser.avatar || ''
                            })
                            setIsMyProfileModalOpen(true)
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit My Profile
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {adminUser?.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">Email:</span>
                            <span>{adminUser.email}</span>
                          </div>
                        )}
                        {adminUser?.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span className="font-medium">Phone:</span>
                            <span>{adminUser.phone}</span>
                          </div>
                        )}
                        {adminUser?.department && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">Department:</span>
                            <span>{adminUser.department}</span>
                          </div>
                        )}
                        {adminUser?.avatar && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <ImageIcon className="h-4 w-4" />
                            <span className="font-medium">Avatar:</span>
                            <span className="truncate max-w-xs">{adminUser.avatar}</span>
                          </div>
                        )}
                      </div>
                      {adminUser?.notes && (
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Notes:</span>
                          <p className="mt-1 text-gray-500">{adminUser.notes}</p>
                        </div>
                      )}
                      {(!adminUser?.email && !adminUser?.phone && !adminUser?.department && !adminUser?.avatar && !adminUser?.notes) && (
                        <p className="text-sm text-gray-500">No profile information set. Click "Edit My Profile" to add information.</p>
                      )}
                    </div>
                  </div>

                  {/* Password Policy Section */}
                  <PasswordPolicySection />

                  {/* IP Control Section */}
                  {isSuperAdmin && <IPControlSection />}

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">{t('admin.settings.security.accessControl')}</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-600">{t('admin.settings.security.roleBasedPermissions')}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-600">{t('admin.settings.security.superAdminAccess')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white shadow rounded-lg p-6 w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  {t('admin.settings.notifications.title')}
                </h3>
                
                <div className="space-y-6">
                  {/* Success Message */}
                  {message && message.includes('successfully') && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
                      {message}
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">{t('admin.settings.notifications.emailNotifications')}</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Configure which email notifications you want to receive. Settings are saved automatically.
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer" 
                          checked={notificationSettings.orderConfirmations}
                          onChange={(e) => handleNotificationChange('orderConfirmations', e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('admin.settings.notifications.orderConfirmations')}</span>
                      </label>
                      <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer" 
                          checked={notificationSettings.systemAlerts}
                          onChange={(e) => handleNotificationChange('systemAlerts', e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('admin.settings.notifications.systemAlerts')}</span>
                      </label>
                      <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer" 
                          checked={notificationSettings.weeklyReports}
                          onChange={(e) => handleNotificationChange('weeklyReports', e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('admin.settings.notifications.weeklyReports')}</span>
                      </label>
                      <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer" 
                          checked={notificationSettings.salesReports}
                          onChange={(e) => handleNotificationChange('salesReports', e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('admin.settings.notifications.salesReports')}</span>
                      </label>
                      <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer" 
                          checked={notificationSettings.orderNotifications}
                          onChange={(e) => handleNotificationChange('orderNotifications', e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('admin.settings.notifications.orderNotifications')}</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Current Admin Info */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      These settings are specific to <span className="font-medium text-gray-700">{currentUsername}</span>. 
                      Each administrator can configure their own notification preferences.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Media Tab - Watermark Settings */}
            {activeTab === 'media' && (
              <div className="bg-white shadow rounded-lg p-6 w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Media Settings
                </h3>
                
                <div className="space-y-6">
                  {/* Watermark Image Upload */}
                  <div className="border rounded-lg p-6 bg-gray-50">
                    <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2 text-blue-600" />
                      Watermark Image
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Upload a watermark image that will be applied to all images during upload. Recommended: PNG with transparent background.
                    </p>
                    
                    <div className="space-y-4">
                      {watermarkSettings.imageUrl ? (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-4">
                            <img
                              src={watermarkSettings.imageUrl}
                              alt="Watermark preview"
                              className="h-24 w-24 object-contain border border-gray-200 rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 mb-1">Current Watermark</p>
                              <p className="text-xs text-gray-500 mb-3">
                                This watermark will be applied to images when "Apply Watermark" is checked in EditStage.
                              </p>
                              <button
                                onClick={() => {
                                  const input = document.createElement('input')
                                  input.type = 'file'
                                  input.accept = 'image/*'
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0]
                                    if (file) {
                                      const reader = new FileReader()
                                      reader.onload = (event) => {
                                        const result = event.target?.result as string
                                        setWatermarkImage(result)
                                        setMessage('Watermark image updated successfully')
                                        setTimeout(() => setMessage(''), 3000)
                                      }
                                      reader.readAsDataURL(file)
                                    }
                                  }
                                  input.click()
                                }}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                              >
                                Change Image
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                updateWatermarkSettings({ imageUrl: null, enabled: false })
                                setMessage('Watermark image removed')
                                setTimeout(() => setMessage(''), 3000)
                              }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-600 mb-4">No watermark image uploaded</p>
                          <button
                            onClick={() => {
                              const input = document.createElement('input')
                              input.type = 'file'
                              input.accept = 'image/*'
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0]
                                if (file) {
                                  const reader = new FileReader()
                                  reader.onload = (event) => {
                                    const result = event.target?.result as string
                                    setWatermarkImage(result)
                                    setMessage('Watermark image uploaded successfully')
                                    setTimeout(() => setMessage(''), 3000)
                                  }
                                  reader.readAsDataURL(file)
                                }
                              }
                              input.click()
                            }}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                          >
                            Upload Watermark Image
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watermark Settings */}
                  {watermarkSettings.imageUrl && (
                    <div className="border rounded-lg p-6 bg-gray-50">
                      <h4 className="text-md font-medium text-gray-900 mb-4">Watermark Settings</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Position
                          </label>
                          <select
                            value={watermarkSettings.position}
                            onChange={(e) => updateWatermarkSettings({ position: e.target.value as WatermarkPosition })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opacity: {(watermarkSettings.opacity * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={watermarkSettings.opacity}
                            onChange={(e) => updateWatermarkSettings({ opacity: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Size: {(watermarkSettings.size * 100).toFixed(0)}% of image
                          </label>
                          <input
                            type="range"
                            min="0.05"
                            max="0.5"
                            step="0.05"
                            value={watermarkSettings.size}
                            onChange={(e) => updateWatermarkSettings({ size: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Margin: {watermarkSettings.margin}px
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="5"
                            value={watermarkSettings.margin}
                            onChange={(e) => updateWatermarkSettings({ margin: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

                         {/* System Tab */}
             {activeTab === 'system' && isSuperAdmin && (
               <div className="bg-white shadow rounded-lg p-6 w-full">
                 <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                   <Database className="h-5 w-5 mr-2" />
                   {t('admin.settings.system.title')}
                 </h3>
                 
                 <div className="space-y-6">
                   <div>
                     <h4 className="text-md font-medium text-gray-900 mb-3">{t('admin.settings.system.systemInformation')}</h4>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <div className="p-3 bg-gray-50 rounded-md">
                         <div className="text-sm font-medium text-gray-500">{t('admin.settings.system.totalAdmins')}</div>
                         <div className="text-lg font-semibold text-gray-900">{adminUsers.length}</div>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-md">
                         <div className="text-sm font-medium text-gray-500">{t('admin.settings.system.activeAdmins')}</div>
                         <div className="text-lg font-semibold text-gray-900">{adminUsers.filter(a => a.isActive).length}</div>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-md">
                         <div className="text-sm font-medium text-gray-500">Total Orders</div>
                         <div className="text-lg font-semibold text-gray-900">{systemStats.totalOrders}</div>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-md">
                         <div className="text-sm font-medium text-gray-500">Total Products</div>
                         <div className="text-lg font-semibold text-gray-900">{systemStats.totalProducts}</div>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-md">
                         <div className="text-sm font-medium text-gray-500">Total Users</div>
                         <div className="text-lg font-semibold text-gray-900">{systemStats.totalUsers}</div>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-md">
                         <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                         <div className="text-lg font-semibold text-gray-900">{formatCurrency(systemStats.totalRevenue, currency)}</div>
                       </div>
                     </div>
                     
                     {/* Storage Usage */}
                     <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                       <div className="flex items-center justify-between mb-2">
                         <div className="text-sm font-medium text-gray-700">LocalStorage Usage</div>
                         <div className={`text-sm font-semibold ${
                           localStorageUsage.percentage > 80 
                             ? 'text-red-600' 
                             : localStorageUsage.percentage > 60 
                             ? 'text-yellow-600' 
                             : 'text-green-600'
                         }`}>
                           {localStorageUsage.percentage.toFixed(1)}%
                         </div>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                         <div 
                           className={`h-2.5 rounded-full transition-all ${
                             localStorageUsage.percentage > 80 
                               ? 'bg-red-500' 
                               : localStorageUsage.percentage > 60 
                               ? 'bg-yellow-500' 
                               : 'bg-green-500'
                           }`}
                           style={{ width: `${Math.min(localStorageUsage.percentage, 100)}%` }}
                         />
                       </div>
                       <div className="text-xs text-gray-600">
                         {formatSize(localStorageUsage.current)} / ~{formatSize(localStorageUsage.max)}
                         {localStorageUsage.percentage > 80 && (
                           <span className="ml-2 text-red-600 font-medium">⚠️ High usage - Consider cleanup</span>
                         )}
                       </div>
                     </div>
                     
                     {/* Activity Log Info */}
                     <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                       <div className="flex items-center justify-between mb-2">
                         <div className="text-sm font-medium text-gray-700">Activity Log</div>
                         <div className="text-sm font-semibold text-gray-900">
                           {systemStats.activityLogSize.toLocaleString()} entries
                         </div>
                       </div>
                       <div className="text-xs text-gray-600">
                         Size: {systemStats.activityLogSizeInMB.toFixed(2)} MB
                         {systemStats.activityLogSize > 5000 && (
                           <span className="ml-2 text-yellow-600 font-medium">⚠️ Consider cleanup</span>
                         )}
                       </div>
                     </div>
                     
                     {systemStats.lastBackupTime && (
                       <div className="mt-4 p-3 bg-blue-50 rounded-md">
                         <div className="text-sm font-medium text-gray-700">Last Backup</div>
                         <div className="text-sm text-gray-600">
                           {formatDateTime(systemStats.lastBackupTime, dateFormat, timezone)}
                         </div>
                         {(() => {
                           const daysSinceBackup = Math.floor((Date.now() - systemStats.lastBackupTime.getTime()) / (1000 * 60 * 60 * 24))
                           if (daysSinceBackup > 7) {
                             return (
                               <div className="text-xs text-yellow-600 mt-1 font-medium">
                                 ⚠️ Last backup was {daysSinceBackup} days ago
                               </div>
                             )
                           }
                           return null
                         })()}
                       </div>
                     )}
                   </div>

                   <div>
                     <h4 className="text-md font-medium text-gray-900 mb-3">{t('admin.settings.system.systemActions')}</h4>
                     <p className="text-xs text-gray-500 mb-4">
                       System maintenance and diagnostic tools. Use with caution.
                     </p>
                     <div className="space-y-3">
                       <button 
                         onClick={handleClearCache}
                         disabled={isLoading}
                         className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                         <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                         {t('admin.settings.system.clearCache')}
                       </button>
                       <button 
                         onClick={handleBackupDataWithTime}
                         disabled={isLoading}
                         className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                         <FileText className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                         {t('admin.settings.system.backupData')}
                       </button>
                       <button 
                         onClick={() => setIsRestoreModalOpen(true)}
                         disabled={isLoading}
                         className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                         <FileText className="h-4 w-4" />
                         Restore Data
                       </button>
                       <button 
                         onClick={handleHealthCheck}
                         disabled={isLoading}
                         className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                         <ShieldCheck className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                         {t('admin.settings.system.healthCheck')}
                       </button>
                       <button 
                         onClick={() => {
                           const { deleteLogsByDate } = useAdminActivityLog.getState()
                           const confirmed = window.confirm(
                             'This will delete all activity logs older than 30 days.\n\n' +
                             `Current logs: ${systemStats.activityLogSize.toLocaleString()} entries\n\n` +
                             'Are you sure you want to continue?'
                           )
                           if (confirmed) {
                             try {
                               setIsLoading(true)
                               const thirtyDaysAgo = new Date()
                               thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                               deleteLogsByDate(thirtyDaysAgo)
                               setMessage(`Activity logs older than 30 days have been cleaned up.`)
                               setTimeout(() => setMessage(''), 5000)
                               setIsLoading(false)
                             } catch (error) {
                               setMessage('Error cleaning up activity logs. Please try again.')
                               setTimeout(() => setMessage(''), 5000)
                               setIsLoading(false)
                             }
                           }
                         }}
                         disabled={isLoading || systemStats.activityLogSize === 0}
                         className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                         <Trash2 className="h-4 w-4" />
                         Clean Old Activity Logs (30+ days)
                       </button>
                     </div>
                     {message && (
                       <div className={`mt-4 p-3 rounded-md text-sm ${
                         message.includes('successfully') || message.includes('completed') 
                           ? 'bg-green-100 text-green-700' 
                           : 'bg-red-100 text-red-700'
                       }`}>
                         {message}
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}

            {/* Restore Data Modal */}
            {isRestoreModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 my-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Restore Data from Backup</h3>
                    <button
                      onClick={() => {
                        setIsRestoreModalOpen(false)
                        setRestoreFile(null)
                        setRestorePreview(null)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Backup File (.json)
                      </label>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreFileSelect}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {restorePreview && (
                      <div className="p-4 bg-gray-50 rounded-md">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Backup File Preview</h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Version: {restorePreview.version || 'Unknown'}</div>
                          <div>Timestamp: {restorePreview.timestamp ? new Date(restorePreview.timestamp).toLocaleString() : 'Unknown'}</div>
                          <div>Stores: {restorePreview.stores ? Object.keys(restorePreview.stores).length : 0}</div>
                          {restorePreview.allLocalStorage && (
                            <div>Total Items: {Object.keys(restorePreview.allLocalStorage).length}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                      <p className="text-xs text-blue-800">
                        ✅ <strong>Safety Feature:</strong> A backup of your current data will be created automatically before restore. 
                        If restore fails, your previous state will be automatically restored.
                      </p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-xs text-yellow-800">
                        ⚠️ <strong>Warning:</strong> Restoring data will replace all current data with the backup data. 
                        This action will be performed in a transaction-safe manner.
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setIsRestoreModalOpen(false)
                          setRestoreFile(null)
                          setRestorePreview(null)
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRestoreData}
                        disabled={!restorePreview || isLoading}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Restoring...' : 'Restore Data'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

             {/* Sales Tab */}
             {activeTab === 'sales' && isSuperAdmin && (
               <div className="bg-white shadow rounded-lg p-6 w-full">
                 <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                   <Database className="h-5 w-5 mr-2" />
                   {t('admin.settings.sales.title')}
                 </h3>
                 <p className="text-sm text-gray-600 mb-6">{t('admin.settings.sales.subtitle')}</p>
                 
                 <div className="space-y-8">
                   {/* Quick Link to Sales Overview */}
                   <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                     <div className="flex items-center justify-between">
                       <div>
                         <h4 className="text-sm font-medium text-indigo-900 mb-1">View Detailed Analytics</h4>
                         <p className="text-xs text-indigo-700">Access comprehensive sales reports, charts, and analysis</p>
                       </div>
                       <button
                         onClick={() => router.push('/admin/sales-overview')}
                         className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                       >
                         <ExternalLink className="h-4 w-4" />
                         Go to Sales Overview
                       </button>
                     </div>
                   </div>

                   {/* Sales Goals Section */}
                   <div className="border rounded-lg p-6 bg-gray-50">
                     <div className="flex items-center justify-between mb-4">
                       <h4 className="text-lg font-medium text-gray-900 flex items-center">
                         <Target className="h-5 w-5 mr-2 text-indigo-600" />
                         Sales Goals
                       </h4>
                       <div className="text-xs text-gray-500">
                         Click "Edit" on each goal card to set targets
                       </div>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       {(['weekly', 'monthly', 'yearly'] as const).map((period) => {
                         const goal = getGoal(period)
                         const progress = getGoalProgress(period)
                         const periodLabel = period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'Yearly'
                         
                         return (
                           <div key={period} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                             <div className="flex items-center justify-between mb-2">
                               <div className="text-sm font-medium text-gray-700">{periodLabel} Goal</div>
                               <button
                                 onClick={() => {
                                   setEditingGoal(period)
                                   const currentGoal = getGoal(period)
                                   setGoalFormData({
                                     targetRevenue: currentGoal?.targetRevenue || 0,
                                     targetOrders: currentGoal?.targetOrders || 0,
                                     enabled: currentGoal?.enabled || false
                                   })
                                   setIsGoalModalOpen(true)
                                 }}
                                 className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                 title={`Edit ${periodLabel} Goal`}
                               >
                                 <Edit className="h-3 w-3" />
                                 Edit
                               </button>
                             </div>
                             {goal?.enabled && goal.targetRevenue > 0 ? (
                               <>
                                 <div className="text-lg font-bold text-gray-900 mb-1">
                                   {formatCurrency(progress?.currentRevenue || 0, currency)}
                                 </div>
                                 <div className="text-xs text-gray-500 mb-2">
                                   / {formatCurrency(goal.targetRevenue, currency)}
                                 </div>
                                 <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                   <div
                                     className={`h-2 rounded-full transition-all ${
                                       (progress?.percentage || 0) >= 100 ? 'bg-green-500' :
                                       (progress?.percentage || 0) >= 80 ? 'bg-blue-500' :
                                       (progress?.percentage || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                     }`}
                                     style={{ width: `${Math.min(progress?.percentage || 0, 100)}%` }}
                                   />
                                 </div>
                                 <div className="text-xs font-medium text-gray-600">
                                   {(progress?.percentage || 0).toFixed(1)}%
                                 </div>
                                 {goal.targetOrders && goal.targetOrders > 0 && (
                                   <div className="text-xs text-gray-500 mt-1">
                                     Orders: {progress ? Math.floor((progress.currentRevenue / goal.targetRevenue) * (goal.targetOrders || 0)) : 0} / {goal.targetOrders}
                                   </div>
                                 )}
                               </>
                             ) : (
                               <div className="text-center py-4">
                                 <div className="text-sm text-gray-400 mb-2">Not set</div>
                                 <button
                                   onClick={() => {
                                     setEditingGoal(period)
                                     setGoalFormData({
                                       targetRevenue: 0,
                                       targetOrders: 0,
                                       enabled: false
                                     })
                                     setIsGoalModalOpen(true)
                                   }}
                                   className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                 >
                                   Set Goal
                                 </button>
                               </div>
                             )}
                           </div>
                         )
                       })}
                     </div>
                   </div>

                   {/* Weekly Sales */}
                   <div className="border rounded-lg p-6 bg-blue-50">
                     <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                       <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                       {t('admin.settings.sales.weekly')} {t('admin.settings.sales.revenue')}
                     </h4>
                     {(() => {
                       const progress = getGoalProgress('weekly')
                       return (
                         <>
                           {progress && (
                             <div className="mb-4 p-3 bg-white rounded-lg">
                               <div className="flex items-center justify-between mb-2">
                                 <span className="text-sm font-medium text-gray-700">Goal Progress</span>
                                 <span className={`text-sm font-semibold ${
                                   progress.percentage >= 100 ? 'text-green-600' :
                                   progress.percentage >= 80 ? 'text-blue-600' :
                                   progress.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                                 }`}>
                                   {progress.percentage.toFixed(1)}%
                                 </span>
                               </div>
                               <div className="w-full bg-gray-200 rounded-full h-2.5">
                                 <div
                                   className={`h-2.5 rounded-full transition-all ${
                                     progress.percentage >= 100 ? 'bg-green-500' :
                                     progress.percentage >= 80 ? 'bg-blue-500' :
                                     progress.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                   }`}
                                   style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                                 />
                               </div>
                             </div>
                           )}
                           <div className="grid grid-cols-3 gap-4 mb-4">
                             <div className="text-center">
                               <div className="text-2xl font-bold text-blue-600">{formatCurrency(weeklySales.totalRevenue, currency)}</div>
                               <div className="text-sm text-gray-600">{t('admin.settings.sales.totalRevenue')}</div>
                             </div>
                             <div className="text-center">
                               <div className="text-2xl font-bold text-blue-600">{weeklySales.totalOrders}</div>
                               <div className="text-sm text-gray-600">{t('admin.settings.sales.totalOrders')}</div>
                             </div>
                             <div className="text-center">
                               <div className="text-2xl font-bold text-blue-600">{formatCurrency(weeklySales.averageOrderValue, currency)}</div>
                               <div className="text-sm text-gray-600">{t('admin.settings.sales.averageOrderValue')}</div>
                             </div>
                           </div>
                           <div className="text-sm text-gray-500 text-center">
                             {t('admin.settings.sales.dateRange')}: {formatDate(weeklySales.weekStart, dateFormat, timezone)} ~ {formatDate(weeklySales.weekEnd, dateFormat, timezone)}
                           </div>
                         </>
                       )
                     })()}
                   </div>

                   {/* Monthly Sales */}
                   <div className="border rounded-lg p-6 bg-green-50">
                     <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                       <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                       {t('admin.settings.sales.monthly')} {t('admin.settings.sales.revenue')}
                     </h4>
                     <div className="grid grid-cols-3 gap-4 mb-4">
                       <div className="text-center">
                         <div className="text-2xl font-bold text-green-600">{formatCurrency(monthlySales.totalRevenue, currency)}</div>
                         <div className="text-sm text-gray-600">{t('admin.settings.sales.totalRevenue')}</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-green-600">{monthlySales.totalOrders}</div>
                         <div className="text-sm text-gray-600">{t('admin.settings.sales.totalOrders')}</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-green-600">{formatCurrency(monthlySales.averageOrderValue, currency)}</div>
                         <div className="text-sm text-gray-600">{t('admin.settings.sales.averageOrderValue')}</div>
                       </div>
                     </div>
                     <div className="text-sm text-gray-500 text-center">
                       {t('admin.settings.sales.dateRange')}: {formatDate(monthlySales.monthStart, dateFormat, timezone)} ~ {formatDate(monthlySales.monthEnd, dateFormat, timezone)}
                     </div>
                   </div>

                   {/* Yearly Sales */}
                   <div className="border rounded-lg p-6 bg-purple-50">
                     <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                       <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                       {t('admin.settings.sales.yearly')} {t('admin.settings.sales.revenue')}
                     </h4>
                     <div className="grid grid-cols-3 gap-4 mb-4">
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-600">{formatCurrency(yearlySales.totalRevenue, currency)}</div>
                         <div className="text-sm text-gray-600">{t('admin.settings.sales.totalRevenue')}</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-600">{yearlySales.totalOrders}</div>
                         <div className="text-sm text-gray-600">{t('admin.settings.sales.totalOrders')}</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-600">{formatCurrency(yearlySales.averageOrderValue, currency)}</div>
                         <div className="text-sm text-gray-600">{t('admin.settings.sales.averageOrderValue')}</div>
                       </div>
                     </div>
                     <div className="text-sm text-gray-500 text-center">
                       {t('admin.settings.sales.dateRange')}: {formatDate(yearlySales.yearStart, dateFormat, timezone)} ~ {formatDate(yearlySales.yearEnd, dateFormat, timezone)}
                     </div>
                   </div>

                   {/* Alerts & Notifications Section */}
                   <div className="border rounded-lg p-6 bg-gray-50">
                     <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                       <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                       Alerts & Notifications
                     </h4>
                     <div className="space-y-4">
                       {alerts.map((alert) => {
                         const alertLabel = alert.type === 'goal_under_80' 
                           ? 'Goal Achievement Below 80%'
                           : alert.type === 'revenue_drop'
                           ? 'Revenue Drop Alert'
                           : alert.type === 'zero_revenue'
                           ? 'Zero Revenue Alert'
                           : 'Goal Achievement Alert'
                         
                         return (
                           <div key={alert.id} className="bg-white p-4 rounded-lg border">
                             <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-2">
                                 <input
                                   type="checkbox"
                                   checked={alert.enabled}
                                   onChange={(e) => {
                                     setAlert({ ...alert, enabled: e.target.checked })
                                   }}
                                   className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                 />
                                 <label className="text-sm font-medium text-gray-900">{alertLabel}</label>
                               </div>
                               <button
                                 onClick={() => {
                                   setEditingAlert(alert.id)
                                   const currentAlert = alerts.find(a => a.id === alert.id)
                                   if (currentAlert) {
                                     setAlertFormData({
                                       enabled: currentAlert.enabled,
                                       threshold: currentAlert.threshold || (currentAlert.type === 'goal_achievement' ? 100 : 80),
                                       recipients: typeof currentAlert.recipients === 'string' ? currentAlert.recipients : 'super_admin',
                                       methods: currentAlert.methods
                                     })
                                   }
                                   setIsAlertModalOpen(true)
                                 }}
                                 className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                               >
                                 <Edit className="h-3 w-3" />
                                 Configure
                               </button>
                             </div>
                             {alert.enabled && (
                               <div className="text-xs text-gray-600 space-y-1">
                                 {alert.threshold !== undefined && (
                                   <div>Threshold: {alert.threshold}%</div>
                                 )}
                                 <div>Recipients: {alert.recipients === 'super_admin' ? 'Super Admin Only' : alert.recipients === 'all_admins' ? 'All Admins' : alert.recipients.join(', ')}</div>
                                 <div>Methods: {alert.methods.join(', ')}</div>
                               </div>
                             )}
                           </div>
                         )
                       })}
                     </div>
                   </div>

                   {/* Report Scheduling Section */}
                   <div className="border rounded-lg p-6 bg-gray-50">
                     <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                       <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                       Report Scheduling
                     </h4>
                     <div className="space-y-4">
                       {reportSchedules.map((schedule) => {
                         const scheduleLabel = schedule.id === 'daily' 
                           ? 'Daily Report'
                           : schedule.id === 'weekly'
                           ? 'Weekly Report'
                           : 'Monthly Report'
                         
                         return (
                           <div key={schedule.id} className="bg-white p-4 rounded-lg border">
                             <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-2">
                                 <input
                                   type="checkbox"
                                   checked={schedule.enabled}
                                   onChange={(e) => {
                                     setReportSchedule({ ...schedule, enabled: e.target.checked })
                                   }}
                                   className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                 />
                                 <label className="text-sm font-medium text-gray-900">{scheduleLabel}</label>
                               </div>
                               <button
                                 onClick={() => {
                                   setEditingReport(schedule.id)
                                   const currentSchedule = reportSchedules.find(s => s.id === schedule.id)
                                   if (currentSchedule) {
                                     setReportFormData({
                                       enabled: currentSchedule.enabled,
                                       day: currentSchedule.day || (currentSchedule.id === 'weekly' ? 1 : 1),
                                       time: currentSchedule.time,
                                       format: currentSchedule.format,
                                       recipients: currentSchedule.recipients.join(', '),
                                       includeCharts: currentSchedule.includeCharts,
                                       includeDetails: currentSchedule.includeDetails
                                     })
                                   }
                                   setIsReportModalOpen(true)
                                 }}
                                 className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                               >
                                 <Edit className="h-3 w-3" />
                                 Configure
                               </button>
                             </div>
                             {schedule.enabled && (
                               <div className="text-xs text-gray-600 space-y-1">
                                 <div>
                                   {schedule.id === 'daily' && `Time: ${schedule.time}`}
                                   {schedule.id === 'weekly' && `Day: ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][(schedule.day || 1) - 1]} at ${schedule.time}`}
                                   {schedule.id === 'monthly' && `Day: ${schedule.day} at ${schedule.time}`}
                                 </div>
                                 <div>Format: {schedule.format.join(', ')}</div>
                                 <div>Recipients: {schedule.recipients.length > 0 ? schedule.recipients.join(', ') : 'None'}</div>
                                 <div>
                                   {schedule.includeCharts && 'Charts'} {schedule.includeCharts && schedule.includeDetails && '•'} {schedule.includeDetails && 'Details'}
                                 </div>
                               </div>
                             )}
                           </div>
                         )
                       })}
                     </div>
                   </div>

                   {/* Export Data Section */}
                   <div className="border rounded-lg p-6 bg-gray-50">
                     <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                       <Download className="h-5 w-5 mr-2 text-indigo-600" />
                       Export Data
                     </h4>
                     <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                           <select
                             value={exportPeriod}
                             onChange={(e) => setExportPeriod(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                             <option value="weekly">Weekly</option>
                             <option value="monthly">Monthly</option>
                             <option value="yearly">Yearly</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                           <select
                             value={exportFormat}
                             onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel' | 'pdf')}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                             <option value="csv">CSV</option>
                             <option value="excel">Excel</option>
                             <option value="pdf">PDF</option>
                           </select>
                         </div>
                       </div>
                       <button
                         onClick={handleExportData}
                         className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 flex items-center justify-center gap-2"
                       >
                         <Download className="h-4 w-4" />
                         {t('admin.settings.sales.exportData')}
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}
            </div>
          </div>
        </main>

        {/* Alert Configuration Modal */}
        {isAlertModalOpen && editingAlert && (() => {
          const alert = alerts.find(a => a.id === editingAlert)
          if (!alert) return null
          
          // Use alertFormData from component state
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {alert.type === 'goal_achievement'
                      ? 'Goal Achievement Alert (100%)'
                      : alert.type === 'goal_under_80' 
                      ? 'Goal Achievement Below 80% Alert'
                      : alert.type === 'revenue_drop'
                      ? 'Revenue Drop Alert'
                      : 'Zero Revenue Alert'}
                  </h3>
                  <button
                    onClick={() => {
                      setIsAlertModalOpen(false)
                      setEditingAlert(null)
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={alertFormData.enabled}
                        onChange={(e) => setAlertFormData({ ...alertFormData, enabled: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable this alert</span>
                    </label>
                  </div>
                  {alert.type !== 'zero_revenue' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Threshold ({alert.type === 'goal_achievement' ? 'Achievement Percentage (default: 100%)' : alert.type === 'goal_under_80' ? 'Percentage' : 'Drop Percentage'})
                      </label>
                      <input
                        type="number"
                        value={alertFormData.threshold}
                        onChange={(e) => setAlertFormData({ ...alertFormData, threshold: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={alert.type === 'goal_achievement' ? '100' : alert.type === 'goal_under_80' ? '80' : '20'}
                        min="0"
                        max={alert.type === 'goal_achievement' ? '200' : alert.type === 'goal_under_80' ? '100' : '100'}
                        step="0.1"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                    <select
                      value={typeof alertFormData.recipients === 'string' ? alertFormData.recipients : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'super_admin' || e.target.value === 'all_admins') {
                          setAlertFormData({ ...alertFormData, recipients: e.target.value as 'super_admin' | 'all_admins' })
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="super_admin">Super Admin Only</option>
                      <option value="all_admins">All Admins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notification Methods</label>
                    <div className="space-y-2">
                      {['email', 'dashboard_badge', 'browser'].map((method) => (
                        <label key={method} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={alertFormData.methods.includes(method as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAlertFormData({
                                  ...alertFormData,
                                  methods: [...alertFormData.methods, method as any]
                                })
                              } else {
                                setAlertFormData({
                                  ...alertFormData,
                                  methods: alertFormData.methods.filter(m => m !== method)
                                })
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">
                            {method === 'dashboard_badge' ? 'Dashboard Badge' : method}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsAlertModalOpen(false)
                        setEditingAlert(null)
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setAlert({
                          ...alert,
                          enabled: alertFormData.enabled,
                          threshold: alertFormData.threshold,
                          recipients: alertFormData.recipients,
                          methods: alertFormData.methods
                        })
                        setMessage('Alert configuration saved successfully')
                        setTimeout(() => setMessage(''), 5000)
                        setIsAlertModalOpen(false)
                        setEditingAlert(null)
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                      Save Alert
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Report Schedule Modal */}
        {isReportModalOpen && editingReport && (() => {
          const schedule = reportSchedules.find(s => s.id === editingReport)
          if (!schedule) return null
          
          // Use reportFormData from component state
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingReport === 'daily' ? 'Daily' : editingReport === 'weekly' ? 'Weekly' : 'Monthly'} Report Schedule
                  </h3>
                  <button
                    onClick={() => {
                      setIsReportModalOpen(false)
                      setEditingReport(null)
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={reportFormData.enabled}
                        onChange={(e) => setReportFormData({ ...reportFormData, enabled: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable this schedule</span>
                    </label>
                  </div>
                  {editingReport === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                      <select
                        value={reportFormData.day}
                        onChange={(e) => setReportFormData({ ...reportFormData, day: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                        <option value={7}>Sunday</option>
                      </select>
                    </div>
                  )}
                  {editingReport === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
                      <select
                        value={reportFormData.day}
                        onChange={(e) => setReportFormData({ ...reportFormData, day: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={reportFormData.time}
                      onChange={(e) => setReportFormData({ ...reportFormData, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Format</label>
                    <div className="space-y-2">
                      {['pdf', 'excel', 'csv'].map((format) => (
                        <label key={format} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={reportFormData.format.includes(format as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReportFormData({
                                  ...reportFormData,
                                  format: [...reportFormData.format, format as any]
                                })
                              } else {
                                setReportFormData({
                                  ...reportFormData,
                                  format: reportFormData.format.filter(f => f !== format)
                                })
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 uppercase">{format}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipients (Email addresses, comma-separated)</label>
                    <input
                      type="text"
                      value={reportFormData.recipients}
                      onChange={(e) => setReportFormData({ ...reportFormData, recipients: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="admin@selpic.com.au, manager@selpic.com.au"
                    />
                    <p className="mt-1 text-xs text-gray-500">Enter email addresses separated by commas</p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={reportFormData.includeCharts}
                        onChange={(e) => setReportFormData({ ...reportFormData, includeCharts: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include Charts</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={reportFormData.includeDetails}
                        onChange={(e) => setReportFormData({ ...reportFormData, includeDetails: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include Details</span>
                    </label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsReportModalOpen(false)
                        setEditingReport(null)
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setReportSchedule({
                          ...schedule,
                          enabled: reportFormData.enabled,
                          day: reportFormData.day,
                          time: reportFormData.time,
                          format: reportFormData.format,
                          recipients: reportFormData.recipients.split(',').map(e => e.trim()).filter(e => e),
                          includeCharts: reportFormData.includeCharts,
                          includeDetails: reportFormData.includeDetails
                        })
                        setMessage(`${editingReport === 'daily' ? 'Daily' : editingReport === 'weekly' ? 'Weekly' : 'Monthly'} report schedule saved successfully`)
                        setTimeout(() => setMessage(''), 5000)
                        setIsReportModalOpen(false)
                        setEditingReport(null)
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                      Save Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Sales Goal Modal */}
        {isGoalModalOpen && editingGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Set {editingGoal === 'weekly' ? 'Weekly' : editingGoal === 'monthly' ? 'Monthly' : 'Yearly'} Goal
                </h3>
                <button
                  onClick={() => {
                    setIsGoalModalOpen(false)
                    setEditingGoal(null)
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enable Goal
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={goalFormData.enabled}
                      onChange={(e) => setGoalFormData({ ...goalFormData, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable this goal</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Revenue ({currency})
                  </label>
                  <input
                    type="number"
                    value={goalFormData.targetRevenue}
                    onChange={(e) => setGoalFormData({ ...goalFormData, targetRevenue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Orders (Optional)
                  </label>
                  <input
                    type="number"
                    value={goalFormData.targetOrders}
                    onChange={(e) => setGoalFormData({ ...goalFormData, targetOrders: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setIsGoalModalOpen(false)
                      setEditingGoal(null)
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editingGoal) {
                        setGoal({
                          id: editingGoal,
                          targetRevenue: goalFormData.targetRevenue,
                          targetOrders: goalFormData.targetOrders || undefined,
                          enabled: goalFormData.enabled,
                          updatedAt: new Date().toISOString()
                        })
                        setMessage(`${editingGoal === 'weekly' ? 'Weekly' : editingGoal === 'monthly' ? 'Monthly' : 'Yearly'} goal updated successfully`)
                        setTimeout(() => setMessage(''), 5000)
                        setIsGoalModalOpen(false)
                        setEditingGoal(null)
                      }
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    Save Goal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {/* Create Admin Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('admin.settings.modals.createAdmin.title')}</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.settings.modals.createAdmin.username')}</label>
                  <input
                    type="text"
                    value={newAdminData.username}
                    onChange={(e) => setNewAdminData({ ...newAdminData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.settings.modals.createAdmin.password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newAdminData.password}
                      onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.settings.modals.createAdmin.role')}</label>
                  <select
                    value={newAdminData.role}
                    onChange={(e) => setNewAdminData({ ...newAdminData, role: e.target.value as 'admin' | 'super_admin' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white z-50"
                    style={{ zIndex: 50 }}
                  >
                    <option value="admin">{t('admin.settings.adminManagement.adminRole') || 'Admin'}</option>
                    <option value="super_admin">{t('admin.settings.adminManagement.superAdminRole') || 'Super Admin'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.settings.modals.createAdmin.permissions')}</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 bg-white">
                    {availablePermissions.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">No permissions available</p>
                    ) : (
                      availablePermissions.map((permission) => (
                        <label key={permission} className="flex items-center hover:bg-gray-50 p-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newAdminData.permissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAdminData({
                                  ...newAdminData,
                                  permissions: [...newAdminData.permissions, permission]
                                })
                              } else {
                                setNewAdminData({
                                  ...newAdminData,
                                  permissions: newAdminData.permissions.filter(p => p !== permission)
                                })
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                          <span className="ml-2 text-sm text-gray-700 select-none">{permission}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                                      <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      {t('admin.settings.modals.createAdmin.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? t('admin.settings.modals.createAdmin.creating') : t('admin.settings.modals.createAdmin.create')}
                    </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('admin.settings.modals.changePassword.title')}</h3>
                <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.settings.modals.changePassword.admin')}: <span className="font-semibold text-gray-900">{passwordChangeData.username}</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Enter a new password for this administrator</p>
                </div>

                {message && (
                  <div className={`p-3 rounded-md text-sm ${
                    message.includes('successfully') || message.includes('updated') 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.settings.modals.changePassword.newPassword')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordChangeData.newPassword}
                      onChange={(e) => setPasswordChangeData({ ...passwordChangeData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                      minLength={6}
                      placeholder="Enter new password (min. 6 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordChangeData.confirmPassword}
                      onChange={(e) => setPasswordChangeData({ ...passwordChangeData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                      minLength={6}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                                      <button
                      type="button"
                      onClick={() => setIsPasswordModalOpen(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      {t('admin.settings.modals.changePassword.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? t('admin.settings.modals.changePassword.updating') : t('admin.settings.modals.changePassword.update')}
                    </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Username Change Modal */}
        {isUsernameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Change Username</h3>
                <button onClick={() => {
                  setIsUsernameModalOpen(false)
                  setNewUsername('')
                }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateUsername} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Username</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                    {adminUser?.username}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={3}
                    placeholder="Enter at least 3 characters"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Username must be at least 3 characters and cannot be used if another admin is already using it.
                  </p>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUsernameModalOpen(false)
                      setNewUsername('')
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !newUsername || newUsername.trim().length < 3}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Changing...' : 'Change'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* My Password Change Modal */}
        {isMyPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('admin.products.myPasswordChangeModal')}</h3>
                <button 
                  onClick={() => {
                    setIsMyPasswordModalOpen(false)
                    setMyPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    setMessage('')
                    setShowPassword(false)
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleChangeMyPassword} className="space-y-4">
                {message && (
                  <div className={`p-3 rounded-md text-sm ${
                    message.includes('successfully') || message.includes('changed') 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.products.currentPassword')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={myPasswordData.currentPassword}
                      onChange={(e) => setMyPasswordData({ ...myPasswordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.products.newPassword')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={myPasswordData.newPassword}
                      onChange={(e) => setMyPasswordData({ ...myPasswordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.products.confirmNewPassword')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={myPasswordData.confirmPassword}
                      onChange={(e) => setMyPasswordData({ ...myPasswordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMyPasswordModalOpen(false)
                      setMyPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      setMessage('')
                      setShowPassword(false)
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    {t('admin.products.cancelButton')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('admin.settings.modals.changePassword.updating')}
                      </div>
                    ) : (
                      t('admin.settings.security.changePasswordButton')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Permissions Modal */}
        {isPermissionsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  {t('admin.settings.modals.updatePermissions.title')}
                </h3>
                <button onClick={() => setIsPermissionsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdatePermissions} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.settings.modals.updatePermissions.admin')}: <span className="font-semibold text-indigo-600">{permissionsData.username}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.settings.modals.updatePermissions.permissions')}</label>
                  <PermissionManager
                    selectedPermissions={permissionsData.permissions}
                    availablePermissions={availablePermissions}
                    onPermissionsChange={(permissions) => {
                      setPermissionsData({
                        ...permissionsData,
                        permissions
                      })
                    }}
                    username={permissionsData.username}
                  />
                </div>

                <div className="flex space-x-3 pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsPermissionsModalOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    {t('admin.settings.modals.updatePermissions.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t('admin.settings.modals.updatePermissions.updating') : t('admin.settings.modals.updatePermissions.update')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* My Profile Modal (for regular admin to edit own profile) */}
        {isMyProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserCircle className="h-5 w-5 mr-2" />
                  Edit My Profile
                </h3>
                <button 
                  onClick={() => setIsMyProfileModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {message && (
                  <div className={`p-3 rounded-md text-sm ${
                    message.includes('successfully') || message.includes('updated') 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin@example.com"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Department
                    </label>
                    <input
                      type="text"
                      value={profileData.department}
                      onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="IT, Sales, Support, etc."
                    />
                  </div>

                  {/* Avatar */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Avatar
                    </label>
                    
                    {/* Upload Method Tabs */}
                    <div className="flex gap-2 mb-3 border-b border-gray-200">
                      <button
                        type="button"
                        onClick={() => setAvatarUploadMethod('url')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          avatarUploadMethod === 'url'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarUploadMethod('upload')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          avatarUploadMethod === 'upload'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Upload Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarUploadMethod('template')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          avatarUploadMethod === 'template'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Template
                      </button>
                    </div>

                    {/* URL Input */}
                    {avatarUploadMethod === 'url' && (
                      <input
                        type="url"
                        value={profileData.avatar}
                        onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/avatar.jpg"
                      />
                    )}

                    {/* File Upload */}
                    {avatarUploadMethod === 'upload' && (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                setMessage('File size must be less than 5MB.')
                                return
                              }
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                const result = event.target?.result as string
                                setProfileData({ ...profileData, avatar: result })
                                setMessage('Image uploaded successfully.')
                                setTimeout(() => setMessage(''), 3000)
                              }
                              reader.onerror = () => {
                                setMessage('Failed to read image file.')
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">Supported formats: JPG, PNG, GIF, WebP (Max 5MB)</p>
                      </div>
                    )}

                    {/* Template Selection */}
                    {avatarUploadMethod === 'template' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-64 overflow-y-auto p-2">
                          {[
                            { id: 'male-1', emoji: '👨', name: 'Male 1' },
                            { id: 'male-2', emoji: '👨‍💼', name: 'Male 2' },
                            { id: 'male-3', emoji: '👨‍🔬', name: 'Male 3' },
                            { id: 'female-1', emoji: '👩', name: 'Female 1' },
                            { id: 'female-2', emoji: '👩‍💼', name: 'Female 2' },
                            { id: 'female-3', emoji: '👩‍🔬', name: 'Female 3' },
                            { id: 'neutral-1', emoji: '🧑', name: 'Neutral 1' },
                            { id: 'neutral-2', emoji: '🧑‍💼', name: 'Neutral 2' },
                            { id: 'robot', emoji: '🤖', name: 'Robot' },
                            { id: 'alien', emoji: '👽', name: 'Alien' },
                            { id: 'ninja', emoji: '🥷', name: 'Ninja' },
                            { id: 'superhero', emoji: '🦸', name: 'Superhero' },
                            { id: 'wizard', emoji: '🧙', name: 'Wizard' },
                            { id: 'astronaut', emoji: '🧑‍🚀', name: 'Astronaut' },
                            { id: 'doctor', emoji: '👨‍⚕️', name: 'Doctor' },
                            { id: 'teacher', emoji: '👨‍🏫', name: 'Teacher' },
                            { id: 'chef', emoji: '👨‍🍳', name: 'Chef' },
                            { id: 'artist', emoji: '👨‍🎨', name: 'Artist' },
                            { id: 'pilot', emoji: '👨‍✈️', name: 'Pilot' },
                            { id: 'police', emoji: '👮', name: 'Police' },
                            { id: 'firefighter', emoji: '👨‍🚒', name: 'Firefighter' },
                            { id: 'judge', emoji: '👨‍⚖️', name: 'Judge' },
                            { id: 'farmer', emoji: '👨‍🌾', name: 'Farmer' }
                          ].map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => {
                                setSelectedTemplate(template.id)
                                // 이모지를 Base64로 변환하여 저장
                                const canvas = document.createElement('canvas')
                                canvas.width = 200
                                canvas.height = 200
                                const ctx = canvas.getContext('2d')
                                if (ctx) {
                                  ctx.font = '120px Arial'
                                  ctx.textAlign = 'center'
                                  ctx.textBaseline = 'middle'
                                  ctx.fillText(template.emoji, 100, 100)
                                  const dataUrl = canvas.toDataURL('image/png')
                                  setProfileData({ ...profileData, avatar: dataUrl })
                                }
                              }}
                              className={`p-3 border-2 rounded-lg transition-all hover:scale-110 ${
                                selectedTemplate === template.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              title={template.name}
                            >
                              <div className="text-4xl">{template.emoji}</div>
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">Click on an emoji to use it as your avatar</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={profileData.notes}
                    onChange={(e) => setProfileData({ ...profileData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about yourself..."
                  />
                </div>

                {/* Avatar Preview */}
                {profileData.avatar && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avatar Preview</label>
                    <div className="flex items-center gap-4">
                      <img
                        src={profileData.avatar}
                        alt="Avatar preview"
                        className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                      <div className="text-xs text-gray-500">
                        If the image doesn't load, check the URL
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsMyProfileModalOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Profile'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Profile Modal (for super admin to edit any admin profile) */}
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserCircle className="h-5 w-5 mr-2" />
                  Edit Profile: {profileData.username}
                </h3>
                <button 
                  onClick={() => setIsProfileModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {message && (
                  <div className={`p-3 rounded-md text-sm ${
                    message.includes('successfully') || message.includes('updated') 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin@example.com"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Department
                    </label>
                    <input
                      type="text"
                      value={profileData.department}
                      onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="IT, Sales, Support, etc."
                    />
                  </div>

                  {/* Avatar */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Avatar
                    </label>
                    
                    {/* Upload Method Tabs */}
                    <div className="flex gap-2 mb-3 border-b border-gray-200">
                      <button
                        type="button"
                        onClick={() => setAvatarUploadMethod('url')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          avatarUploadMethod === 'url'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarUploadMethod('upload')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          avatarUploadMethod === 'upload'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Upload Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarUploadMethod('template')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          avatarUploadMethod === 'template'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Template
                      </button>
                    </div>

                    {/* URL Input */}
                    {avatarUploadMethod === 'url' && (
                      <input
                        type="url"
                        value={profileData.avatar}
                        onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/avatar.jpg"
                      />
                    )}

                    {/* File Upload */}
                    {avatarUploadMethod === 'upload' && (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                setMessage('File size must be less than 5MB.')
                                return
                              }
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                const result = event.target?.result as string
                                setProfileData({ ...profileData, avatar: result })
                                setMessage('Image uploaded successfully.')
                                setTimeout(() => setMessage(''), 3000)
                              }
                              reader.onerror = () => {
                                setMessage('Failed to read image file.')
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">Supported formats: JPG, PNG, GIF, WebP (Max 5MB)</p>
                      </div>
                    )}

                    {/* Template Selection */}
                    {avatarUploadMethod === 'template' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-64 overflow-y-auto p-2">
                          {[
                            { id: 'male-1', emoji: '👨', name: 'Male 1' },
                            { id: 'male-2', emoji: '👨‍💼', name: 'Male 2' },
                            { id: 'male-3', emoji: '👨‍🔬', name: 'Male 3' },
                            { id: 'female-1', emoji: '👩', name: 'Female 1' },
                            { id: 'female-2', emoji: '👩‍💼', name: 'Female 2' },
                            { id: 'female-3', emoji: '👩‍🔬', name: 'Female 3' },
                            { id: 'neutral-1', emoji: '🧑', name: 'Neutral 1' },
                            { id: 'neutral-2', emoji: '🧑‍💼', name: 'Neutral 2' },
                            { id: 'robot', emoji: '🤖', name: 'Robot' },
                            { id: 'alien', emoji: '👽', name: 'Alien' },
                            { id: 'ninja', emoji: '🥷', name: 'Ninja' },
                            { id: 'superhero', emoji: '🦸', name: 'Superhero' },
                            { id: 'wizard', emoji: '🧙', name: 'Wizard' },
                            { id: 'astronaut', emoji: '🧑‍🚀', name: 'Astronaut' },
                            { id: 'doctor', emoji: '👨‍⚕️', name: 'Doctor' },
                            { id: 'teacher', emoji: '👨‍🏫', name: 'Teacher' },
                            { id: 'chef', emoji: '👨‍🍳', name: 'Chef' },
                            { id: 'artist', emoji: '👨‍🎨', name: 'Artist' },
                            { id: 'pilot', emoji: '👨‍✈️', name: 'Pilot' },
                            { id: 'police', emoji: '👮', name: 'Police' },
                            { id: 'firefighter', emoji: '👨‍🚒', name: 'Firefighter' },
                            { id: 'judge', emoji: '👨‍⚖️', name: 'Judge' },
                            { id: 'farmer', emoji: '👨‍🌾', name: 'Farmer' }
                          ].map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => {
                                setSelectedTemplate(template.id)
                                // 이모지를 Base64로 변환하여 저장
                                const canvas = document.createElement('canvas')
                                canvas.width = 200
                                canvas.height = 200
                                const ctx = canvas.getContext('2d')
                                if (ctx) {
                                  ctx.font = '120px Arial'
                                  ctx.textAlign = 'center'
                                  ctx.textBaseline = 'middle'
                                  ctx.fillText(template.emoji, 100, 100)
                                  const dataUrl = canvas.toDataURL('image/png')
                                  setProfileData({ ...profileData, avatar: dataUrl })
                                }
                              }}
                              className={`p-3 border-2 rounded-lg transition-all hover:scale-110 ${
                                selectedTemplate === template.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              title={template.name}
                            >
                              <div className="text-4xl">{template.emoji}</div>
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">Click on an emoji to use it as your avatar</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={profileData.notes}
                    onChange={(e) => setProfileData({ ...profileData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about this administrator..."
                  />
                </div>

                {/* Avatar Preview */}
                {profileData.avatar && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avatar Preview</label>
                    <div className="flex items-center gap-4">
                      <img
                        src={profileData.avatar}
                        alt="Avatar preview"
                        className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                      <div className="text-xs text-gray-500">
                        If the image doesn't load, check the URL
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Profile'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Admin Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('admin.settings.modals.deleteAdmin.title')}</h3>
                <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  {t('admin.settings.modals.deleteAdmin.confirmMessage').replace('{username}', adminToDelete)}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  {t('admin.settings.modals.deleteAdmin.cancel')}
                </button>
                <button
                  onClick={handleDeleteAdmin}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('admin.settings.modals.deleteAdmin.deleting') : t('admin.settings.modals.deleteAdmin.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Permission Management Modal */}
        {isBulkPermissionsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Copy className="h-5 w-5 mr-2" />
                  Bulk Permission Management
                </h3>
                <button onClick={() => setIsBulkPermissionsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleBulkPermissionsUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Admins: {selectedAdmins.size} admin(s)
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-32 overflow-y-auto">
                    {Array.from(selectedAdmins).map(username => {
                      const admin = adminUsers.find(a => a.username === username)
                      return (
                        <div key={username} className="text-sm text-gray-700 py-1">
                          • {username} {admin?.role === 'super_admin' && <span className="text-xs text-purple-600">(Super Admin)</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions to Apply</label>
                  <PermissionManager
                    selectedPermissions={bulkPermissions}
                    availablePermissions={availablePermissions}
                    onPermissionsChange={setBulkPermissions}
                  />
                </div>

                <div className="flex space-x-3 pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkPermissionsModalOpen(false)
                      setBulkPermissions([])
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || selectedAdmins.size === 0}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Applying...' : `Apply Permissions to ${selectedAdmins.size} Admin(s)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permission Comparison Modal */}
        {isCompareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-5xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <GitCompare className="h-5 w-5 mr-2" />
                  Compare Permissions
                </h3>
                <button onClick={() => setIsCompareModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin 1</label>
                    <select
                      value={compareAdmin1}
                      onChange={(e) => setCompareAdmin1(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      {memoizedAdminUsers.map(admin => (
                        <option key={admin.username} value={admin.username}>
                          {admin.username} {admin.role === 'super_admin' && '(Super Admin)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin 2</label>
                    <select
                      value={compareAdmin2}
                      onChange={(e) => setCompareAdmin2(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      {memoizedAdminUsers.map(admin => (
                        <option key={admin.username} value={admin.username}>
                          {admin.username} {admin.role === 'super_admin' && '(Super Admin)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {compareAdmin1 && compareAdmin2 && compareAdmin1 !== compareAdmin2 && (() => {
                  const diff = getPermissionDifference(compareAdmin1, compareAdmin2)
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="text-sm font-medium text-blue-900 mb-2">
                            {compareAdmin1} Only ({diff.onlyIn1.length})
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {diff.onlyIn1.length > 0 ? (
                              diff.onlyIn1.map(perm => (
                                <div key={perm} className="text-xs bg-white px-2 py-1 rounded border border-blue-200">
                                  {perm}
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500">None</div>
                            )}
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="text-sm font-medium text-green-900 mb-2">
                            Common Permissions ({diff.common.length})
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {diff.common.length > 0 ? (
                              diff.common.map(perm => (
                                <div key={perm} className="text-xs bg-white px-2 py-1 rounded border border-green-200">
                                  {perm}
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500">None</div>
                            )}
                          </div>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="text-sm font-medium text-purple-900 mb-2">
                            {compareAdmin2} Only ({diff.onlyIn2.length})
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {diff.onlyIn2.length > 0 ? (
                              diff.onlyIn2.map(perm => (
                                <div key={perm} className="text-xs bg-white px-2 py-1 rounded border border-purple-200">
                                  {perm}
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500">None</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {diff.onlyIn1.length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <div className="text-sm font-medium text-indigo-900 mb-2">
                            Sync {compareAdmin1}'s permissions to {compareAdmin2}
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Apply ${compareAdmin1}'s permissions to ${compareAdmin2}?`)) {
                                setIsLoading(true)
                                try {
                                  const admin1 = adminUsers.find(a => a.username === compareAdmin1)
                                  if (admin1) {
                                    const success = await updateAdminPermissions(compareAdmin2, admin1.permissions)
                                    if (success) {
                                      setMessage('Permissions synced successfully.')
                                      setIsCompareModalOpen(false)
                                    } else {
                                      setMessage('Failed to sync permissions.')
                                    }
                                  }
                                } catch (error) {
                                  setMessage('An error occurred.')
                                } finally {
                                  setIsLoading(false)
                                }
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                          >
                            Sync Permissions
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })()}

                <div className="flex space-x-3 pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCompareModalOpen(false)
                      setCompareAdmin1('')
                      setCompareAdmin2('')
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}

// Activity Log View Component
function ActivityLogView() {
  const { logs, getLogsByAdmin, clearLogs, deleteLog, deleteLogsByDate } = useAdminActivityLog()
  const { adminUsers, adminUser } = useAdminAuth()
  const [filterAdmin, setFilterAdmin] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [clearMode, setClearMode] = useState<'all' | 'older'>('all')
  const [daysToKeep, setDaysToKeep] = useState<number>(30)
  const [logToDelete, setLogToDelete] = useState<string | null>(null)

  const filteredLogs = useMemo(() => {
    let result = logs

    if (filterAdmin !== 'all') {
      result = getLogsByAdmin(filterAdmin)
    }

    if (filterAction !== 'all') {
      result = result.filter(log => log.action === filterAction)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(log =>
        log.performedBy.toLowerCase().includes(term) ||
        log.targetAdmin?.toLowerCase().includes(term) ||
        log.details?.description?.toLowerCase().includes(term) ||
        log.ipAddress?.toLowerCase().includes(term)
      )
    }

    return result.slice(0, 500) // Show last 500 logs
  }, [logs, filterAdmin, filterAction, searchTerm, getLogsByAdmin])

  const actionColors: Record<string, string> = {
    login: 'bg-green-100 text-green-800',
    logout: 'bg-gray-100 text-gray-800',
    password_changed: 'bg-blue-100 text-blue-800',
    permissions_updated: 'bg-purple-100 text-purple-800',
    status_toggled: 'bg-yellow-100 text-yellow-800',
    admin_created: 'bg-indigo-100 text-indigo-800',
    admin_deleted: 'bg-red-100 text-red-800',
    profile_updated: 'bg-cyan-100 text-cyan-800',
    username_changed: 'bg-orange-100 text-orange-800'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Admin</label>
          <select
            value={filterAdmin}
            onChange={(e) => setFilterAdmin(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Admins</option>
            {adminUsers.map(admin => (
              <option key={admin.username} value={admin.username}>{admin.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="password_changed">Password Changed</option>
            <option value="permissions_updated">Permissions Updated</option>
            <option value="status_toggled">Status Toggled</option>
            <option value="admin_created">Admin Created</option>
            <option value="admin_deleted">Admin Deleted</option>
            <option value="profile_updated">Profile Updated</option>
            <option value="username_changed">Username Changed</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div className="text-sm text-gray-600">
            Total: {filteredLogs.length} logs
          </div>
          {adminUser?.role === 'super_admin' && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4 inline mr-2" />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              {adminUser?.role === 'super_admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={adminUser?.role === 'super_admin' ? 7 : 6} className="px-6 py-4 text-center text-gray-500">
                  No activity logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.performedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.targetAdmin || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ipAddress || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.details?.description || '-'}
                  </td>
                  {adminUser?.role === 'super_admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setLogToDelete(log.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete this log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Clear Logs Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Trash2 className="h-5 w-5 mr-2 text-red-600" />
                Clear Activity Logs
              </h3>
              <button 
                onClick={() => setIsClearModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clear Mode</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={clearMode === 'all'}
                      onChange={(e) => setClearMode(e.target.value as 'all' | 'older')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Clear All Logs</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="older"
                      checked={clearMode === 'older'}
                      onChange={(e) => setClearMode(e.target.value as 'all' | 'older')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Clear Logs Older Than</span>
                  </label>
                </div>
              </div>

              {clearMode === 'older' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days to Keep</label>
                  <input
                    type="number"
                    value={daysToKeep}
                    onChange={(e) => setDaysToKeep(Number(e.target.value))}
                    min="1"
                    max="365"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Logs older than {daysToKeep} day(s) will be deleted
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action cannot be undone. {clearMode === 'all' 
                    ? 'All activity logs will be permanently deleted.' 
                    : `All logs older than ${daysToKeep} day(s) will be permanently deleted.`}
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (clearMode === 'all') {
                      clearLogs()
                    } else {
                      const cutoffDate = new Date()
                      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
                      deleteLogsByDate(cutoffDate)
                    }
                    setIsClearModalOpen(false)
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  {clearMode === 'all' ? 'Clear All' : 'Clear Old Logs'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Log Confirmation Modal */}
      {logToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Trash2 className="h-5 w-5 mr-2 text-red-600" />
                Delete Log Entry
              </h3>
              <button 
                onClick={() => setLogToDelete(null)} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this activity log entry? This action cannot be undone.
              </p>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setLogToDelete(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteLog(logToDelete)
                    setLogToDelete(null)
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Session Management View Component
function SessionManagementView() {
  const { getActiveSessions, endSession, sessionTimeout, setSessionTimeout, maxSessionsPerUser, setMaxSessionsPerUser, currentSessionId, updateActivity } = useAdminSession()
  const { adminUser, logout } = useAdminAuth()
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [localTimeout, setLocalTimeout] = useState<number>(sessionTimeout)
  const [localMaxSessions, setLocalMaxSessions] = useState<number>(maxSessionsPerUser)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Wait for Zustand hydration
  useEffect(() => {
    // Check if store is hydrated
    const checkHydration = () => {
      const store = useAdminSession.getState()
      console.log('🔍 [SessionManagement] Checking hydration:', {
        sessionTimeout: store.sessionTimeout,
        maxSessionsPerUser: store.maxSessionsPerUser,
        sessionTimeoutDefined: store.sessionTimeout !== undefined,
        maxSessionsPerUserDefined: store.maxSessionsPerUser !== undefined
      })
      
      if (store.sessionTimeout !== undefined && store.maxSessionsPerUser !== undefined) {
        setIsHydrated(true)
        setLocalTimeout(store.sessionTimeout)
        setLocalMaxSessions(store.maxSessionsPerUser)
        console.log('✅ [SessionManagement] Store hydrated:', {
          sessionTimeout: store.sessionTimeout,
          sessionTimeoutMinutes: store.sessionTimeout / 60000,
          maxSessionsPerUser: store.maxSessionsPerUser
        })
      } else {
        console.warn('⚠️ [SessionManagement] Store not fully hydrated yet, retrying...')
      }
    }
    
    // Check immediately
    checkHydration()
    
    // Also check after delays (in case hydration is still in progress)
    const timeout1 = setTimeout(checkHydration, 100)
    const timeout2 = setTimeout(checkHydration, 500)
    const timeout3 = setTimeout(checkHydration, 1000)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [])
  
  // Sync local state with store state (after hydration)
  useEffect(() => {
    if (isHydrated) {
      setLocalTimeout(sessionTimeout)
      setLocalMaxSessions(maxSessionsPerUser)
      console.log('🔄 [SessionManagement] Synced local state with store:', {
        sessionTimeout,
        maxSessionsPerUser
      })
    }
  }, [sessionTimeout, maxSessionsPerUser, isHydrated])

  // Update current session activity periodically
  useEffect(() => {
    if (currentSessionId) {
      updateActivity(currentSessionId)
    }
    
    // Update activity every 30 seconds
    const activityInterval = setInterval(() => {
      if (currentSessionId) {
        updateActivity(currentSessionId)
      }
    }, 30000)
    
    return () => clearInterval(activityInterval)
  }, [currentSessionId, updateActivity])

  // Refresh sessions list every 5 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setRefreshKey(prev => prev + 1)
    }, 5000)
    
    return () => clearInterval(refreshInterval)
  }, [])

  const activeSessions = getActiveSessions()
  const filteredSessions = selectedUser === 'all' 
    ? activeSessions 
    : activeSessions.filter(s => s.username === selectedUser)

  const formatDuration = (startTime: string, lastActivity: string) => {
    const start = new Date(startTime).getTime()
    const last = new Date(lastActivity).getTime()
    const diff = Date.now() - last
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
            <input
              type="number"
              value={localTimeout === 0 ? '' : localTimeout / 60000}
              onChange={(e) => {
                const minutes = e.target.value ? Number(e.target.value) : 0
                const timeoutMs = minutes * 60000
                setLocalTimeout(timeoutMs)
              }}
              onBlur={() => {
                // Save on blur
                console.log('💾 [SessionManagement] Saving session timeout on blur:', localTimeout)
                setSessionTimeout(localTimeout)
                
                // Verify save after a short delay
                setTimeout(() => {
                  const store = useAdminSession.getState()
                  const saved = store.sessionTimeout === localTimeout
                  console.log('🔍 [SessionManagement] Blur save verification:', {
                    saved,
                    expected: localTimeout,
                    actual: store.sessionTimeout
                  })
                  
                  if (saved) {
                    setSaveMessage({ type: 'success', text: 'Session timeout saved successfully' })
                  } else {
                    setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' })
                  }
                  setTimeout(() => setSaveMessage(null), 3000)
                }, 150)
              }}
              placeholder="0 = No timeout"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {localTimeout === 0 ? 'Sessions will not expire automatically' : `Sessions will expire after ${localTimeout / 60000} minutes of inactivity`}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Sessions Per User</label>
            <input
              type="number"
              value={localMaxSessions === 0 ? '' : localMaxSessions}
              onChange={(e) => {
                const max = e.target.value ? Number(e.target.value) : 0
                setLocalMaxSessions(max)
              }}
              onBlur={() => {
                // Save on blur
                console.log('💾 [SessionManagement] Saving max sessions on blur:', localMaxSessions)
                setMaxSessionsPerUser(localMaxSessions)
                
                // Verify save after a short delay
                setTimeout(() => {
                  const store = useAdminSession.getState()
                  const saved = store.maxSessionsPerUser === localMaxSessions
                  console.log('🔍 [SessionManagement] Blur save verification:', {
                    saved,
                    expected: localMaxSessions,
                    actual: store.maxSessionsPerUser
                  })
                  
                  if (saved) {
                    setSaveMessage({ type: 'success', text: 'Max sessions per user saved successfully' })
                  } else {
                    setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' })
                  }
                  setTimeout(() => setSaveMessage(null), 3000)
                }, 150)
              }}
              placeholder="0 = Unlimited"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {localMaxSessions === 0 ? 'Unlimited concurrent sessions' : `Maximum ${localMaxSessions} concurrent session(s) per user`}
            </p>
          </div>
        </div>
        
        {/* Save Button and Message */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex-1">
            {saveMessage && (
              <div className={`flex items-center gap-2 ${
                saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {saveMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{saveMessage.text}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              console.log('💾 [SessionManagement] Saving settings:', {
                sessionTimeout: localTimeout,
                maxSessionsPerUser: localMaxSessions
              })
              
              setSessionTimeout(localTimeout)
              setMaxSessionsPerUser(localMaxSessions)
              
              // Verify save
              setTimeout(() => {
                const store = useAdminSession.getState()
                const saved = store.sessionTimeout === localTimeout && store.maxSessionsPerUser === localMaxSessions
                console.log('🔍 [SessionManagement] Save verification:', {
                  saved,
                  expectedTimeout: localTimeout,
                  actualTimeout: store.sessionTimeout,
                  expectedMax: localMaxSessions,
                  actualMax: store.maxSessionsPerUser
                })
                
                if (saved) {
                  setSaveMessage({ type: 'success', text: 'Settings saved successfully' })
                  setTimeout(() => setSaveMessage(null), 3000)
                } else {
                  setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
                  setTimeout(() => setSaveMessage(null), 3000)
                }
              }, 100)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Active Sessions ({activeSessions.length})</h4>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            {Array.from(new Set(activeSessions.map(s => s.username))).map(username => (
              <option key={username} value={username}>{username}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No active sessions
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {session.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.loginTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(session.loginTime, session.lastActivity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.ipAddress || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          endSession(session.id)
                          if (session.username === adminUser?.username) {
                            // If ending own session, logout
                            logout()
                            window.location.href = '/admin/login'
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        End Session
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Password Policy Section Component
function PasswordPolicySection() {
  const { policy, setPolicy, validatePassword } = useAdminPasswordPolicy()
  const [testPassword, setTestPassword] = useState('')
  const [testResult, setTestResult] = useState<{ valid: boolean; errors: string[] } | null>(null)

  const handleTestPassword = () => {
    const result = validatePassword(testPassword)
    setTestResult(result)
  }

  return (
    <div className="border-b border-gray-200 pb-6">
      <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
        <Shield className="h-4 w-4 mr-2" />
        Password Policy
      </h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Length</label>
          <input
            type="number"
            value={policy.minLength}
            onChange={(e) => setPolicy({ minLength: Number(e.target.value) })}
            min="6"
            max="32"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Password Requirements</label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={policy.requireUppercase}
              onChange={(e) => setPolicy({ requireUppercase: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require uppercase letter (A-Z)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={policy.requireLowercase}
              onChange={(e) => setPolicy({ requireLowercase: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require lowercase letter (a-z)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={policy.requireNumbers}
              onChange={(e) => setPolicy({ requireNumbers: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require number (0-9)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={policy.requireSpecialChars}
              onChange={(e) => setPolicy({ requireSpecialChars: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require special character (!@#$%^&*)</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiration (days)</label>
          <input
            type="number"
            value={policy.maxAge === 0 ? '' : policy.maxAge}
            onChange={(e) => setPolicy({ maxAge: e.target.value ? Number(e.target.value) : 0 })}
            placeholder="0 = No expiration"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            {policy.maxAge === 0 ? 'Passwords will not expire' : `Passwords must be changed every ${policy.maxAge} days`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prevent Password Reuse</label>
          <input
            type="number"
            value={policy.preventReuse === 0 ? '' : policy.preventReuse}
            onChange={(e) => setPolicy({ preventReuse: e.target.value ? Number(e.target.value) : 0 })}
            placeholder="0 = Disabled"
            min="0"
            max="10"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            {policy.preventReuse === 0 ? 'Password reuse is allowed' : `Cannot reuse last ${policy.preventReuse} password(s)`}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Test Password</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={testPassword}
              onChange={(e) => {
                setTestPassword(e.target.value)
                setTestResult(null)
              }}
              placeholder="Enter password to test"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleTestPassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Test
            </button>
          </div>
          {testResult && (
            <div className={`mt-2 p-3 rounded-md ${testResult.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {testResult.valid ? (
                <div className="text-sm">✓ Password meets all requirements</div>
              ) : (
                <div className="text-sm">
                  <div className="font-medium mb-1">Password does not meet requirements:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {testResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// IP Control Section Component
function IPControlSection() {
  const { adminUsers } = useAdminAuth()
  const { 
    globalRules, 
    adminRules, 
    addGlobalRule, 
    removeGlobalRule, 
    toggleGlobalRule,
    addAdminRule,
    removeAdminRule,
    toggleAdminRule,
    getAdminRules,
    validateIP
  } = useAdminIPControl()
  
  const [newGlobalIP, setNewGlobalIP] = useState('')
  const [newGlobalType, setNewGlobalType] = useState<'whitelist' | 'blacklist'>('blacklist')
  const [newGlobalDesc, setNewGlobalDesc] = useState('')
  const [selectedAdmin, setSelectedAdmin] = useState<string>('')
  const [newAdminIP, setNewAdminIP] = useState('')
  const [newAdminType, setNewAdminType] = useState<'whitelist' | 'blacklist'>('whitelist')
  const [newAdminDesc, setNewAdminDesc] = useState('')

  const handleAddGlobalRule = () => {
    if (!validateIP(newGlobalIP)) {
      alert('Invalid IP address format')
      return
    }
    addGlobalRule({
      type: newGlobalType,
      ipAddress: newGlobalIP,
      description: newGlobalDesc || undefined,
      createdBy: useAdminAuth.getState().adminUser?.username || 'system',
      isActive: true
    })
    setNewGlobalIP('')
    setNewGlobalDesc('')
  }

  const handleAddAdminRule = () => {
    if (!selectedAdmin || !validateIP(newAdminIP)) {
      alert('Please select an admin and enter a valid IP address')
      return
    }
    addAdminRule(selectedAdmin, {
      type: newAdminType,
      ipAddress: newAdminIP,
      description: newAdminDesc || undefined,
      createdBy: useAdminAuth.getState().adminUser?.username || 'system',
      isActive: true
    })
    setNewAdminIP('')
    setNewAdminDesc('')
    setSelectedAdmin('')
  }

  return (
    <div className="border-b border-gray-200 pb-6">
      <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
        <Shield className="h-4 w-4 mr-2" />
        IP Access Control
      </h4>

      <div className="space-y-6">
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3">Global IP Rules (Apply to All Admins)</h5>
          
          <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={newGlobalIP}
                onChange={(e) => setNewGlobalIP(e.target.value)}
                placeholder="IP Address (e.g., 192.168.1.1)"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newGlobalType}
                onChange={(e) => setNewGlobalType(e.target.value as 'whitelist' | 'blacklist')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="blacklist">Blacklist</option>
                <option value="whitelist">Whitelist</option>
              </select>
              <input
                type="text"
                value={newGlobalDesc}
                onChange={(e) => setNewGlobalDesc(e.target.value)}
                placeholder="Description (optional)"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddGlobalRule}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Rule
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {globalRules.length === 0 ? (
              <p className="text-sm text-gray-500">No global IP rules</p>
            ) : (
              globalRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        rule.type === 'whitelist' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {rule.type === 'whitelist' ? 'Whitelist' : 'Blacklist'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{rule.ipAddress}</span>
                      {!rule.isActive && <span className="text-xs text-gray-500">(Inactive)</span>}
                    </div>
                    {rule.description && (
                      <div className="text-xs text-gray-500 mt-1">{rule.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleGlobalRule(rule.id)}
                      className={`px-3 py-1 text-xs rounded ${
                        rule.isActive 
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {rule.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => removeGlobalRule(rule.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3">Admin-Specific IP Rules</h5>
          
          <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Admin</option>
                {adminUsers.map(admin => (
                  <option key={admin.username} value={admin.username}>{admin.username}</option>
                ))}
              </select>
              <input
                type="text"
                value={newAdminIP}
                onChange={(e) => setNewAdminIP(e.target.value)}
                placeholder="IP Address"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newAdminType}
                onChange={(e) => setNewAdminType(e.target.value as 'whitelist' | 'blacklist')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="whitelist">Whitelist</option>
                <option value="blacklist">Blacklist</option>
              </select>
              <input
                type="text"
                value={newAdminDesc}
                onChange={(e) => setNewAdminDesc(e.target.value)}
                placeholder="Description"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddAdminRule}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Rule
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {adminUsers.map(admin => {
              const rules = getAdminRules(admin.username)
              if (rules.length === 0) return null
              
              return (
                <div key={admin.username} className="border border-gray-200 rounded-lg p-4">
                  <h6 className="text-sm font-medium text-gray-900 mb-2">{admin.username}</h6>
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            rule.type === 'whitelist' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {rule.type === 'whitelist' ? 'Whitelist' : 'Blacklist'}
                          </span>
                          <span className="text-sm text-gray-900">{rule.ipAddress}</span>
                          {!rule.isActive && <span className="text-xs text-gray-500">(Inactive)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAdminRule(admin.username, rule.id)}
                            className={`px-2 py-1 text-xs rounded ${
                              rule.isActive 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {rule.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => removeAdminRule(admin.username, rule.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
