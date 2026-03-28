'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Award, X, Eye, EyeOff, Calendar, Percent, DollarSign, Gift, Clock, Info, Users, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { useContentStore, VIPGradeBenefit } from '@/lib/contentStore'
import { useUserAuth } from '@/lib/userAuth'
import { useStore } from '@/lib/store'
import { calculateUserTotalSales } from '@/lib/userGradeUtils'
import GradeBadge from '@/components/GradeBadge'

export default function VIPGradeBenefitManager() {
  const {
    vipGradeBenefits,
    addVIPGradeBenefit,
    updateVIPGradeBenefit,
    deleteVIPGradeBenefit,
    toggleVIPGradeBenefitActive,
    getActiveVIPGradeConfigs,
    vipGradeConfigs,
    updateVIPGradeConfig,
    addVIPGradeConfig
  } = useContentStore()
  const { users } = useUserAuth()
  const { orders, _hasHydrated } = useStore()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<VIPGradeBenefit | null>(null)

  const openModal = (benefit?: VIPGradeBenefit) => {
    if (benefit) {
      setEditingBenefit(benefit)
    } else {
      setEditingBenefit(null)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingBenefit(null)
  }

  const handleSave = (formData: any) => {
    // VIP Grade Benefit 저장
    if (editingBenefit) {
      updateVIPGradeBenefit(editingBenefit.id, formData)
    } else {
      addVIPGradeBenefit(formData)
    }
    
    // VIP Grade Criteria도 함께 업데이트 (minAmount, maxAmount가 있는 경우)
    if (formData.minAmount !== undefined || formData.maxAmount !== undefined) {
      const existingConfig = vipGradeConfigs.find(c => c.code === formData.gradeCode)
      
      if (existingConfig) {
        // 기존 Config 업데이트
        updateVIPGradeConfig(existingConfig.id, {
          minAmount: formData.minAmount !== undefined ? formData.minAmount : existingConfig.minAmount,
          maxAmount: formData.maxAmount !== undefined ? formData.maxAmount : existingConfig.maxAmount,
          name: formData.gradeName || existingConfig.name,
          nameEn: formData.gradeName || existingConfig.nameEn
        })
      } else {
        // 새 Config 추가
        addVIPGradeConfig({
          code: formData.gradeCode,
          name: formData.gradeName || `Grade ${formData.gradeCode}`,
          nameEn: formData.gradeName || `Grade ${formData.gradeCode}`,
          minAmount: formData.minAmount || 0,
          maxAmount: formData.maxAmount,
          color: ['gray', 'silver', 'gold', 'black', 'purple'][formData.gradeCode] || 'gray',
          benefits: formData.additionalBenefits?.split('\n').filter((b: string) => b.trim()) || [],
          isActive: true
        })
      }
    }
    
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this VIP grade benefit?')) {
      deleteVIPGradeBenefit(id)
    }
  }

  // 모든 등급을 포함하도록: 비활성 등급이 있어도 드롭다운에 표시
  const getAllGradeConfigs = () => {
    if (vipGradeConfigs && vipGradeConfigs.length > 0) {
      return [...vipGradeConfigs].sort((a, b) => a.code - b.code)
    }
    return getActiveVIPGradeConfigs()
  }

  const activeBenefits = vipGradeBenefits.filter(b => b.isActive)
  const inactiveBenefits = vipGradeBenefits.filter(b => !b.isActive)

  const getGradeName = (gradeCode: number) => {
    const grade = getAllGradeConfigs().find(g => g.code === gradeCode)
    return grade ? grade.nameEn : `Grade ${gradeCode}`
  }

  const isEventActive = (benefit: VIPGradeBenefit) => {
    if (!benefit.eventStartDate || !benefit.eventEndDate) return false
    const now = new Date()
    const start = new Date(benefit.eventStartDate)
    const end = new Date(benefit.eventEndDate)
    return now >= start && now <= end
  }

  // 등급별 통계 계산
  const gradeStats = useMemo(() => {
    if (!_hasHydrated) {
      return {} as Record<number, { count: number; totalSales: number; avgSales: number; customers: typeof users }>
    }
    
    const stats: Record<number, { count: number; totalSales: number; avgSales: number; customers: typeof users }> = {}
    
    // 모든 등급 초기화
    getAllGradeConfigs().forEach(grade => {
      stats[grade.code] = { count: 0, totalSales: 0, avgSales: 0, customers: [] }
    })
    
    users.forEach((user) => {
      const grade = user.currentGrade ?? 0
      const totalSales = calculateUserTotalSales(user.email, orders, user.phone)
      
      if (!stats[grade]) {
        stats[grade] = { count: 0, totalSales: 0, avgSales: 0, customers: [] }
      }
      
      stats[grade].count++
      stats[grade].totalSales += totalSales
      stats[grade].customers.push(user)
    })
    
    // 평균 계산
    Object.keys(stats).forEach(key => {
      const grade = parseInt(key)
      if (stats[grade].count > 0) {
        stats[grade].avgSales = stats[grade].totalSales / stats[grade].count
      }
    })
    
    return stats
  }, [users, orders, _hasHydrated, vipGradeConfigs])

  // 등급별 고객 목록 표시 상태
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set())
  const [selectedGradeForCustomers, setSelectedGradeForCustomers] = useState<number | null>(null)

  const toggleGradeCustomers = (gradeCode: number) => {
    if (selectedGradeForCustomers === gradeCode) {
      setSelectedGradeForCustomers(null)
    } else {
      setSelectedGradeForCustomers(gradeCode)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Award className="text-purple-600" size={20} />
            VIP Grade Management
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage VIP grade criteria (sales thresholds) and benefits (discounts, free shipping, events) in one place.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-sm inline-flex items-center gap-2"
        >
          <Plus size={18} />
          Add Benefit
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="text-blue-600 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Unified VIP Grade Management</h4>
          <p className="text-xs text-blue-700">
            Manage both grade criteria (minimum/maximum sales amounts) and benefits (discounts, free shipping) in one place. 
            When you save a benefit, the corresponding grade criteria will be automatically updated.
            Customer grades are automatically updated when orders are completed.
          </p>
        </div>
      </div>

      {/* 등급별 통계 대시보드 */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={20} />
          Grade Statistics Dashboard
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {getAllGradeConfigs().map((grade) => {
            const stats = gradeStats[grade.code] || { count: 0, totalSales: 0, avgSales: 0, customers: [] }
            const percentage = users.length > 0 
              ? ((stats.count / users.length) * 100).toFixed(1) 
              : '0.0'
            
            return (
              <div key={grade.code} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <GradeBadge gradeCode={grade.code} size="sm" />
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
                    <div className="text-xs text-gray-500">Customers ({percentage}%)</div>
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
                  <button
                    onClick={() => toggleGradeCustomers(grade.code)}
                    className="w-full mt-2 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50 flex items-center justify-center gap-1"
                  >
                    {selectedGradeForCustomers === grade.code ? (
                      <>
                        <ChevronUp size={12} />
                        Hide Customers
                      </>
                    ) : (
                      <>
                        <Users size={12} />
                        View Customers ({stats.count})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 등급별 고객 목록 */}
      {selectedGradeForCustomers !== null && gradeStats[selectedGradeForCustomers] && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="text-indigo-600" size={20} />
              {getAllGradeConfigs().find(g => g.code === selectedGradeForCustomers)?.nameEn || `Grade ${selectedGradeForCustomers}`} Customers
              <span className="text-sm font-normal text-gray-500">
                ({gradeStats[selectedGradeForCustomers].count} customers)
              </span>
            </h4>
            <button
              onClick={() => setSelectedGradeForCustomers(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          {gradeStats[selectedGradeForCustomers].customers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">No customers in this grade</p>
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
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gradeStats[selectedGradeForCustomers].customers.map((customer) => {
                    const customerTotalSales = _hasHydrated 
                      ? calculateUserTotalSales(customer.email, orders, customer.phone)
                      : (customer.totalSalesAmount || 0)
                    
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{customer.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${(customerTotalSales / 1000).toFixed(1)}K
                          </div>
                          <div className="text-xs text-gray-500">
                            ${customerTotalSales.toLocaleString()} AUD
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.manualGradeOverride ? (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800">
                              Manual Override
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                              Auto
                            </span>
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
      )}

      {/* Active Benefits */}
      {activeBenefits.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700 flex items-center gap-2">
            <Eye size={16} className="text-green-600" />
            Active VIP Grades ({activeBenefits.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBenefits.map((benefit) => {
              const gradeInfo = getAllGradeConfigs().find(g => g.code === benefit.gradeCode)
              const eventActive = isEventActive(benefit)
              
              return (
                <div key={benefit.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{benefit.gradeName}</span>
                        {eventActive && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                            <Clock size={10} />
                            Event Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Grade Code: {benefit.gradeCode}</div>
                    </div>
                    <button
                      onClick={() => toggleVIPGradeBenefitActive(benefit.id)}
                      className="text-green-600 hover:text-green-700"
                      title="Deactivate"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-3">
                    {/* Grade Criteria */}
                    {gradeInfo && (
                      <div className="pb-2 border-b border-gray-100">
                        <div className="text-xs font-medium text-gray-700 mb-1">Grade Criteria (AUD)</div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Min Amount:</span>
                          <span className="font-medium text-gray-900">${gradeInfo.minAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Max Amount:</span>
                          <span className="font-medium text-gray-900">
                            {gradeInfo.maxAmount === undefined ? 'Unlimited' : `$${gradeInfo.maxAmount.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Benefits */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Base Discount:</span>
                      <span className="font-medium text-gray-900">{benefit.baseDiscountPercentage}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Free Shipping:</span>
                      <span className={`font-medium ${benefit.freeShipping ? 'text-green-600' : 'text-gray-400'}`}>
                        {benefit.freeShipping ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {benefit.maxDiscountAmount && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Max Discount:</span>
                        <span className="font-medium text-gray-900">${benefit.maxDiscountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {benefit.eventName && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs font-medium text-purple-700 mb-1">{benefit.eventName}</div>
                        {benefit.eventStartDate && benefit.eventEndDate && (
                          <div className="text-xs text-gray-500">
                            {new Date(benefit.eventStartDate).toLocaleDateString()} - {new Date(benefit.eventEndDate).toLocaleDateString()}
                          </div>
                        )}
                        {benefit.eventDiscountPercentage !== undefined && (
                          <div className="text-xs text-gray-600 mt-1">
                            Event Bonus: +{benefit.eventDiscountPercentage}% (Total: {benefit.baseDiscountPercentage + benefit.eventDiscountPercentage}%)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openModal(benefit)}
                      className="flex-1 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50 flex items-center justify-center gap-1"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(benefit.id)}
                      className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 flex items-center justify-center gap-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Inactive Benefits */}
      {inactiveBenefits.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700 flex items-center gap-2">
            <EyeOff size={16} className="text-gray-400" />
            Inactive Benefits ({inactiveBenefits.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveBenefits.map((benefit) => (
              <div key={benefit.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-75">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-700">{benefit.gradeName}</div>
                    <div className="text-xs text-gray-500">Grade Code: {benefit.gradeCode}</div>
                  </div>
                  <button
                    onClick={() => toggleVIPGradeBenefitActive(benefit.id)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Activate"
                  >
                    <EyeOff size={16} />
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {benefit.baseDiscountPercentage}% discount
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => openModal(benefit)}
                    className="flex-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(benefit.id)}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {vipGradeBenefits.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">No VIP grade configurations</p>
          <p className="text-sm text-gray-500 mt-1">Add your first VIP grade to get started</p>
          <button
            onClick={() => openModal()}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Add VIP Grade
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingBenefit ? 'Edit VIP Grade' : 'Add VIP Grade'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <VIPGradeBenefitForm
              benefit={editingBenefit}
              onSave={handleSave}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function VIPGradeBenefitForm({ 
  benefit, 
  onSave, 
  onCancel 
}: { 
  benefit: VIPGradeBenefit | null
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const { getActiveVIPGradeConfigs, vipGradeConfigs } = useContentStore()
  
  // 모든 등급을 포함하도록: 기본값을 기반으로 하고 vipGradeConfigs에 있는 것들로 업데이트
  // 비활성화된 등급도 포함하여 드롭다운에 표시
  const getAllGradeConfigsForForm = () => {
    // 기본 등급 정의 (0-4 모두 포함)
    const defaultGradeDefinitions = [
      { code: 0, name: '일반', nameEn: 'Basic', minAmount: 0, maxAmount: 100, color: 'gray' },
      { code: 1, name: '실버', nameEn: 'Silver', minAmount: 100, maxAmount: 300, color: 'silver' },
      { code: 2, name: '골드', nameEn: 'Gold', minAmount: 300, maxAmount: 1000, color: 'gold' },
      { code: 3, name: '블랙', nameEn: 'Black', minAmount: 1000, maxAmount: 3000, color: 'black' },
      { code: 4, name: 'VVIP', nameEn: 'VVIP', minAmount: 3000, maxAmount: undefined, color: 'purple' }
    ]
    
    // vipGradeConfigs에 있는 등급들로 업데이트 (비활성화된 것도 포함)
    if (vipGradeConfigs && vipGradeConfigs.length > 0) {
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
      
      // vipGradeConfigs의 등급으로 업데이트 (비활성화된 것도 포함)
      vipGradeConfigs.forEach(config => {
        configMap.set(config.code, config)
      })
      
      return Array.from(configMap.values()).sort((a, b) => a.code - b.code)
    }
    
    // vipGradeConfigs가 없으면 기본값 사용 (활성화된 것만)
    return getActiveVIPGradeConfigs()
  }
  
  const allGradeConfigs = getAllGradeConfigsForForm()
  const existingConfig = benefit ? allGradeConfigs.find(g => g.code === benefit.gradeCode) : null

  const [formData, setFormData] = useState({
    gradeCode: benefit?.gradeCode ?? 0,
    gradeName: benefit?.gradeName ?? '',
    // Grade Criteria (from VIPGradeConfig)
    minAmount: existingConfig?.minAmount ?? 0,
    maxAmount: existingConfig?.maxAmount ?? undefined,
    // Base Benefits
    baseDiscountPercentage: benefit?.baseDiscountPercentage ?? 0,
    freeShipping: benefit?.freeShipping ?? false,
    maxDiscountAmount: benefit?.maxDiscountAmount ?? undefined,
    minPurchaseAmount: benefit?.minPurchaseAmount ?? undefined,
    // Event Benefits
    eventName: benefit?.eventName ?? '',
    eventStartDate: benefit?.eventStartDate ? new Date(benefit.eventStartDate).toISOString().split('T')[0] : '',
    eventEndDate: benefit?.eventEndDate ? new Date(benefit.eventEndDate).toISOString().split('T')[0] : '',
    eventDiscountPercentage: benefit?.eventDiscountPercentage ?? undefined,
    eventFreeShipping: benefit?.eventFreeShipping ?? undefined,
    eventMaxDiscountAmount: benefit?.eventMaxDiscountAmount ?? undefined,
    // Additional
    additionalBenefits: benefit?.additionalBenefits?.join('\n') ?? '',
    categoryDiscounts: benefit?.categoryDiscounts ? Object.entries(benefit.categoryDiscounts).map(([cat, discount]) => `${cat}:${discount}`).join(',') : '',
    isActive: benefit?.isActive ?? true,
    priority: benefit?.priority ?? 1,
    allowPromoCodeStacking: benefit?.allowPromoCodeStacking ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parseCategoryDiscounts = (input: string) => {
      if (!input || typeof input !== 'string') return undefined

      // 세미콜론도 구분자로 허용하고, 불필요한 공백을 정리
      const normalizedInput = input.replace(/;/g, ',')
      const entries = normalizedInput.split(',').map(s => s.trim()).filter(Boolean)
      if (entries.length === 0) return undefined

      const result: Record<string, number> = {}

      entries.forEach(entry => {
        // "cat:value" 혹은 "cat value" 형태를 모두 허용
        let catRaw = ''
        let valRaw = ''

        if (entry.includes(':')) {
          [catRaw, valRaw] = entry.split(':').map(s => s.trim())
        } else {
          // 콜론이 없으면 마지막 토큰을 값으로 간주 (예: "Market S 10")
          const parts = entry.split(/\s+/).filter(Boolean)
          if (parts.length >= 2) {
            valRaw = parts.pop() || ''
            catRaw = parts.join(' ')
          }
        }

        if (!catRaw || !valRaw) return

        const valNum = parseFloat(valRaw)
        if (isNaN(valNum)) return

        // 카테고리명 정규화 (HotGoods 등)
        const lower = catRaw.toLowerCase()
        let cat = catRaw
        if (lower.includes('market s') || lower === 'market s' || lower === 'markets') cat = 'HotGoods'
        if (lower.includes('phone case') || lower.includes('phone-case') || lower.includes('phonecase') || lower.includes('phone cases')) cat = 'HotGoods'
        if (lower.includes('hotgoods') || lower.includes('hot goods') || lower.includes('hot-goods') || lower === 'hot') cat = 'HotGoods'
        if (lower.includes('sticker')) cat = 'Stickers'
        if (lower.includes('stamp')) cat = 'Stamps'

        result[cat] = valNum
      })

      return Object.keys(result).length > 0 ? result : undefined
    }
    
    const submitData = {
      ...formData,
      maxDiscountAmount: formData.maxDiscountAmount || undefined,
      minPurchaseAmount: formData.minPurchaseAmount || undefined,
      eventStartDate: formData.eventStartDate ? new Date(formData.eventStartDate) : undefined,
      eventEndDate: formData.eventEndDate ? new Date(formData.eventEndDate) : undefined,
      eventDiscountPercentage: formData.eventDiscountPercentage || undefined,
      eventFreeShipping: formData.eventFreeShipping !== undefined ? formData.eventFreeShipping : undefined,
      eventMaxDiscountAmount: formData.eventMaxDiscountAmount || undefined,
      additionalBenefits: formData.additionalBenefits.split('\n').filter(b => b.trim()),
      categoryDiscounts: parseCategoryDiscounts(formData.categoryDiscounts || '')
    }
    
    onSave(submitData)
  }

  const selectedGrade = allGradeConfigs.find(g => g.code === formData.gradeCode)

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Grade Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          VIP Grade <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.gradeCode}
          onChange={(e) => {
            const code = parseInt(e.target.value)
            const grade = allGradeConfigs.find(g => g.code === code)
            setFormData({
              ...formData,
              gradeCode: code,
              gradeName: grade?.nameEn || '',
              minAmount: grade?.minAmount ?? formData.minAmount,
              maxAmount: grade?.maxAmount ?? formData.maxAmount
            })
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          required
        >
          {allGradeConfigs.map((grade) => (
            <option key={grade.code} value={grade.code}>
              {grade.nameEn} ({grade.name}) - Code {grade.code}
            </option>
          ))}
        </select>
      </div>

      {/* Grade Criteria Section */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign size={16} />
          Grade Criteria (Sales Thresholds) - AUD
        </h4>
        <p className="text-xs text-gray-500 mb-4">
          Set the minimum and maximum cumulative sales amounts required for customers to achieve this VIP grade.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Amount (AUD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.minAmount}
                onChange={(e) => setFormData({ ...formData, minAmount: parseFloat(e.target.value) || 0 })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum cumulative sales amount to achieve this grade</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Amount (AUD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min={formData.minAmount}
                step="0.01"
                value={formData.maxAmount || ''}
                onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Leave empty for unlimited (highest grade only)"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum cumulative sales amount. Leave empty for unlimited (highest grade only).
            </p>
          </div>
        </div>
      </div>

      {/* Base Benefits */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Gift size={16} />
          Base Benefits (Always Applied)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Discount Percentage <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.baseDiscountPercentage}
                onChange={(e) => setFormData({ ...formData, baseDiscountPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Free Shipping
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.freeShipping}
                onChange={(e) => setFormData({ ...formData, freeShipping: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Enable free shipping for this grade</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Discount Amount (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                value={formData.maxDiscountAmount || ''}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="No limit"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Maximum discount amount when percentage is applied</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Purchase Amount (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                value={formData.minPurchaseAmount || ''}
                onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="No minimum"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum purchase amount to apply this benefit</p>
          </div>
        </div>
      </div>

      {/* Event Benefits */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={16} />
          Event Benefits (Optional - Time Limited)
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={formData.eventName}
              onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Christmas Special Event"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Start Date
              </label>
              <input
                type="date"
                value={formData.eventStartDate}
                onChange={(e) => setFormData({ ...formData, eventStartDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event End Date
              </label>
              <input
                type="date"
                value={formData.eventEndDate}
                onChange={(e) => setFormData({ ...formData, eventEndDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {(formData.eventStartDate || formData.eventEndDate) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Additional Discount (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.eventDiscountPercentage || ''}
                    onChange={(e) => setFormData({ ...formData, eventDiscountPercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-8"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Additional discount on top of base discount (Total: {formData.baseDiscountPercentage + (formData.eventDiscountPercentage || 0)}%)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Max Discount Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.eventMaxDiscountAmount || ''}
                    onChange={(e) => setFormData({ ...formData, eventMaxDiscountAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Free Shipping
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eventFreeShipping ?? false}
                    onChange={(e) => setFormData({ ...formData, eventFreeShipping: e.target.checked ? true : undefined })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Override free shipping during event</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Benefits */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Benefits (One per line)
        </label>
        <textarea
          value={formData.additionalBenefits}
          onChange={(e) => setFormData({ ...formData, additionalBenefits: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          placeholder="e.g.,&#10;Special gift&#10;Priority customer service&#10;Exclusive access"
        />
        <p className="text-xs text-gray-500 mt-1">Enter one benefit per line</p>
      </div>

      {/* Priority & Active */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <input
            type="number"
            min="1"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">Higher priority benefits are applied first</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allow Promo Code Stacking
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allowPromoCodeStacking}
              onChange={(e) => setFormData({ ...formData, allowPromoCodeStacking: e.target.checked })}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Allow this VIP discount to stack with promo codes</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">If unchecked, only the larger discount (VIP or promo) will be applied</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category-Specific Discounts (Optional)
          </label>
          <input
            type="text"
            value={formData.categoryDiscounts}
            onChange={(e) => setFormData({ ...formData, categoryDiscounts: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="e.g., Market S:10"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: Category:DiscountPercentage (comma-separated). Example: Market S:10 means 10% discount for Market S category.
            <br />
            <strong>Important:</strong> Stickers and Stamps use base discount percentage. Market S uses the discount specified here (0% if not specified).
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {benefit ? 'Update VIP Grade' : 'Add VIP Grade'}
        </button>
      </div>
    </form>
  )
}

