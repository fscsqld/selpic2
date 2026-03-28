'use client'

import { useState } from 'react'
import { Edit, Award, X, Eye, EyeOff, DollarSign, Info, RefreshCw, Plus } from 'lucide-react'
import { useContentStore, VIPGradeConfig } from '@/lib/contentStore'
import VIPGradeConfigAddForm from './VIPGradeConfigAddForm'

export default function VIPGradeConfigManager() {
  const {
    vipGradeConfigs,
    updateVIPGradeConfig,
    toggleVIPGradeConfigActive,
    getActiveVIPGradeConfigs,
    addVIPGradeConfig
  } = useContentStore()
  
  const [editingConfig, setEditingConfig] = useState<VIPGradeConfig | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const activeConfigs = getActiveVIPGradeConfigs()

  // 디버깅: 현재 상태 확인
  console.log('🔍 VIPGradeConfigManager 상태:', {
    vipGradeConfigsCount: vipGradeConfigs?.length || 0,
    activeConfigsCount: activeConfigs?.length || 0,
    vipGradeConfigs: vipGradeConfigs,
    activeConfigs: activeConfigs
  })

  const restoreMissingGrades = () => {
    const existingCodes = vipGradeConfigs.map(c => c.code)
    const missingCodes = [0, 1, 2, 3, 4].filter(code => !existingCodes.includes(code))
    
    if (missingCodes.length === 0) {
      alert('All default grades (Basic, Silver, Gold, Black, VVIP) already exist.')
      return
    }

    const defaultConfigs: VIPGradeConfig[] = [
      {
        id: 'grade-config-basic-0',
        code: 0,
        name: '일반',
        nameEn: 'Basic',
        minAmount: 0,
        maxAmount: 100,
        color: 'gray',
        benefits: ['기본 5% 할인 쿠폰 (자동 할인 없음)'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'grade-config-silver-1',
        code: 1,
        name: '실버',
        nameEn: 'Silver',
        minAmount: 100,
        maxAmount: 300,
        color: 'silver',
        benefits: ['5% 상시 할인', '최대 할인 $10,000', '생일 쿠폰'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'grade-config-gold-2',
        code: 2,
        name: '골드',
        nameEn: 'Gold',
        minAmount: 300,
        maxAmount: 1000,
        color: 'gold',
        benefits: ['10% 상시 할인', '무료 배송', '최대 할인 $20,000'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'grade-config-black-3',
        code: 3,
        name: '블랙',
        nameEn: 'Black',
        minAmount: 1000,
        maxAmount: 3000,
        color: 'black',
        benefits: ['20% 상시 할인', '무료 배송', '최대 할인 $50,000', '전용 고객 센터'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'grade-config-vvip-4',
        code: 4,
        name: 'VVIP',
        nameEn: 'VVIP',
        minAmount: 3000,
        maxAmount: undefined,
        color: 'purple',
        benefits: ['50% 상시 할인', '무료 배송', '최대 할인 $100,000', '특별 선물'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const gradeNames: Record<number, string> = {
      0: 'Basic',
      1: 'Silver',
      2: 'Gold',
      3: 'Black',
      4: 'VVIP'
    }

    missingCodes.forEach(code => {
      const config = defaultConfigs.find(c => c.code === code)
      if (config) {
        addVIPGradeConfig({
          code: config.code,
          name: config.name,
          nameEn: config.nameEn,
          minAmount: config.minAmount,
          maxAmount: config.maxAmount,
          color: config.color,
          benefits: config.benefits,
          isActive: config.isActive
        })
      }
    })

    const restoredNames = missingCodes.map(c => gradeNames[c]).join(', ')
    alert(`Restored ${missingCodes.length} missing grade(s): ${restoredNames}`)
  }

  const openEditModal = (config: VIPGradeConfig) => {
    setEditingConfig(config)
    setIsModalOpen(true)
  }

  const openAddModal = () => {
    setIsAddModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingConfig(null)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
  }

  const handleSave = (formData: any) => {
    if (editingConfig) {
      updateVIPGradeConfig(editingConfig.id, formData)
    }
    closeModal()
  }

  const handleAdd = (formData: any) => {
    addVIPGradeConfig(formData)
    closeAddModal()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Award className="text-purple-600" size={20} />
            VIP Grade Criteria Management
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage the minimum and maximum sales amounts (AUD) required for each VIP grade.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            title="Add new VIP grade"
          >
            <Plus size={16} />
            Add Grade
          </button>
          <button
            onClick={restoreMissingGrades}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            title="Restore missing default grades (Basic, Silver, Gold, Black, VVIP)"
          >
            <RefreshCw size={16} />
            Restore Missing
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="text-blue-600 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Currency: Australian Dollar (AUD)</h4>
          <p className="text-xs text-blue-700">
            All amounts are in Australian Dollars. The system uses cumulative total sales amount to determine customer grades.
          </p>
        </div>
      </div>

      {/* Grade Configs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeConfigs.map((config) => {
          const isHighestGrade = config.maxAmount === undefined
          
          return (
            <div key={config.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{config.nameEn}</span>
                    <span className="text-xs text-gray-500">({config.name})</span>
                  </div>
                  <div className="text-xs text-gray-500">Grade Code: {config.code}</div>
                </div>
                <button
                  onClick={() => toggleVIPGradeConfigActive(config.id)}
                  className={`${config.isActive ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title={config.isActive ? 'Deactivate' : 'Activate'}
                >
                  {config.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Min Amount:</span>
                  <span className="font-medium text-gray-900">${config.minAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Max Amount:</span>
                  <span className="font-medium text-gray-900">
                    {isHighestGrade ? 'Unlimited' : `$${config.maxAmount?.toLocaleString()}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-700 mb-1">Range:</div>
                  <div className="text-xs text-gray-600">
                    {config.code === 0 
                      ? `$0 - $${(config.maxAmount || 0).toLocaleString()}`
                      : isHighestGrade
                        ? `$${config.minAmount.toLocaleString()}+`
                        : `$${config.minAmount.toLocaleString()} - $${(config.maxAmount || 0).toLocaleString()}`
                    }
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => openEditModal(config)}
                className="w-full px-3 py-2 text-sm text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50 flex items-center justify-center gap-1"
              >
                <Edit size={14} />
                Edit Criteria
              </button>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {activeConfigs.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">No VIP grade configurations</p>
          <p className="text-sm text-gray-500 mt-1">VIP grade configurations will appear here</p>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Edit VIP Grade Criteria: {editingConfig.nameEn}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <VIPGradeConfigForm
                config={editingConfig}
                onSave={handleSave}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Grade Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Add New VIP Grade
              </h3>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <VIPGradeConfigAddForm
                onSave={handleAdd}
                onCancel={closeAddModal}
                existingCodes={vipGradeConfigs.map(c => c.code)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Grade Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Add New VIP Grade
              </h3>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <VIPGradeConfigAddForm
                onSave={handleAdd}
                onCancel={closeAddModal}
                existingCodes={vipGradeConfigs.map(c => c.code)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VIPGradeConfigForm({ 
  config, 
  onSave, 
  onCancel 
}: { 
  config: VIPGradeConfig
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    minAmount: config.minAmount,
    maxAmount: config.maxAmount || undefined,
    name: config.name,
    nameEn: config.nameEn,
    color: config.color,
    benefits: config.benefits.join('\n'),
    isActive: config.isActive
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData = {
      ...formData,
      maxAmount: formData.maxAmount || undefined,
      benefits: formData.benefits.split('\n').filter(b => b.trim())
    }
    
    onSave(submitData)
  }

  const isHighestGrade = config.maxAmount === undefined

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Grade Info (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Grade Code</div>
            <div className="text-lg font-semibold text-gray-900">{config.code}</div>
          </div>

          {/* Min Amount */}
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
            <p className="text-xs text-gray-500 mt-1">Minimum cumulative sales amount required for this grade (AUD)</p>
          </div>

          {/* Max Amount */}
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
                placeholder="Leave empty for unlimited (highest grade)"
                disabled={isHighestGrade}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isHighestGrade 
                ? 'This is the highest grade (unlimited)'
                : 'Maximum cumulative sales amount for this grade. Leave empty for unlimited (highest grade only).'
              }
            </p>
          </div>

          {/* Grade Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Korean Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                English Name
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <select
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="gray">Gray</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="black">Black</option>
              <option value="purple">Purple</option>
            </select>
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benefits (One per line)
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="e.g.,&#10;5% discount&#10;Free shipping"
            />
            <p className="text-xs text-gray-500 mt-1">Enter one benefit per line</p>
          </div>

          {/* Active Status */}
          <div>
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
        </div>

        {/* Form Actions - Fixed Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-6">
          <div className="flex items-center justify-end gap-3">
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
              Update Criteria
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

