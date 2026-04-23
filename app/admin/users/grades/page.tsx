'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  Users, 
  Award,
  AlertCircle,
  ChevronRight,
  Edit,
  X,
  Check,
  Info
} from 'lucide-react'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useAdminAuth } from '@/lib/adminAuth'
import { useUserAuth } from '@/lib/userAuth'
import { useStore } from '@/lib/store'
import AdminRoute from '@/components/AdminRoute'
import { useTranslation } from '@/lib/useTranslation'
import { calculateNextGradeAmount, getGradeInfo } from '@/lib/vipGradeConfig'
import { useContentStore } from '@/lib/contentStore'
import GradeBadge from '@/components/GradeBadge'
import { User } from '@/lib/userAuth'
import { calculateUserTotalSales, recalculateAllUserGrades } from '@/lib/userGradeUtils'

interface BorderlineCustomer {
  user: User
  currentGrade: number
  nextGrade: number
  remainingAmount: number
  progressPercentage: number
}

export default function GradeStatusMonitoringPage() {
  const router = useRouter()
  const { adminUser } = useAdminAuth()
  const canWrite = !!adminUser?.permissions?.includes('users:write')
  const { users, updateUser } = useUserAuth()
  const { orders, _hasHydrated } = useStore()
  const { getActiveVIPGradeConfigs, vipGradeConfigs: storeVipGradeConfigs } = useContentStore()
  const { t } = useTranslation()
  
  // 모든 등급을 포함하도록: 기본값을 기반으로 하고 vipGradeConfigs에 있는 것들로 업데이트
  // 비활성화된 등급도 포함하여 Grade Distribution에 표시
  const getAllGradeConfigsForDisplay = () => {
    // 기본 등급 정의 (0-4 모두 포함)
    const defaultGradeDefinitions = [
      { code: 0, name: '일반', nameEn: 'Basic', minAmount: 0, maxAmount: 100, color: 'gray' },
      { code: 1, name: '실버', nameEn: 'Silver', minAmount: 100, maxAmount: 300, color: 'silver' },
      { code: 2, name: '골드', nameEn: 'Gold', minAmount: 300, maxAmount: 1000, color: 'gold' },
      { code: 3, name: '블랙', nameEn: 'Black', minAmount: 1000, maxAmount: 3000, color: 'black' },
      { code: 4, name: 'VVIP', nameEn: 'VVIP', minAmount: 3000, maxAmount: undefined, color: 'purple' }
    ]
    
    // vipGradeConfigs에 있는 등급들로 업데이트 (비활성화된 것도 포함)
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
    return getActiveVIPGradeConfigs()
  }
  
  // 관리자가 설정한 등급 기준 가져오기 (동적) - 모든 등급 포함
  const vipGradeConfigs = getAllGradeConfigsForDisplay()
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    gradeCode: 0,
    reason: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 사용자 정보 업데이트 이벤트 리스너 (실시간 반영)
  useEffect(() => {
    const handleUserUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      // VIP 등급 관련 필드가 업데이트된 경우에만 리프레시
      if (customEvent.detail?.userData?.currentGrade !== undefined || 
          customEvent.detail?.userData?.totalSalesAmount !== undefined) {
        console.log('🔄 VIP Grade Status Monitoring: 사용자 정보 업데이트 감지, 통계 새로고침')
        setRefreshTrigger(prev => prev + 1)
      }
    }

    if (typeof window === 'undefined') return
    
    window.addEventListener('user-updated', handleUserUpdate)
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('user-updated', handleUserUpdate)
      }
    }
  }, [])

  // Keep grade dashboards (including Borderline Customers) aligned with latest order ledger.
  useEffect(() => {
    if (!_hasHydrated) return
    recalculateAllUserGrades(users, orders, updateUser)
  }, [_hasHydrated, users, orders, updateUser])

  // 등급별 통계 계산
  const gradeStats = useMemo(() => {
    const stats: Record<number, { count: number; totalSales: number; avgSales: number }> = {
      0: { count: 0, totalSales: 0, avgSales: 0 },
      1: { count: 0, totalSales: 0, avgSales: 0 },
      2: { count: 0, totalSales: 0, avgSales: 0 },
      3: { count: 0, totalSales: 0, avgSales: 0 },
      4: { count: 0, totalSales: 0, avgSales: 0 }
    }
    
    users.forEach((u: User) => {
      const grade = u.currentGrade ?? 0
      // 실시간으로 주문에서 총 판매액 계산
      const sales = _hasHydrated ? calculateUserTotalSales(u.email, orders, u.phone) : (u.totalSalesAmount || 0)
      stats[grade].count++
      stats[grade].totalSales += sales
    })
    
    // 평균 계산
    Object.keys(stats).forEach(key => {
      const grade = parseInt(key)
      if (stats[grade].count > 0) {
        stats[grade].avgSales = stats[grade].totalSales / stats[grade].count
      }
    })
    
    return stats
  }, [users, orders, _hasHydrated, refreshTrigger])

  // 경계선 고객 목록 (다음 등급까지 80% 이상 진행)
  const borderlineCustomers = useMemo(() => {
    const borderline: BorderlineCustomer[] = []
    
    // 모든 등급 정보 가져오기 (비활성화된 등급도 포함)
    const allGradeConfigs = getAllGradeConfigsForDisplay()
    
    users.forEach((user: User) => {
      const currentGrade = user.currentGrade ?? 0
      // 실시간으로 주문에서 총 판매액 계산
      const totalSales = _hasHydrated ? calculateUserTotalSales(user.email, orders, user.phone) : (user.totalSalesAmount || 0)
      const nextGrade = currentGrade + 1
      
      // 최고 등급이 아니고, 다음 등급이 존재하는 경우
      if (nextGrade <= 4) {
        const nextGradeInfo = allGradeConfigs.find(g => g.code === nextGrade)
        const currentGradeInfo = allGradeConfigs.find(g => g.code === currentGrade)
        
        if (nextGradeInfo && currentGradeInfo) {
          const remainingAmount = nextGradeInfo.minAmount - totalSales
          const currentMinAmount = currentGradeInfo.minAmount || 0
          const totalNeeded = nextGradeInfo.minAmount - currentMinAmount
          
          // 진행률 계산: (현재 구매액 - 현재 등급 최소액) / (다음 등급 최소액 - 현재 등급 최소액) * 100
          const progressPercentage = totalNeeded > 0 ? ((totalSales - currentMinAmount) / totalNeeded) * 100 : 0
          
          // 다음 등급까지 80% 이상 진행한 고객만 표시 (아직 다음 등급에 도달하지 않은 경우)
          if (progressPercentage >= 80 && remainingAmount > 0) {
            borderline.push({
              user,
              currentGrade,
              nextGrade,
              remainingAmount,
              progressPercentage: Math.min(progressPercentage, 100)
            })
          }
        }
      }
    })
    
    // 남은 금액이 적은 순으로 정렬
    return borderline.sort((a, b) => a.remainingAmount - b.remainingAmount)
  }, [users, orders, _hasHydrated, refreshTrigger, storeVipGradeConfigs])

  // 전체 통계
  const totalStats = useMemo(() => {
    const totalUsers = users.length
    // 실시간으로 주문에서 총 판매액 계산
    const totalSales = _hasHydrated 
      ? users.reduce((sum: number, u: User) => sum + calculateUserTotalSales(u.email, orders, u.phone), 0)
      : users.reduce((sum: number, u: User) => sum + (u.totalSalesAmount || 0), 0)
    const avgSales = totalUsers > 0 ? totalSales / totalUsers : 0
    const highestGradeCount = Math.max(...Object.values(gradeStats).map(s => s.count))
    
    return {
      totalUsers,
      totalSales,
      avgSales,
      highestGradeCount
    }
  }, [users, orders, _hasHydrated, gradeStats, refreshTrigger])

  const handleEditGrade = (user: User) => {
    setSelectedUser(user)
    setEditFormData({
      gradeCode: user.currentGrade ?? 0,
      reason: user.gradeOverrideReason || ''
    })
    setIsEditModalOpen(true)
  }

  const handleSaveGrade = async () => {
    if (!selectedUser) return
    
    setIsLoading(true)
    try {
      const updatedUser: User = {
        ...selectedUser,
        currentGrade: editFormData.gradeCode,
        manualGradeOverride: editFormData.gradeCode !== (selectedUser.currentGrade ?? 0),
        gradeOverrideReason: editFormData.reason || undefined,
        gradeUpdatedAt: new Date().toISOString()
      }
      
      updateUser(selectedUser.id, updatedUser)
      setIsEditModalOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating grade:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveOverride = (user: User) => {
    setIsLoading(true)
    try {
      const updatedUser: User = {
        ...user,
        manualGradeOverride: false,
        gradeOverrideReason: undefined
      }
      updateUser(user.id, updatedUser)
    } catch (error) {
      console.error('Error removing override:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!_hasHydrated) {
    return (
      <AdminRoute requiredPermissions={['users:read']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AdminRoute>
    )
  }

  return (
    <AdminRoute requiredPermissions={['users:read']}>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title="VIP Grade Status Monitoring"
          icon={<Award className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/users"
          backLabel="User Management"
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 전체 통계 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{totalStats.totalUsers}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users size={22} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    ${(totalStats.totalSales / 1000).toFixed(0)}K
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={22} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Sales</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    ${(totalStats.avgSales / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Award size={22} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Borderline Customers</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{borderlineCustomers.length}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <AlertCircle size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* 등급별 상세 통계 */}
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="text-indigo-600" size={20} />
              Grade Distribution
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {vipGradeConfigs.map((grade) => {
                const stats = gradeStats[grade.code]
                const percentage = totalStats.totalUsers > 0 
                  ? ((stats.count / totalStats.totalUsers) * 100).toFixed(1) 
                  : '0.0'
                
                return (
                  <div key={grade.code} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <GradeBadge gradeCode={grade.code} size="sm" />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
                        <div className="text-xs text-gray-500">Users ({percentage}%)</div>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-sm text-gray-500">Total Sales</div>
                        <div className="text-lg font-semibold text-gray-900">
                          ${(stats.totalSales / 1000).toFixed(1)}K
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Avg Sales</div>
                        <div className="text-sm font-medium text-gray-700">
                          ${(stats.avgSales / 1000).toFixed(1)}K
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 경계선 고객 목록 */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="text-amber-600" size={20} />
                Borderline Customers
                <span className="text-sm font-normal text-gray-500">
                  (80%+ progress to next grade)
                </span>
              </h2>
            </div>
            
            {borderlineCustomers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">No borderline customers</p>
                <p className="text-sm">No customers are close to reaching the next grade.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remaining
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {borderlineCustomers.map((item) => {
                      const gradeConfigs = getActiveVIPGradeConfigs()
                      const currentGradeInfo = getGradeInfo(item.currentGrade, gradeConfigs)
                      const nextGradeInfo = getGradeInfo(item.nextGrade, gradeConfigs)
                      
                      return (
                        <tr key={item.user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.user.name}</div>
                              <div className="text-sm text-gray-500">{item.user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <GradeBadge gradeCode={item.currentGrade} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <GradeBadge gradeCode={item.nextGrade} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-32">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>{item.progressPercentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                                  style={{ width: `${item.progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            <div className="font-medium">
                              ${(item.remainingAmount / 1000).toFixed(1)}K
                            </div>
                            <div className="text-xs text-gray-500">
                              ${item.remainingAmount.toLocaleString()} AUD
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {canWrite && (
                              <button
                                onClick={() => handleEditGrade(item.user)}
                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                title="Edit Grade"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 수동 등급 변경 모달 */}
          {isEditModalOpen && selectedUser && (() => {
            // 실시간으로 주문에서 총 판매액 계산
            const userTotalSales = _hasHydrated 
              ? calculateUserTotalSales(selectedUser.email, orders, selectedUser.phone)
              : (selectedUser.totalSalesAmount || 0)
            
            const currentGradeInfo = vipGradeConfigs.find(
              (g) => g.code === selectedUser.currentGrade
            )
            const selectedGradeInfo = vipGradeConfigs.find((g) => g.code === editFormData.gradeCode)
            const isGradeChanged = editFormData.gradeCode !== selectedUser.currentGrade
            
            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                  {/* 헤더 */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Edit VIP Grade</h3>
                      <p className="text-sm text-gray-500 mt-1">Manage customer's VIP grade manually</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false)
                        setSelectedUser(null)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  
                  {/* 스크롤 가능한 본문 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                      {/* 고객 정보 */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                          Customer Information
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Name</div>
                            <div className="text-lg font-semibold text-gray-900">{selectedUser.name}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Email</div>
                            <div className="text-sm text-gray-700 break-all">{selectedUser.email}</div>
                          </div>
                          {selectedUser.phone && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Phone</div>
                              <div className="text-sm text-gray-700">{selectedUser.phone}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Total Sales</div>
                            <div className="text-lg font-bold text-indigo-600">
                              ${userTotalSales.toLocaleString()} AUD
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 현재 등급 정보 */}
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                          Current Grade
                        </label>
                        <div className="flex items-center gap-4 mb-3">
                          <GradeBadge gradeCode={selectedUser.currentGrade ?? 0} size="lg" />
                          {currentGradeInfo && (
                            <div className="text-sm text-gray-600">
                              {currentGradeInfo.nameEn} ({currentGradeInfo.name})
                            </div>
                          )}
                        </div>
                        {currentGradeInfo && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Required Amount:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  ${currentGradeInfo.minAmount.toLocaleString()} 
                                  {currentGradeInfo.maxAmount ? ` - $${currentGradeInfo.maxAmount.toLocaleString()}` : '+'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Current Sales:</span>
                                <span className={`ml-2 font-medium ${
                                  userTotalSales >= currentGradeInfo.minAmount 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  ${userTotalSales.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 새 등급 선택 */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                          Select New Grade
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {vipGradeConfigs.map((grade) => {
                            const isSelected = editFormData.gradeCode === grade.code
                            const isCurrentGrade = grade.code === (selectedUser.currentGrade ?? 0)
                            const meetsRequirement = userTotalSales >= grade.minAmount
                            
                            return (
                              <button
                                key={grade.code}
                                onClick={() => setEditFormData({ ...editFormData, gradeCode: grade.code })}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                } ${isCurrentGrade ? 'ring-2 ring-amber-300' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <GradeBadge gradeCode={grade.code} size="sm" />
                                  {isCurrentGrade && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm font-semibold text-gray-900 mb-1">
                                  {grade.nameEn}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {grade.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  <div>Min: ${grade.minAmount.toLocaleString()}</div>
                                  {grade.maxAmount && (
                                    <div>Max: ${grade.maxAmount.toLocaleString()}</div>
                                  )}
                                </div>
                                {!meetsRequirement && !isCurrentGrade && (
                                  <div className="mt-2 text-xs text-red-600 font-medium">
                                    ⚠️ Below requirement
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      
                      {/* 선택된 등급 정보 */}
                      {selectedGradeInfo && isGradeChanged && (
                        <div className={`rounded-xl p-5 border-2 ${
                          userTotalSales >= selectedGradeInfo.minAmount
                            ? 'bg-green-50 border-green-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Info className={`${
                              userTotalSales >= selectedGradeInfo.minAmount
                                ? 'text-green-600'
                                : 'text-amber-600'
                            }`} size={20} />
                            <span className={`font-semibold ${
                              userTotalSales >= selectedGradeInfo.minAmount
                                ? 'text-green-800'
                                : 'text-amber-800'
                            }`}>
                              {userTotalSales >= selectedGradeInfo.minAmount 
                                ? 'Grade Change Preview' 
                                : 'Warning: Below Grade Requirement'}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">New Grade:</span>
                              <span className="font-semibold text-gray-900">
                                {selectedGradeInfo.nameEn} ({selectedGradeInfo.name})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Required Amount:</span>
                              <span className="font-medium text-gray-900">
                                ${selectedGradeInfo.minAmount.toLocaleString()}
                                {selectedGradeInfo.maxAmount ? ` - $${selectedGradeInfo.maxAmount.toLocaleString()}` : '+'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Current Sales:</span>
                              <span className={`font-medium ${
                                userTotalSales >= selectedGradeInfo.minAmount
                                  ? 'text-green-600'
                                  : 'text-amber-600'
                              }`}>
                                ${userTotalSales.toLocaleString()}
                              </span>
                            </div>
                            {userTotalSales < selectedGradeInfo.minAmount && (
                              <div className="mt-3 pt-3 border-t border-amber-200">
                                <div className="text-xs text-amber-700">
                                  <strong>Note:</strong> This customer's sales amount is below the requirement for this grade. 
                                  The change will be saved as a manual override.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* 수동 오버라이드 사유 */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                          Reason for Manual Override
                          <span className="text-xs font-normal text-gray-500 ml-2 normal-case">(Optional)</span>
                        </label>
                        <textarea
                          value={editFormData.reason}
                          onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                          placeholder="Enter reason for manual grade change (e.g., special promotion, customer request, etc.)..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This reason will be saved for audit purposes.
                        </p>
                      </div>
                      
                      {/* 기존 수동 오버라이드 알림 */}
                      {selectedUser.manualGradeOverride && (
                        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <Info className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                            <div className="flex-1">
                              <div className="font-semibold text-amber-900 mb-1">Manual Override Active</div>
                              <div className="text-sm text-amber-800">
                                This customer's grade is currently set manually and will not be updated automatically.
                              </div>
                              {selectedUser.gradeOverrideReason && (
                                <div className="mt-2 pt-2 border-t border-amber-200">
                                  <div className="text-xs text-amber-700 font-medium mb-1">Previous Reason:</div>
                                  <div className="text-sm text-amber-800">{selectedUser.gradeOverrideReason}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 푸터 버튼 */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false)
                        setSelectedUser(null)
                      }}
                      className="px-6 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveGrade}
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </AdminRoute>
  )
}

