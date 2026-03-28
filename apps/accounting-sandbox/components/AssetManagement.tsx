'use client'

import { useState, useEffect } from 'react'
import { Building2, DollarSign, Calendar, Trash2, Edit2, Save, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface Asset {
  id: string
  name: string
  purchaseDate: string
  purchaseAmount: number
  category: string
  depreciationMethod: 'straight-line' | 'diminishing-value'
  usefulLife: number // years
  depreciationRate?: number // percentage
  accumulatedDepreciation: number
  currentValue: number
  transactionId?: string
  createdAt: string
  updatedAt: string
}

interface AssetManagementProps {
  transactions: Array<{
    id?: string
    date: string
    description: string
    debit: number | null
    category?: string
    department?: string
  }>
  onAssetRegistered?: (assetId: string, transactionId: string) => void
}

export function AssetManagement({ transactions, onAssetRegistered }: AssetManagementProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
  const [dismissedTransactions, setDismissedTransactions] = useState<Set<string>>(new Set())
  const [hasCheckedOnce, setHasCheckedOnce] = useState(() => {
    // Load hasCheckedOnce from localStorage to persist across remounts
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('asset_has_checked_once')
      return saved === 'true'
    }
    return false
  })
  const [formData, setFormData] = useState({
    name: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseAmount: 0,
    category: 'Office Equipment',
    depreciationMethod: 'straight-line' as 'straight-line' | 'diminishing-value',
    usefulLife: 5,
  })

  // Load assets from IndexedDB
  useEffect(() => {
    loadAssets()
    // Load dismissed transactions from localStorage
    if (typeof window !== 'undefined') {
      const savedDismissed = localStorage.getItem('asset_dismissed_transactions')
      if (savedDismissed) {
        try {
          const dismissed = JSON.parse(savedDismissed)
          setDismissedTransactions(new Set(dismissed))
        } catch (err) {
          console.warn('Failed to load dismissed transactions:', err)
        }
      }
      
      // Load hasCheckedOnce from localStorage to persist across remounts
      const savedChecked = localStorage.getItem('asset_has_checked_once')
      if (savedChecked === 'true') {
        setHasCheckedOnce(true)
      }
    }
  }, [])

  const loadAssets = async () => {
    try {
      const loadedAssets = await indexedDBStorage.getAllAssets()
      setAssets(loadedAssets || [])
    } catch (err) {
      console.error('Failed to load assets:', err)
    }
  }

  // Save dismissed transactions to localStorage
  const saveDismissedTransactions = (dismissed: Set<string>) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('asset_dismissed_transactions', JSON.stringify(Array.from(dismissed)))
    }
  }

  // Check for transactions over $300 that aren't registered as assets
  // Only check once per session and respect user dismissals
  useEffect(() => {
    // Skip if already checked in this session
    if (hasCheckedOnce) return
    
    const checkForUnregisteredAssets = async () => {
      const unregisteredTransactions = transactions.filter(tx => {
        const txId = tx.id || `${tx.date}_${tx.description}`
        const amount = Math.abs(tx.debit || 0)
        return amount >= 300 && 
               tx.category?.startsWith('EXPENSE_') &&
               tx.department !== 'personal' &&
               !assets.some(a => a.transactionId === tx.id) &&
               !dismissedTransactions.has(txId)
      })

      if (unregisteredTransactions.length > 0 && !showAssetForm) {
        // Mark as checked to prevent repeated prompts (save to localStorage)
        setHasCheckedOnce(true)
        if (typeof window !== 'undefined') {
          localStorage.setItem('asset_has_checked_once', 'true')
        }
        
        // Show prompt for first unregistered transaction
        const tx = unregisteredTransactions[0]
        const txId = tx.id || `${tx.date}_${tx.description}`
        
        const userChoice = confirm(
          `Transaction "${tx.description}" (${formatCurrency(Math.abs(tx.debit || 0))}) is over $300.\n\n` +
          `Would you like to register this as a Fixed Asset for depreciation tracking?`
        )
        
        if (userChoice) {
          setSelectedTransaction(tx.id || '')
          setFormData({
            name: tx.description,
            purchaseDate: tx.date,
            purchaseAmount: Math.abs(tx.debit || 0),
            category: 'Office Equipment',
            depreciationMethod: 'straight-line',
            usefulLife: 5,
          })
          setShowAssetForm(true)
        } else {
          // User dismissed - save to dismissed list
          const newDismissed = new Set(dismissedTransactions)
          newDismissed.add(txId)
          setDismissedTransactions(newDismissed)
          saveDismissedTransactions(newDismissed)
        }
      }
    }

    // Only check when transactions and assets are loaded, and not already checked
    if (transactions.length > 0 && assets.length >= 0 && !hasCheckedOnce) {
      checkForUnregisteredAssets()
    }
  }, [transactions, assets, showAssetForm, dismissedTransactions, hasCheckedOnce])

  const calculateDepreciation = (asset: Asset): number => {
    const purchaseDate = new Date(asset.purchaseDate)
    const now = new Date()
    const yearsElapsed = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

    if (asset.depreciationMethod === 'straight-line') {
      const annualDepreciation = asset.purchaseAmount / asset.usefulLife
      return Math.min(annualDepreciation * yearsElapsed, asset.purchaseAmount)
    } else {
      // Diminishing value method
      const rate = asset.depreciationRate || 20 // Default 20% per year
      let currentValue = asset.purchaseAmount
      let totalDepreciation = 0
      
      for (let year = 0; year < Math.floor(yearsElapsed); year++) {
        const yearDepreciation = currentValue * (rate / 100)
        totalDepreciation += yearDepreciation
        currentValue -= yearDepreciation
      }
      
      // Partial year
      if (yearsElapsed % 1 > 0) {
        const partialDepreciation = currentValue * (rate / 100) * (yearsElapsed % 1)
        totalDepreciation += partialDepreciation
      }
      
      return Math.min(totalDepreciation, asset.purchaseAmount)
    }
  }

  const handleSaveAsset = async () => {
    try {
      const asset: Asset = {
        id: editingAsset?.id || `asset_${Date.now()}`,
        name: formData.name,
        purchaseDate: formData.purchaseDate,
        purchaseAmount: formData.purchaseAmount,
        category: formData.category,
        depreciationMethod: formData.depreciationMethod,
        usefulLife: formData.usefulLife,
        depreciationRate: formData.depreciationMethod === 'diminishing-value' ? 20 : undefined,
        accumulatedDepreciation: editingAsset?.accumulatedDepreciation || 0,
        currentValue: formData.purchaseAmount - (editingAsset?.accumulatedDepreciation || 0),
        transactionId: selectedTransaction || undefined,
        createdAt: editingAsset?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await indexedDBStorage.saveAsset(asset)
      await loadAssets()
      
      if (selectedTransaction && onAssetRegistered) {
        onAssetRegistered(asset.id, selectedTransaction)
      }

      // Reset form
      setShowAssetForm(false)
      setEditingAsset(null)
      setSelectedTransaction(null)
      setFormData({
        name: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseAmount: 0,
        category: 'Office Equipment',
        depreciationMethod: 'straight-line',
        usefulLife: 5,
      })
    } catch (err) {
      console.error('Failed to save asset:', err)
      alert('Failed to save asset. Please try again.')
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      try {
        await indexedDBStorage.deleteAsset(id)
        await loadAssets()
      } catch (err) {
        console.error('Failed to delete asset:', err)
        alert('Failed to delete asset. Please try again.')
      }
    }
  }

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset)
    setFormData({
      name: asset.name,
      purchaseDate: asset.purchaseDate,
      purchaseAmount: asset.purchaseAmount,
      category: asset.category,
      depreciationMethod: asset.depreciationMethod,
      usefulLife: asset.usefulLife,
    })
    setShowAssetForm(true)
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Fixed Assets Management</h3>
        </div>
        <button
          onClick={() => {
            setEditingAsset(null)
            setSelectedTransaction(null)
            setFormData({
              name: '',
              purchaseDate: new Date().toISOString().split('T')[0],
              purchaseAmount: 0,
              category: 'Office Equipment',
              depreciationMethod: 'straight-line',
              usefulLife: 5,
            })
            setShowAssetForm(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          Add Asset
        </button>
      </div>

      {/* Asset Form Modal */}
      {showAssetForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">
              {editingAsset ? 'Edit Asset' : 'Register New Asset'}
            </h4>
            <button
              onClick={() => {
                setShowAssetForm(false)
                setEditingAsset(null)
                setSelectedTransaction(null)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Laptop, Office Desk"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.purchaseAmount}
                onChange={(e) => setFormData({ ...formData, purchaseAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="Office Equipment">Office Equipment</option>
                <option value="Computer Equipment">Computer Equipment</option>
                <option value="Furniture">Furniture</option>
                <option value="Motor Vehicle">Motor Vehicle</option>
                <option value="Machinery">Machinery</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Depreciation Method *
              </label>
              <select
                value={formData.depreciationMethod}
                onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value as 'straight-line' | 'diminishing-value' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="straight-line">Straight-Line</option>
                <option value="diminishing-value">Diminishing Value</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Useful Life (Years) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.usefulLife}
                onChange={(e) => setFormData({ ...formData, usefulLife: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSaveAsset}
              disabled={!formData.name || formData.purchaseAmount <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingAsset ? 'Update Asset' : 'Register Asset'}
            </button>
            <button
              onClick={() => {
                setShowAssetForm(false)
                setEditingAsset(null)
                setSelectedTransaction(null)
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assets List */}
      {assets.length > 0 ? (
        <div className="space-y-4">
          {assets.map((asset) => {
            const currentDepreciation = calculateDepreciation(asset)
            const currentValue = asset.purchaseAmount - currentDepreciation

            return (
              <div key={asset.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{asset.name}</h4>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                        {asset.category}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Purchase Amount</p>
                        <p className="font-semibold">{formatCurrency(asset.purchaseAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Accumulated Depreciation</p>
                        <p className="font-semibold text-orange-600">{formatCurrency(currentDepreciation)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Current Value</p>
                        <p className="font-semibold text-green-600">{formatCurrency(currentValue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Purchase Date</p>
                        <p className="font-semibold">{formatDateAustralian(asset.purchaseDate)}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Method: {asset.depreciationMethod === 'straight-line' ? 'Straight-Line' : 'Diminishing Value'} | 
                      Useful Life: {asset.usefulLife} years
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditAsset(asset)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit asset"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No fixed assets registered yet.</p>
          <p className="text-sm mt-1">Assets over $300 will prompt for registration.</p>
        </div>
      )}
    </div>
  )
}
