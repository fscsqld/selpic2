'use client'

import { useState } from 'react'

interface VIPGradeConfigAddFormProps {
  onSave: (data: any) => void
  onCancel: () => void
  existingCodes: number[]
}

export default function VIPGradeConfigAddForm({ 
  onSave, 
  onCancel,
  existingCodes
}: VIPGradeConfigAddFormProps) {
  const [formData, setFormData] = useState({
    code: 0,
    minAmount: 0,
    maxAmount: undefined as number | undefined,
    name: '',
    nameEn: '',
    color: 'gray',
    benefits: '',
    isActive: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (existingCodes.includes(formData.code)) {
      alert(`Grade code ${formData.code} already exists. Please choose a different code.`)
      return
    }
    
    const submitData = {
      ...formData,
      maxAmount: formData.maxAmount || undefined,
      benefits: formData.benefits.split('\n').filter(b => b.trim())
    }
    
    onSave(submitData)
  }

  const quickAddPresets = [
    { code: 0, name: '일반', nameEn: 'Basic', minAmount: 0, maxAmount: 100, color: 'gray', benefits: '기본 5% 할인 쿠폰' },
    { code: 1, name: '실버', nameEn: 'Silver', minAmount: 100, maxAmount: 300, color: 'silver', benefits: '5% 상시 할인\n생일 쿠폰' },
    { code: 2, name: '골드', nameEn: 'Gold', minAmount: 300, maxAmount: 1000, color: 'gold', benefits: '7% 상시 할인\n무료 배송 쿠폰' },
    { code: 3, name: '블랙', nameEn: 'Black', minAmount: 1000, maxAmount: 3000, color: 'black', benefits: '10% 상시 할인\n전용 고객 센터' },
    { code: 4, name: 'VVIP', nameEn: 'VVIP', minAmount: 3000, maxAmount: undefined, color: 'purple', benefits: '15% 상시 할인\n특별 선물' }
  ]

  const applyPreset = (preset: typeof quickAddPresets[0]) => {
    if (existingCodes.includes(preset.code)) {
      alert(`Grade code ${preset.code} (${preset.nameEn}) already exists.`)
      return
    }
    setFormData({
      code: preset.code,
      minAmount: preset.minAmount,
      maxAmount: preset.maxAmount,
      name: preset.name,
      nameEn: preset.nameEn,
      color: preset.color,
      benefits: preset.benefits,
      isActive: true
    })
  }

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Add Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Add (Click to fill form)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickAddPresets.map((preset) => {
                const exists = existingCodes.includes(preset.code)
                return (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    disabled={exists}
                    className={`px-3 py-2 text-xs border rounded-lg text-left transition-colors ${
                      exists
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 hover:bg-gray-50 hover:border-indigo-400'
                    }`}
                    title={exists ? `Grade ${preset.code} already exists` : `Add ${preset.nameEn} grade`}
                  >
                    <div className="font-medium">{preset.nameEn}</div>
                    <div className="text-xs text-gray-500">Code: {preset.code}</div>
                    {exists && <div className="text-xs text-red-500 mt-1">Exists</div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Grade Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade Code <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
            {existingCodes.includes(formData.code) && (
              <p className="text-xs text-red-500 mt-1">This grade code already exists!</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Unique code for this grade (0-10)</p>
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
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum cumulative sales amount for this grade. Leave empty for unlimited (highest grade only).
            </p>
          </div>

          {/* Grade Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Korean Name <span className="text-red-500">*</span>
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
                English Name <span className="text-red-500">*</span>
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
              Color <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
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
              Benefits (One per line) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="e.g.,&#10;5% discount&#10;Free shipping"
              required
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
              disabled={existingCodes.includes(formData.code)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add Grade
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

