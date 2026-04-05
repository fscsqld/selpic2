'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  Plus, 
  ArrowLeft,
  Calendar,
  Eye,
  RefreshCw,
  ArrowUpDown,
  X,
  MapPin,
  Globe,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Info,
  Filter,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  MessageSquare,
  Ban,
  Shield,
  ShieldCheck
} from 'lucide-react'
import AdminPageHeader from '@/components/AdminPageHeader'
import SupabaseAuthUsersPanel from '@/components/admin/SupabaseAuthUsersPanel'
import { useAdminAuth } from '@/lib/adminAuth'
import { useUserAuth } from '@/lib/userAuth'
import { useStore } from '@/lib/store'
import AdminRoute from '@/components/AdminRoute'
import { useTranslation } from '@/lib/useTranslation'
import { migrateUserGrades, calculateUserTotalSales } from '@/lib/userGradeUtils'
import { calculateNextGradeAmount } from '@/lib/vipGradeConfig'
import { useContentStore } from '@/lib/contentStore'
import GradeBadge from '@/components/GradeBadge'
import { User as UserType } from '@/lib/userAuth'
import { isUuid } from '@/lib/isUuid'

interface User extends UserType {
  // UserType from lib/userAuth already includes all VIP grade fields
}

export default function UserManagementPage() {
  // 모든 hooks를 먼저 호출 (조건부 return 이전에)
  const router = useRouter()
  const { adminUser, isLoggedIn } = useAdminAuth()
  const { users, register, deleteUser, updateUser } = useUserAuth()
  const { orders, language, setLanguage, _hasHydrated, defaultPageSize } = useStore()
  const { getActiveVIPGradeConfigs, vipGradeConfigs: storeVipGradeConfigs } = useContentStore()
  const { t } = useTranslation()
  
  // 인증 체크는 hooks 호출 이후에
  const canWrite = !!adminUser?.permissions?.includes('users:write')
  const isAdminLoggedIn = !!adminUser
  
  // 모든 등급을 포함하도록: 기본값을 기반으로 하고 vipGradeConfigs에 있는 것들로 업데이트
  // 비활성화된 등급도 포함하여 통계 및 드롭다운에 표시
  // useMemo로 메모이제이션하여 hooks 순서 일관성 유지
  const getAllGradeConfigsForDisplay = useMemo(() => {
    // 기본 등급 정의 (0-4 모두 포함)
    const defaultGradeDefinitions = [
      { code: 0, name: '일반', nameEn: 'Basic', minAmount: 0, maxAmount: 100, color: 'gray' },
      { code: 1, name: '실버', nameEn: 'Silver', minAmount: 100, maxAmount: 300, color: 'silver' },
      { code: 2, name: '골드', nameEn: 'Gold', minAmount: 300, maxAmount: 1000, color: 'gold' },
      { code: 3, name: '블랙', nameEn: 'Black', minAmount: 1000, maxAmount: 3000, color: 'black' },
      { code: 4, name: 'VVIP', nameEn: 'VVIP', minAmount: 3000, maxAmount: undefined, color: 'purple' }
    ]
    
    // storeVipGradeConfigs에 있는 등급들로 업데이트 (비활성화된 것도 포함)
    if (storeVipGradeConfigs && storeVipGradeConfigs.length > 0) {
      const configMap = new Map()
      
      // 먼저 기본값으로 초기화
      defaultGradeDefinitions.forEach(def => {
        configMap.set(def.code, {
          id: `grade-config-${def.nameEn.toLowerCase()}-${def.code}`,
          code: def.code,
          name: def.name,
          nameEn: def.nameEn,
          minAmount: def.minAmount,
          maxAmount: def.maxAmount,
          color: def.color,
          benefits: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      })
      
      // storeVipGradeConfigs의 등급으로 업데이트 (비활성화된 것도 포함)
      storeVipGradeConfigs.forEach(config => {
        configMap.set(config.code, config)
      })
      
      return Array.from(configMap.values()).sort((a, b) => a.code - b.code)
    }
    
    // storeVipGradeConfigs가 없으면 기본값 사용 (활성화된 것만)
    // getActiveVIPGradeConfigs는 함수이므로 dependency array에 포함하지 않음
    return getActiveVIPGradeConfigs()
  }, [storeVipGradeConfigs]) // getActiveVIPGradeConfigs는 함수이므로 제외
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isGradeEditModalOpen, setIsGradeEditModalOpen] = useState(false)
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const [usersMainTab, setUsersMainTab] = useState<'vip' | 'supabase'>('vip')

  // 권한 관리 상태
  const [permissionFormData, setPermissionFormData] = useState({
    canPost: true,
    isBanned: false,
    banReason: '',
    banExpiresAt: ''
  })
  
  // 필터 상태
  const [filterGrade, setFilterGrade] = useState<number | 'all'>('all')
  const [filterOrderStatus, setFilterOrderStatus] = useState<'all' | 'with' | 'without'>('all')
  const [filterRegistrationDate, setFilterRegistrationDate] = useState<'all' | '30days' | '7days'>('all')
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize) // 기본 페이지 크기
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  })
  const [gradeEditFormData, setGradeEditFormData] = useState({
    gradeCode: 0,
    reason: ''
  })
  
  // 검색 + 필터 + 정렬 (useMemo는 hooks이므로 최상단에)
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 검색 필터
      const q = searchTerm.trim().toLowerCase()
      if (q) {
        const phoneDigits = (user.phone || '').replace(/\D/g, '').replace(/^\+?61/, '0')
        const qDigits = (searchTerm.match(/\d+/g) || []).join('').replace(/^\+?61/, '0')
        const matchesSearch = (
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          (qDigits && phoneDigits.includes(qDigits))
        )
        if (!matchesSearch) return false
      }
      
      // VIP 등급 필터
      if (filterGrade !== 'all') {
        if ((user.currentGrade ?? 0) !== filterGrade) return false
      }
      
      // 주문 여부 필터
      if (filterOrderStatus !== 'all') {
        const uEmail = (user.email || '').trim().toLowerCase()
        const uPhone = (user.phone || '').replace(/\D/g, '').replace(/^\+?61/, '0')
        const hasOrders = orders.some(o => {
          const oEmail = (o.customer.email || '').trim().toLowerCase()
          const oPhone = (o.customer.phone || '').replace(/\D/g, '').replace(/^\+?61/, '0')
          return (uEmail && uEmail === oEmail) || (!!uPhone && oPhone.includes(uPhone))
        })
        
        if (filterOrderStatus === 'with' && !hasOrders) return false
        if (filterOrderStatus === 'without' && hasOrders) return false
      }
      
      // 가입일 필터
      if (filterRegistrationDate !== 'all' && user.createdAt) {
        const userDate = new Date(user.createdAt).getTime()
        const now = Date.now()
        const daysDiff = (now - userDate) / (1000 * 60 * 60 * 24)
        
        if (filterRegistrationDate === '30days' && daysDiff > 30) return false
        if (filterRegistrationDate === '7days' && daysDiff > 7) return false
      }
      
      return true
    })
  }, [users, searchTerm, filterGrade, filterOrderStatus, filterRegistrationDate, orders])

  const displayUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return sortDesc ? bt - at : at - bt
    })
  }, [filteredUsers, sortDesc])

  // VIP 등급별 통계용 데이터 (hooks는 컴포넌트 최상단에서만 호출)
  const gradeStats = useMemo(() => {
    const stats: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
    users.forEach((u: User) => {
      const grade = u.currentGrade ?? 0
      stats[grade] = (stats[grade] || 0) + 1
    })
    return stats
  }, [users])

  const totalSales = useMemo(() => {
    // 실시간으로 주문에서 총 판매액 계산
    if (!_hasHydrated) return 0
    return users.reduce((sum: number, u: User) => {
      const userTotalSales = calculateUserTotalSales(u.email, orders, u.phone)
      return sum + userTotalSales
    }, 0)
  }, [users, orders, _hasHydrated])
  
  // 페이지네이션 계산
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(displayUsers.length / pageSize) || 1)
  }, [displayUsers.length, pageSize])

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return displayUsers.slice(start, end)
  }, [displayUsers, currentPage, pageSize])
  
  // 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterGrade, filterOrderStatus, filterRegistrationDate, pageSize])

  useEffect(() => {
    // 현재 페이지가 범위를 벗어나면 조정
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])
  
  // VIP 등급 시스템: 기존 사용자 데이터 마이그레이션
  useEffect(() => {
    if (_hasHydrated && orders.length >= 0) {
      // 한 번만 실행되도록 체크
      const hasMigrated = localStorage.getItem('vip-grade-migration-completed')
      if (!hasMigrated) {
        try {
          const migratedCount = migrateUserGrades(users, orders, updateUser)
          if (migratedCount > 0) {
            console.log(`✅ VIP 등급 시스템 마이그레이션 완료: ${migratedCount}명의 사용자 등급 초기화`)
            localStorage.setItem('vip-grade-migration-completed', 'true')
          }
        } catch (error) {
          console.error('❌ VIP 등급 시스템 마이그레이션 오류:', error)
        }
      }
    }
  }, [_hasHydrated, orders.length, users.length, updateUser])


  // Helper: AU phone formatter
  const formatAuPhone = (raw?: string) => {
    const digits = (raw || '').replace(/\D/g, '').replace(/^\+?61/, '0')
    if (digits.length === 10 && digits.startsWith('04')) {
      return `${digits.slice(0,4)} ${digits.slice(4,7)} ${digits.slice(7,10)}`
    }
    return raw || '-'
  }

  // 최근 결제수단 (환불 기준으로 참고)
  const mapPaymentLabel = (m?: string) => {
    switch (m) {
      case 'card': return t('admin.users.payment.card')
      case 'paypal': return t('admin.users.payment.paypal')
      case 'bank': return t('admin.users.payment.bank')
      case 'cash': return t('admin.users.payment.cash')
      default: return '-'
    }
  }

  const getLastPaymentMethod = (user: User) => {
    const userEmail = (user.email || '').trim().toLowerCase()
    const userPhoneDigits = (user.phone || '').replace(/\D/g, '').replace(/^\+?61/, '0')
    const matched = orders
      .filter(o => {
        const oEmail = (o.customer.email || '').trim().toLowerCase()
        const oPhone = (o.customer.phone || '').replace(/\D/g, '').replace(/^\+?61/, '0')
        return (oEmail && oEmail === userEmail) || (!!userPhoneDigits && oPhone.includes(userPhoneDigits))
      })
      .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime())
    return mapPaymentLabel(matched[0]?.paymentMethod)
  }

  const paymentBadgeClasses = (label: string) => {
    switch (label) {
      case t('admin.users.payment.card'):
        return 'bg-indigo-50 text-indigo-600'
      case t('admin.users.payment.paypal'):
        return 'bg-sky-50 text-sky-600'
      case t('admin.users.payment.bank'):
        return 'bg-amber-50 text-amber-600'
      case t('admin.users.payment.cash'):
        return 'bg-emerald-50 text-emerald-600'
      default:
        return 'bg-gray-50 text-gray-600'
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const success = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone
      })
      
      if (success.success) {
        setIsAddModalOpen(false)
        setFormData({ name: '', email: '', phone: '', password: '' })
        alert(t('admin.users.messages.userAdded'))
      } else {
        alert(t('admin.users.messages.userAddFailed'))
      }
    } catch (error) {
      console.error('사용자 추가 실패:', error)
      alert(t('admin.users.messages.userAddFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: ''
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsLoading(true)

    try {
      const pwd = formData.password.trim()
      const hasPublicSupabase =
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())

      if (hasPublicSupabase && isUuid(selectedUser.id) && pwd) {
        const res = await fetch('/api/admin/supabase-users', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedUser.id,
            action: 'setPassword',
            newPassword: pwd,
          }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          alert(typeof j.error === 'string' ? j.error : t('admin.users.messages.userUpdateFailed'))
          return
        }
      }

      updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      })

      setIsEditModalOpen(false)
      setSelectedUser(null)
      setFormData({ name: '', email: '', phone: '', password: '' })
      alert(t('admin.users.messages.userUpdated'))
    } catch (error) {
      console.error('사용자 수정 실패:', error)
      alert(t('admin.users.messages.userUpdateFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('admin.users.messages.confirmDelete'))) return

    const hasPublicSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())

    if (hasPublicSupabase && isUuid(userId)) {
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/supabase-users', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          alert(typeof j.error === 'string' ? j.error : 'Delete failed')
          return
        }
      } finally {
        setIsLoading(false)
      }
    }

    deleteUser(userId)
    alert(t('admin.users.messages.userDeleted'))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleEditGrade = (user: User) => {
    setSelectedUser(user)
    setGradeEditFormData({
      gradeCode: user.currentGrade ?? 0,
      reason: user.gradeOverrideReason || ''
    })
    setIsGradeEditModalOpen(true)
  }

  const handleSaveGrade = async () => {
    if (!selectedUser) return
    
    setIsLoading(true)
    try {
      const updatedUser: User = {
        ...selectedUser,
        currentGrade: gradeEditFormData.gradeCode,
        manualGradeOverride: gradeEditFormData.gradeCode !== (selectedUser.currentGrade ?? 0),
        gradeOverrideReason: gradeEditFormData.reason || undefined,
        gradeUpdatedAt: new Date().toISOString()
      }
      
      updateUser(selectedUser.id, updatedUser)
      setIsGradeEditModalOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating grade:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 권한 관리 함수들
  const handleOpenPermissionModal = (user: User) => {
    setSelectedUser(user)
    setPermissionFormData({
      canPost: user.canPost !== false, // undefined면 true로 간주
      isBanned: user.isBanned === true,
      banReason: user.banReason || '',
      banExpiresAt: user.banExpiresAt ? new Date(user.banExpiresAt).toISOString().slice(0, 16) : ''
    })
    setIsPermissionModalOpen(true)
  }

  const handleSavePermission = async () => {
    if (!selectedUser) return
    
    setIsLoading(true)
    try {
      // 차단 만료 시간 처리
      let banExpiresAtValue: string | undefined = undefined
      if (permissionFormData.isBanned && permissionFormData.banExpiresAt) {
        banExpiresAtValue = new Date(permissionFormData.banExpiresAt).toISOString()
      } else if (permissionFormData.isBanned && !permissionFormData.banExpiresAt) {
        // 영구 차단 (banExpiresAt 없음)
        banExpiresAtValue = undefined
      } else {
        // 차단 해제 시 만료 시간 제거
        banExpiresAtValue = undefined
      }

      const updatedUser: User = {
        ...selectedUser,
        canPost: permissionFormData.canPost,
        isBanned: permissionFormData.isBanned,
        banReason: permissionFormData.isBanned ? (permissionFormData.banReason || undefined) : undefined,
        banExpiresAt: banExpiresAtValue
      }
      
      updateUser(selectedUser.id, updatedUser)
      setIsPermissionModalOpen(false)
      setSelectedUser(null)
      alert(t('admin.users.messages.userUpdated') || 'User permissions updated successfully')
    } catch (error) {
      console.error('Error updating permissions:', error)
      alert('Failed to update permissions')
    } finally {
      setIsLoading(false)
    }
  }

  // 차단 만료 시간 자동 체크 및 해제
  useEffect(() => {
    const checkBanExpiration = () => {
      const now = new Date()
      let hasChanges = false
      
      const updatedUsers = users.map(user => {
        if (user.isBanned && user.banExpiresAt) {
          const banExpires = new Date(user.banExpiresAt)
          if (now > banExpires) {
            // 차단 만료됨 - 자동 해제
            hasChanges = true
            return {
              ...user,
              isBanned: false,
              banReason: undefined,
              banExpiresAt: undefined
            }
          }
        }
        return user
      })
      
      if (hasChanges) {
        // 사용자 데이터 업데이트 (localStorage에 저장)
        const stored = localStorage.getItem('users')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            const updated = parsed.map((u: User) => {
              const found = updatedUsers.find(updated => updated.id === u.id)
              return found || u
            })
            localStorage.setItem('users', JSON.stringify(updated))
            // 상태 업데이트를 위해 페이지 새로고침 또는 상태 갱신
            window.location.reload()
          } catch (error) {
            console.error('Error updating expired bans:', error)
          }
        }
      }
    }

    // 초기 체크
    checkBanExpiration()
    
    // 1분마다 체크
    const interval = setInterval(checkBanExpiration, 60000)
    
    return () => clearInterval(interval)
  }, [users])

  return (
    <AdminRoute requiredPermissions={['users:read']}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* 헤더 */}
        <AdminPageHeader
          title={t('admin.users.title')}
          icon={<Users className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel={t('admin.common.dashboard')}
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        <div className="flex-1 flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-0 w-full">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setUsersMainTab('vip')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                usersMainTab === 'vip'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Shop profiles &amp; VIP
            </button>
            <button
              type="button"
              onClick={() => setUsersMainTab('supabase')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                usersMainTab === 'supabase'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Supabase Auth accounts
            </button>
          </div>

          <div className={usersMainTab === 'supabase' ? 'mb-10' : 'hidden'}>
            <SupabaseAuthUsersPanel canWrite={canWrite} />
          </div>

          <div className={usersMainTab === 'vip' ? '' : 'hidden'}>
          {/* VIP 등급 모니터링 링크 */}
          <div className="mb-6 flex-shrink-0">
            <a
              href="/admin/users/grades"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-sm transition-all"
            >
              <Award size={18} />
              <span>VIP Grade Status Monitoring</span>
              <ChevronRight size={16} />
            </a>
          </div>
          
          {/* 요약 카드 (접기/펼치기 가능) */}
          <div className="flex-shrink-0 mb-6">
            <button
              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              {isSummaryCollapsed ? (
                <>
                  <ChevronDown size={18} />
                  <span className="text-sm font-medium">Show Summary</span>
                </>
              ) : (
                <>
                  <ChevronUp size={18} />
                  <span className="text-sm font-medium">Hide Summary</span>
                </>
              )}
            </button>
            
            {!isSummaryCollapsed && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(() => {
              const totalUsers = users.length
              const newUsers = users.filter((u: User) => u.createdAt && (new Date('2025-09-03').getTime() - new Date(u.createdAt).getTime()) < 7*24*60*60*1000).length
              const usersWithOrders = users.filter(u => {
                const uEmail = (u.email || '').trim().toLowerCase()
                const uPhone = (u.phone || '').replace(/\D/g, '').replace(/^\+?61/, '0')
                return orders.some(o => {
                  const oEmail = (o.customer.email || '').trim().toLowerCase()
                  const oPhone = (o.customer.phone || '').replace(/\D/g, '').replace(/^\+?61/, '0')
                  return (uEmail && uEmail === oEmail) || (!!uPhone && oPhone.includes(uPhone))
                })
              }).length
              const withoutOrders = totalUsers - usersWithOrders
              return (
                <>
                  <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{t('admin.users.cards.total')}</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{totalUsers}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Users size={22} />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{t('admin.users.cards.new7days')}</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{newUsers}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Calendar size={22} />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{t('admin.users.cards.withOrders')}</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{usersWithOrders}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                      <ArrowUpDown size={22} />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{t('admin.users.cards.withoutOrders')}</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{withoutOrders}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Users size={22} />
                    </div>
                  </div>
                </>
              )
            })()}
                </div>

                {/* VIP 등급별 통계 카드 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  {getAllGradeConfigsForDisplay.map((grade) => {
                    const count = gradeStats[grade.code] || 0
                    const percentage = users.length > 0 ? ((count / users.length) * 100).toFixed(1) : '0.0'
                    return (
                      <div key={grade.code} className="bg-white rounded-xl border shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                          <GradeBadge gradeCode={grade.code} size="sm" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                        <div className="text-xs text-gray-500 mt-1">{percentage}%</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {grade.nameEn === 'Basic' ? '$0+' : 
                           grade.nameEn === 'VVIP' ? `$${grade.minAmount.toLocaleString()}+` :
                           `$${grade.minAmount.toLocaleString()}+`}
                        </div>
                      </div>
                    )
                  })}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl border shadow-sm p-4 text-white">
                    <div className="text-sm opacity-90 mb-2">Total Sales</div>
                    <div className="text-2xl font-bold">${(totalSales / 1000).toFixed(0)}K</div>
                    <div className="text-xs opacity-75 mt-1">
                      ${totalSales.toLocaleString()} AUD
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 검색 및 필터 */}
          <div className="bg-white rounded-xl border shadow-sm p-4 mb-6 flex-shrink-0">
            <div className="flex flex-col gap-4">
              {/* 검색 및 정렬/추가 버튼 */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder={t('admin.users.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-500"
                      aria-label="검색 지우기"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSortDesc(!sortDesc)}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <ArrowUpDown size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700">{sortDesc ? t('admin.users.newest') : t('admin.users.oldest')}</span>
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-blue-700 shadow-sm inline-flex items-center gap-2"
                    >
                      <Plus size={18} />
                      <span>{t('admin.users.addUser')}</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* 필터 옵션 */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>
                
                {/* VIP 등급 필터 */}
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Grades</option>
                  {getAllGradeConfigsForDisplay.map((grade) => (
                    <option key={grade.code} value={grade.code}>
                      {grade.nameEn}
                    </option>
                  ))}
                </select>
                
                {/* 주문 여부 필터 */}
                <select
                  value={filterOrderStatus}
                  onChange={(e) => setFilterOrderStatus(e.target.value as 'all' | 'with' | 'without')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Users</option>
                  <option value="with">With Orders</option>
                  <option value="without">Without Orders</option>
                </select>
                
                {/* 가입일 필터 */}
                <select
                  value={filterRegistrationDate}
                  onChange={(e) => setFilterRegistrationDate(e.target.value as 'all' | '30days' | '7days')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Time</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="7days">Last 7 Days</option>
                </select>
                
                {/* 필터 초기화 */}
                {(filterGrade !== 'all' || filterOrderStatus !== 'all' || filterRegistrationDate !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterGrade('all')
                      setFilterOrderStatus('all')
                      setFilterRegistrationDate('all')
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1"
                  >
                    <X size={14} />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 사용자 목록 */}
          <div className="flex-1 min-h-0 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users size={18} className="text-indigo-600" /> {t('admin.users.total')}: {displayUsers.length}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {displayUsers.length > 0 
                      ? `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, displayUsers.length)} of ${displayUsers.length} users`
                      : t('admin.users.manageDesc')
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="overflow-x-auto h-full">
                <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1400px' }}>
                  <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      {t('admin.users.table.user')}
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      {t('admin.users.table.contact')}
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      {t('admin.users.table.email')}
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      <MapPin className="inline mr-1" size={14}/> {t('admin.users.table.address')}
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      VIP Grade
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Total Sales
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      {t('admin.users.table.lastPayment')}
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      {t('admin.users.table.registeredAt')}
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Posting Permission
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      {t('admin.users.table.actions')}
                    </th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-lg font-medium">{t('admin.users.emptyTitle')}</p>
                          <p className="text-sm">{t('admin.users.emptyDesc')}</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user, index) => {
                        const lastPaymentLabel = getLastPaymentMethod(user)
                        // 고유한 key 생성: user.id가 중복될 수 있으므로 index도 포함
                        const uniqueKey = `${user.id}-${user.email}-${index}`
                        return (
                          <tr key={uniqueKey} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-indigo-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    <span>{user.name}</span>
                                    {user.createdAt && (new Date('2025-09-03').getTime() - new Date(user.createdAt).getTime() < 7*24*60*60*1000) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">New</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatAuPhone(user.phone)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate" title={user.address || '-'}>
                              {user.address || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <GradeBadge gradeCode={user.currentGrade ?? 0} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {(() => {
                                // 실시간으로 주문에서 총 판매액 계산
                                const userTotalSales = _hasHydrated ? calculateUserTotalSales(user.email, orders, user.phone) : (user.totalSalesAmount || 0)
                                return (
                                  <>
                                    <div className="font-medium">${(userTotalSales / 1000).toFixed(1)}K</div>
                                    <div className="text-xs text-gray-500">
                                      ${userTotalSales.toLocaleString()} AUD
                                    </div>
                                  </>
                                )
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal ${paymentBadgeClasses(lastPaymentLabel)}`}>
                                {lastPaymentLabel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Calendar className="inline mr-1 text-gray-400" size={14} /> {user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {(() => {
                                // 차단 만료 시간 확인
                                let isCurrentlyBanned = user.isBanned === true
                                let banExpiresText = ''
                                
                                if (isCurrentlyBanned && user.banExpiresAt) {
                                  const banExpires = new Date(user.banExpiresAt)
                                  const now = new Date()
                                  if (now > banExpires) {
                                    isCurrentlyBanned = false // 만료됨
                                  } else {
                                    const daysLeft = Math.ceil((banExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                    banExpiresText = ` (${daysLeft}d left)`
                                  }
                                }
                                
                                const canPost = user.canPost !== false && !isCurrentlyBanned
                                
                                return (
                                  <div className="flex items-center gap-2">
                                    {canPost ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                        Allowed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                        <Ban className="w-3 h-3 mr-1" />
                                        {isCurrentlyBanned ? `Banned${banExpiresText}` : 'Disabled'}
                                      </span>
                                    )}
                                    {canWrite && (
                                      <button
                                        onClick={() => handleOpenPermissionModal(user)}
                                        className="text-indigo-600 hover:text-indigo-800 p-1"
                                        title="Manage Posting Permission"
                                      >
                                        <Shield size={14} />
                                      </button>
                                    )}
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => { setSelectedUser(user); setIsViewModalOpen(true) }}
                                  className="text-gray-600 hover:text-gray-900 p-1 inline-flex items-center gap-1"
                                  title={t('admin.common.view')}
                                >
                                  <Eye size={16} />
                                </button>
                                {canWrite && (
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="text-indigo-600 hover:text-indigo-800 p-1 inline-flex items-center gap-1"
                                    title={t('admin.common.edit')}
                                  >
                                    <Edit size={16} />
                                  </button>
                                )}
                                {isAdminLoggedIn && (
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600 hover:text-red-800 p-1 inline-flex items-center gap-1"
                                    title={t('admin.common.delete')}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 페이지네이션 */}
            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* 왼쪽: 정보 및 Rows per page */}
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-700">
                    {displayUsers.length === 0 
                      ? 'No users found'
                      : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(displayUsers.length, currentPage * pageSize)} of ${displayUsers.length}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                
                {/* 오른쪽: 페이지 네비게이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="First page"
                    >
                      <ChevronsLeft size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} className="text-gray-600" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next page"
                    >
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Last page"
                    >
                      <ChevronsRight size={16} className="text-gray-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
          </div>

        {/* 사용자 추가 모달 */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
              {/* 헤더 */}
              <div className="flex items-center justify-between p-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">
                  {t('admin.users.modals.addUser.title')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 폼 내용 (스크롤 가능) */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.users.modals.addUser.name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.users.modals.addUser.email')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.users.modals.addUser.phone')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.users.modals.addUser.password')}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </form>
              </div>

              {/* 하단 버튼 영역 */}
              <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t bg-white">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isLoading}
                >
                  {t('admin.users.modals.addUser.cancel')}
                </button>
                <button
                  type="submit"
                  form="" // 폼 제출은 Enter 키로도 가능하지만, 명시적 form id가 필요하면 설정 가능
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isLoading}
                  onClick={(e) => {
                    // form onSubmit을 트리거
                    e.preventDefault()
                    const form = e.currentTarget.closest('div')?.previousElementSibling?.querySelector('form')
                    if (form) {
                      (form as HTMLFormElement).requestSubmit()
                    }
                  }}
                >
                  {isLoading ? t('admin.users.modals.addUser.adding') : t('admin.users.modals.addUser.add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 사용자 수정 모달 */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">{t('admin.users.modals.editUser.title')}</h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setSelectedUser(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.users.modals.editUser.name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.users.modals.editUser.email')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.users.modals.editUser.phone')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.users.modals.editUser.newPassword')}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t('admin.users.modals.editUser.passwordPlaceholder')}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditModalOpen(false)
                        setSelectedUser(null)
                      }}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      {t('admin.users.modals.editUser.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          {t('admin.users.modals.editUser.updating')}
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          {t('admin.users.modals.editUser.update')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 사용자 상세 보기 모달 */}
        {isViewModalOpen && selectedUser && (() => {
          const userGrade = selectedUser.currentGrade ?? 0
          // 실시간으로 주문에서 총 판매액 계산
          const totalSales = _hasHydrated 
            ? calculateUserTotalSales(selectedUser.email, orders, selectedUser.phone)
            : (selectedUser.totalSalesAmount || 0)
          const gradeConfigs = getActiveVIPGradeConfigs()
          const nextGradeAmount = calculateNextGradeAmount(userGrade, totalSales, gradeConfigs)
          const gradeInfo = gradeConfigs.find(g => g.code === userGrade)
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 pb-4 border-b">
                  <h3 className="text-lg font-semibold">{t('admin.users.modals.viewUser.title')}</h3>
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false)
                      setSelectedUser(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-3 text-sm">
                  <div><span className="text-gray-500">{t('admin.users.modals.viewUser.name')}:</span> <span className="text-gray-900">{selectedUser.name}</span></div>
                  <div><span className="text-gray-500">{t('admin.users.modals.viewUser.email')}:</span> <span className="text-gray-900">{selectedUser.email}</span></div>
                  <div><span className="text-gray-500">{t('admin.users.modals.viewUser.phone')}:</span> <span className="text-gray-900">{formatAuPhone(selectedUser.phone)}</span></div>
                  <div><span className="text-gray-500">{t('admin.users.modals.viewUser.address')}:</span> <span className="text-gray-900">{selectedUser.address || '-'}</span></div>
                  
                  {/* VIP 등급 정보 */}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{t('admin.users.modals.viewUser.vipGrade')}:</span>
                        <GradeBadge gradeCode={userGrade} />
                        {selectedUser.manualGradeOverride && (
                          <span className="text-xs text-amber-600" title={t('admin.users.modals.viewUser.manualOverride')}>🔒</span>
                        )}
                      </div>
                      {canWrite && (
                        <button
                          onClick={() => handleEditGrade(selectedUser)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm flex items-center gap-1"
                          title={t('admin.users.modals.viewUser.editGrade')}
                        >
                          <Edit size={14} />
                          <span>{t('admin.users.modals.viewUser.editGrade')}</span>
                        </button>
                      )}
                    </div>
                    <div><span className="text-gray-500">{t('admin.users.modals.viewUser.totalSales')}:</span> <span className="text-gray-900 font-medium">${totalSales.toLocaleString()}</span></div>
                    {nextGradeAmount > 0 && (
                      <div className="text-xs text-purple-600 mt-1">
                        {t('admin.users.modals.viewUser.nextGrade')}: ${nextGradeAmount.toLocaleString()}
                      </div>
                    )}
                    {gradeInfo && gradeInfo.benefits.length > 0 && (
                      <div className="mt-2">
                        <span className="text-gray-500 text-xs">{t('admin.users.modals.viewUser.benefits')}:</span>
                        <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                          {gradeInfo.benefits.map((benefit, idx) => (
                            <li key={idx}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedUser.gradeUpdatedAt && (
                      <div className="text-xs text-gray-400 mt-1">
                        {t('admin.users.modals.viewUser.gradeUpdated')}: {new Date(selectedUser.gradeUpdatedAt).toLocaleString()}
                      </div>
                    )}
                    {selectedUser.manualGradeOverride && selectedUser.gradeOverrideReason && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                        <div className="text-amber-800 font-medium">{t('admin.users.modals.viewUser.manualOverrideReason')}:</div>
                        <div className="text-amber-700 mt-1">{selectedUser.gradeOverrideReason}</div>
                      </div>
                    )}
                  </div>
                  
                    <div><span className="text-gray-500">{t('admin.users.modals.viewUser.registeredAt')}:</span> <span className="text-gray-900">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toISOString().split('T')[0] : '-'}</span></div>
                    <div><span className="text-gray-500">{t('admin.users.modals.viewUser.id')}:</span> <span className="text-gray-900">{selectedUser.id}</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t bg-white">
                  <button
                    type="button"
                    onClick={() => { setIsViewModalOpen(false); setSelectedUser(null) }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('admin.users.modals.viewUser.close')}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* 등급 수정 모달 */}
        {isGradeEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">{t('admin.users.modals.editGrade.title')}</h3>
                <button
                  onClick={() => {
                    setIsGradeEditModalOpen(false)
                    setSelectedUser(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.users.modals.editGrade.customer')}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{selectedUser.name}</div>
                    <div className="text-sm text-gray-500">{selectedUser.email}</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.users.modals.editGrade.currentGrade')}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <GradeBadge gradeCode={selectedUser.currentGrade ?? 0} />
                    <div className="text-xs text-gray-500 mt-1">
                      {(() => {
                        // 실시간으로 주문에서 총 판매액 계산
                        const userTotalSales = _hasHydrated 
                          ? calculateUserTotalSales(selectedUser.email, orders, selectedUser.phone)
                          : (selectedUser.totalSalesAmount || 0)
                        return `${t('admin.users.modals.viewUser.totalSales')}: $${(userTotalSales / 1000).toFixed(1)}K`
                      })()}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.users.modals.editGrade.newGrade')}
                  </label>
                  <select
                    value={gradeEditFormData.gradeCode}
                    onChange={(e) => setGradeEditFormData({ ...gradeEditFormData, gradeCode: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {getAllGradeConfigsForDisplay.map((grade) => (
                      <option key={grade.code} value={grade.code}>
                        {grade.nameEn} ({grade.name})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.users.modals.editGrade.reason')}
                    <span className="text-xs text-gray-500 ml-1">{t('admin.users.modals.editGrade.reasonOptional')}</span>
                  </label>
                  <textarea
                    value={gradeEditFormData.reason}
                    onChange={(e) => setGradeEditFormData({ ...gradeEditFormData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder={t('admin.users.modals.editGrade.reasonPlaceholder')}
                  />
                </div>
                
                {selectedUser.manualGradeOverride && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="text-amber-600 mt-0.5" size={16} />
                      <div className="text-sm text-amber-800">
                        <div className="font-medium">{t('admin.users.modals.editGrade.manualOverrideActive')}</div>
                        {selectedUser.gradeOverrideReason && (
                          <div className="mt-1 text-amber-700">{selectedUser.gradeOverrideReason}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t bg-white">
                <button
                  onClick={() => {
                    setIsGradeEditModalOpen(false)
                    setSelectedUser(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('admin.users.modals.editGrade.cancel')}
                </button>
                <button
                  onClick={handleSaveGrade}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      {t('admin.users.modals.editGrade.saving')}
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {t('admin.users.modals.editGrade.save')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 권한 관리 모달 */}
        {isPermissionModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 pb-4 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Manage Posting Permission
                </h3>
                <button
                  onClick={() => {
                    setIsPermissionModalOpen(false)
                    setSelectedUser(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Information
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{selectedUser.name}</div>
                    <div className="text-sm text-gray-500">{selectedUser.email}</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Managed By
                  </label>
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="font-medium text-indigo-900">Administrator</div>
                        <div className="text-sm text-indigo-700">admin@selpic.com.au</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={permissionFormData.canPost}
                      onChange={(e) => setPermissionFormData({ ...permissionFormData, canPost: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    Allow Posting
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    When disabled, user cannot create posts in Community Board
                  </p>
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={permissionFormData.isBanned}
                      onChange={(e) => setPermissionFormData({ ...permissionFormData, isBanned: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    Ban User
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Banned users cannot post regardless of posting permission
                  </p>
                </div>
                
                {permissionFormData.isBanned && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ban Reason
                        <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                      </label>
                      <textarea
                        value={permissionFormData.banReason}
                        onChange={(e) => setPermissionFormData({ ...permissionFormData, banReason: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="Reason for banning this user..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ban Expires At
                        <span className="text-xs text-gray-500 ml-1">(Leave empty for permanent ban)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={permissionFormData.banExpiresAt}
                        onChange={(e) => setPermissionFormData({ ...permissionFormData, banExpiresAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        If set, ban will automatically expire at this time
                      </p>
                    </div>
                  </>
                )}
                
                {selectedUser.isBanned && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Ban className="text-red-600 mt-0.5" size={16} />
                      <div className="text-sm text-red-800">
                        <div className="font-medium">User is currently banned</div>
                        {selectedUser.banReason && (
                          <div className="mt-1 text-red-700">Reason: {selectedUser.banReason}</div>
                        )}
                        {selectedUser.banExpiresAt && (
                          <div className="mt-1 text-red-700">
                            Expires: {new Date(selectedUser.banExpiresAt).toLocaleString()}
                          </div>
                        )}
                        {!selectedUser.banExpiresAt && (
                          <div className="mt-1 text-red-700">Permanent ban</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t bg-white">
                <button
                  onClick={() => {
                    setIsPermissionModalOpen(false)
                    setSelectedUser(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePermission}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
} 