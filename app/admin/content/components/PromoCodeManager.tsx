'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag, X, Eye, EyeOff, Calendar, Percent, DollarSign, Users, ShoppingCart, Clock, Gamepad2, RefreshCw } from 'lucide-react'
import { useContentStore, PromoCode } from '@/lib/contentStore'
import { useStore } from '@/lib/store'

export default function PromoCodeManager() {
  const {
    promoCodes,
    addPromoCode,
    updatePromoCode,
    deletePromoCode,
    togglePromoCodeActive,
    activateScheduledPromoCodes
  } = useContentStore()
  const { products } = useStore()
  
  // 카테고리 목록
  const categories = ['Stickers', 'Stamps', 'PhoneCases', 'HotGoods']
  
  // products가 없을 경우를 대비한 안전 처리
  const safeProducts = products || []

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null)

  type TetrisPromoRow = {
    id: string
    code: string
    source: string
    score: number | null
    level: number | null
    client_ip: string | null
    created_at: string
  }
  const [tetrisRows, setTetrisRows] = useState<TetrisPromoRow[]>([])
  const [tetrisLoading, setTetrisLoading] = useState(false)
  const [tetrisError, setTetrisError] = useState<string | null>(null)

  const loadTetrisServerLog = async () => {
    setTetrisLoading(true)
    setTetrisError(null)
    try {
      const res = await fetch('/api/admin/game-promo-codes?limit=200', {
        cache: 'no-store',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setTetrisRows([])
        setTetrisError(
          typeof data?.details === 'string'
            ? data.details
            : typeof data?.error === 'string'
              ? data.error
              : 'Failed to load server log'
        )
        return
      }
      setTetrisRows(Array.isArray(data.rows) ? data.rows : [])
    } catch {
      setTetrisRows([])
      setTetrisError('Network error')
    } finally {
      setTetrisLoading(false)
    }
  }

  useEffect(() => {
    void loadTetrisServerLog()
  }, [])

  const openModal = (code?: PromoCode) => {
    if (code) {
      setEditingCode(code)
    } else {
      setEditingCode(null)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCode(null)
  }

  const handleSave = (formData: any) => {
    // 코드를 정규화: 공백 제거 및 대문자 변환
    const normalizedData = {
      ...formData,
      code: formData.code.trim().toUpperCase()
    }
    
    if (editingCode) {
      updatePromoCode(editingCode.id, normalizedData)
    } else {
      addPromoCode(normalizedData)
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this promo code?')) {
      deletePromoCode(id)
    }
  }

  const activePromoCodes = promoCodes.filter(code => code.isActive)
  const inactivePromoCodes = promoCodes.filter(code => !code.isActive)
  const scheduledPromoCodes = promoCodes.filter(code => code.isScheduled && !code.isActive)

  // 예약된 프로모션 코드 자동 활성화 체크 (1분마다)
  useEffect(() => {
    const checkScheduledCodes = () => {
      activateScheduledPromoCodes()
    }

    // 즉시 한 번 체크
    checkScheduledCodes()

    // 1분마다 체크
    const interval = setInterval(checkScheduledCodes, 60000)

    return () => clearInterval(interval)
  }, [activateScheduledPromoCodes])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promo Code Management</h2>
          <p className="text-gray-600 mt-1">Create and manage promotional discount codes</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Promo Code
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Tag className="w-4 h-4" />
            <span className="text-sm">Total Codes</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{promoCodes.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Active</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{activePromoCodes.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm">Inactive</span>
          </div>
          <div className="text-2xl font-bold text-gray-400">{inactivePromoCodes.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Total Uses</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {promoCodes.reduce((sum, code) => sum + code.usageCount, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Scheduled</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {scheduledPromoCodes.length}
          </div>
        </div>
      </div>

      {/* Tetris final-level codes: server log (Supabase) — independent of CMS promo list */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-purple-600" aria-hidden />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Tetris reward codes (server log)</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Codes issued when a player clears level 5 are logged here after the storefront syncs them. Run{' '}
                <code className="text-xs bg-white px-1 rounded border">docs/game-promo-codes-supabase.sql</code> in
                Supabase if this section shows an error.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadTetrisServerLog()}
            disabled={tetrisLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${tetrisLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
        {tetrisError && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{tetrisError}</p>
        )}
        {!tetrisError && tetrisRows.length === 0 && !tetrisLoading && (
          <p className="text-sm text-gray-500">No rows yet, or Supabase is not configured.</p>
        )}
        {tetrisRows.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Issued (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {tetrisRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-mono font-medium text-gray-900">{row.code}</td>
                    <td className="px-3 py-2 text-gray-700">{row.level ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{row.score ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {row.created_at ? new Date(row.created_at).toISOString().slice(0, 19).replace('T', ' ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promo Codes List */}
      <div className="space-y-4">
        {promoCodes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No promo codes added yet.</p>
            <button
              onClick={() => openModal()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Promo Code
            </button>
          </div>
        ) : (
          promoCodes.map((code) => {
            const now = new Date()
            const isExpired = code.endDate && new Date(code.endDate) < now
            const isNotStarted = code.startDate && new Date(code.startDate) > now
            const isUsageLimitReached = code.usageLimit && code.usageCount >= code.usageLimit
            const isScheduled = code.isScheduled && code.scheduledActivationDate && new Date(code.scheduledActivationDate) > now

            // 게임 코드인지 확인 (SELPIC-GAME-으로 시작)
            const isGameCode = code.code.startsWith('SELPIC-GAME-')

            return (
              <div
                key={code.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  code.isActive && !isExpired && !isNotStarted && !isUsageLimitReached
                    ? isGameCode
                      ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'
                      : 'border-green-200'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`px-3 py-1 rounded-lg ${
                        isGameCode
                          ? 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300'
                          : 'bg-blue-100'
                      }`}>
                        <span className={`font-mono font-bold text-lg ${
                          isGameCode ? 'text-purple-800' : 'text-blue-800'
                        }`}>
                          {code.code}
                        </span>
                      </div>
                      {isGameCode && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 border border-purple-300">
                          🎮 Game Reward
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          code.isActive && !isExpired && !isNotStarted && !isUsageLimitReached
                            ? 'bg-green-100 text-green-800'
                            : isScheduled
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {code.isActive && !isExpired && !isNotStarted && !isUsageLimitReached
                          ? 'Active'
                          : isScheduled
                          ? 'Scheduled'
                          : isExpired
                          ? 'Expired'
                          : isNotStarted
                          ? 'Not Started'
                          : isUsageLimitReached
                          ? 'Limit Reached'
                          : 'Inactive'}
                      </span>
                      {isScheduled && code.scheduledActivationDate && (
                        <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(code.scheduledActivationDate).toLocaleString()}
                        </span>
                      )}
                      {code.discountType === 'percentage' ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          {code.discountValue}% OFF
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${code.discountValue} OFF
                        </span>
                      )}
                    </div>

                    <p className="text-gray-700 mb-3">{code.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Min. Purchase:</span>
                        <span className="ml-2 font-medium">
                          {code.minPurchaseAmount ? `$${code.minPurchaseAmount}` : 'No minimum'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Max. Discount:</span>
                        <span className="ml-2 font-medium">
                          {code.maxDiscountAmount ? `$${code.maxDiscountAmount}` : 'Unlimited'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Usage:</span>
                        <span className="ml-2 font-medium">
                          {code.usageCount} / {code.usageLimit || '∞'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Valid Until:</span>
                        <span className="ml-2 font-medium">
                          {new Date(code.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Applicability Info */}
                    {(code.applicableCategories && code.applicableCategories.length > 0) || 
                     (code.applicableProducts && code.applicableProducts.length > 0) ? (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs font-semibold text-blue-900 mb-2">Applicability:</div>
                        {code.applicableCategories && code.applicableCategories.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-blue-700 font-medium">Categories: </span>
                            <span className="text-xs text-blue-600">
                              {code.applicableCategories.join(', ')}
                            </span>
                          </div>
                        )}
                        {code.applicableProducts && code.applicableProducts.length > 0 && (
                          <div>
                            <span className="text-xs text-blue-700 font-medium">Products: </span>
                            <span className="text-xs text-blue-600">
                              {code.applicableProducts.length} product(s) selected
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-600">Applies to all categories and products</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openModal(code)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => togglePromoCodeActive(code.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        code.isActive
                          ? 'text-gray-600 hover:bg-gray-100'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={code.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {code.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <PromoCodeModal
          code={editingCode}
          products={safeProducts}
          categories={categories}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

function PromoCodeModal({
  code,
  products,
  categories,
  onSave,
  onClose
}: {
  code: PromoCode | null
  products: any[]
  categories: string[]
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    code: code?.code || '',
    description: code?.description || '',
    discountType: code?.discountType || 'percentage',
    discountValue: code?.discountValue || 0,
    minPurchaseAmount: code?.minPurchaseAmount || 0,
    maxDiscountAmount: code?.maxDiscountAmount || 0,
    allowVIPStacking: code?.allowVIPStacking ?? true,
    applicableCategories: code?.applicableCategories || [],
    applicableProducts: code?.applicableProducts || [],
    startDate: code?.startDate ? new Date(code.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: code?.endDate ? new Date(code.endDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: code?.usageLimit || 0,
    userUsageLimit: code?.userUsageLimit || 1,
    isActive: code?.isActive ?? true,
    isScheduled: code?.isScheduled || false,
    scheduledActivationDate: code?.scheduledActivationDate 
      ? new Date(code.scheduledActivationDate).toISOString().slice(0, 16) 
      : ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code || !formData.description || formData.discountValue <= 0) {
      alert('Please fill in all required fields.')
      return
    }
    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      alert('Percentage discount cannot exceed 100%.')
      return
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      alert('End date must be after start date.')
      return
    }

    // 예약 발행 검증
    if (formData.isScheduled && !formData.scheduledActivationDate) {
      alert('Please set a scheduled activation date.')
      return
    }

    if (formData.isScheduled && formData.scheduledActivationDate) {
      const scheduledDate = new Date(formData.scheduledActivationDate)
      const now = new Date()
      if (scheduledDate <= now) {
        alert('Scheduled activation date must be in the future.')
        return
      }
    }

    onSave({
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      minPurchaseAmount: formData.minPurchaseAmount || undefined,
      maxDiscountAmount: formData.maxDiscountAmount || undefined,
      applicableCategories: formData.applicableCategories.length > 0 ? formData.applicableCategories : undefined,
      applicableProducts: formData.applicableProducts.length > 0 ? formData.applicableProducts : undefined,
      usageLimit: formData.usageLimit || undefined,
      userUsageLimit: formData.userUsageLimit || undefined,
      isScheduled: formData.isScheduled || undefined,
      scheduledActivationDate: formData.isScheduled && formData.scheduledActivationDate 
        ? new Date(formData.scheduledActivationDate) 
        : undefined,
      // 예약 발행인 경우 isActive를 false로 설정
      isActive: formData.isScheduled ? false : formData.isActive
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            {code ? 'Edit Promo Code' : 'Add Promo Code'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promo Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="SUMMER2024"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Uppercase letters and numbers only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Summer sale - 20% off on all items"
                required
              />
            </div>
          </div>

          {/* Discount Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Discount Settings</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  {formData.discountType === 'percentage' ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.discountValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </>
                  ) : (
                    <>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discountValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {formData.discountType === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Discount Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxDiscountAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for unlimited"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum discount amount (leave empty for unlimited)</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Purchase Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.minPurchaseAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, minPurchaseAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Leave empty for no minimum"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum purchase amount required (leave empty for no minimum)</p>
            </div>
          </div>

          {/* Applicable Categories & Products */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Applicability</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Applicable Categories (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">Select categories this promo code applies to. Leave empty to apply to all categories.</p>
              <div className="space-y-2">
                {categories.map((category) => (
                  <label key={category} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.applicableCategories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            applicableCategories: [...prev.applicableCategories, category]
                          }))
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            applicableCategories: prev.applicableCategories.filter(c => c !== category)
                          }))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Applicable Products (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">Select specific products this promo code applies to. Leave empty to apply to all products.</p>
              <select
                multiple
                value={formData.applicableProducts}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFormData(prev => ({ ...prev, applicableProducts: selected }))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                size={5}
              >
                {products && products.length > 0 ? (
                  products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (${product.price})
                    </option>
                  ))
                ) : (
                  <option disabled>No products available</option>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple products</p>
            </div>
          </div>

          {/* Validity Period */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Validity Period</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Usage Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Usage Limits</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for unlimited"
                />
                <p className="text-xs text-gray-500 mt-1">Total number of times this code can be used (leave empty for unlimited)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per User Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.userUsageLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, userUsageLimit: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Number of times each user can use this code</p>
              </div>
            </div>
          </div>

          {/* Scheduled Activation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Scheduled Activation</h3>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isScheduled}
                  onChange={(e) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      isScheduled: e.target.checked,
                      // 예약 발행 활성화 시 isActive를 false로 설정
                      isActive: e.target.checked ? false : prev.isActive
                    }))
                  }}
                  className="rounded"
                />
                <span className="text-sm font-medium">Schedule activation for later</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Enable this to automatically activate the promo code at a specific date and time
              </p>
            </div>
            {formData.isScheduled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Activation Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledActivationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledActivationDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={formData.isScheduled}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The promo code will be automatically activated at this date and time
                </p>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => {
                    // 예약 발행이 활성화되어 있으면 체크 해제 불가
                    if (formData.isScheduled && e.target.checked) {
                      alert('Cannot activate scheduled promo code manually. Please disable scheduled activation first.')
                      return
                    }
                    setFormData(prev => ({ ...prev, isActive: e.target.checked }))
                  }}
                  disabled={formData.isScheduled}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
                {formData.isScheduled && (
                  <span className="text-xs text-orange-600 ml-2">(Disabled - Scheduled activation enabled)</span>
                )}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allow VIP Stacking
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowVIPStacking}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowVIPStacking: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Allow this promo code to stack with VIP discounts</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">If unchecked, only the larger discount (VIP or promo) will be applied</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {code ? 'Update' : 'Create'} Promo Code
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

