'use client'

import { useState, useRef } from 'react'
import { X, Upload, Calendar, DollarSign, Building2, Tag, Receipt, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { strings } from '@/lib/i18n/strings'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { formatCurrency } from '@/lib/utils/currency-format'

interface CashExpenseFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (expense: {
    date: string
    amount: number
    merchant: string
    category: string
    receiptImageId?: string
    department?: string
    description?: string
    source: 'manual'
  }) => Promise<void>
  apiKey: string
  categories: string[]
  getCategoryLabel: (category: string) => string
}

export function CashExpenseForm({
  isOpen,
  onClose,
  onSave,
  apiKey,
  categories,
  getCategoryLabel,
}: CashExpenseFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState('CASH_EXPENSE_PETTY')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionSuccess, setExtractionSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB')
      return
    }

    setReceiptFile(file)
    setError(null)
    setExtractionSuccess(false)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setReceiptPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Auto-extract if API key is available
    if (apiKey && apiKey.trim()) {
      await extractReceiptData(file)
    }
  }

  const extractReceiptData = async (file: File) => {
    // 🔧 CRITICAL: Single attempt only - NO RETRIES
    setIsExtracting(true)
    setError(null)
    setExtractionSuccess(false)

    try {
      // 🔧 MOCK TEST: Convert file to Base64 and log the process
      console.log('[CashExpenseForm] 🔍 MOCK TEST: Starting Base64 conversion...')
      console.log('[CashExpenseForm] Original file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      })
      
      // Create FileReader to convert to Base64 for logging
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const base64 = (e.target?.result as string) || ''
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      const base64DataUrl = await base64Promise
      const base64Data = base64DataUrl.split(',')[1] // Remove data:image/...;base64, prefix
      const mimeType = file.type || 'image/jpeg'
      
      // 🔧 MOCK TEST: Log Base64 conversion result
      console.log('[CashExpenseForm] ✅ Base64 conversion complete:', {
        base64Length: base64Data.length,
        base64SizeKB: Math.round(base64Data.length / 1024),
        mimeType,
        dataUrlLength: base64DataUrl.length,
        first50Chars: base64Data.substring(0, 50),
        last50Chars: base64Data.substring(base64Data.length - 50),
        isValidBase64: /^[A-Za-z0-9+/=]+$/.test(base64Data.substring(0, 100))
      })
      
      const formData = new FormData()
      formData.append('image', file)
      formData.append('apiKey', apiKey)

      // 🔧 CRITICAL: Log request to prevent duplicate calls
      console.log('[CashExpenseForm] 📤 Single receipt extraction request (NO RETRIES):', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        formDataHasImage: formData.has('image'),
        formDataHasApiKey: formData.has('apiKey'),
        timestamp: new Date().toISOString()
      })

      // 🔧 CRITICAL: Single fetch call - NO automatic retries
      // 🔧 CRITICAL: Wait for response - NO timeout, NO retry
      const response = await fetch('/api/extract-receipt', {
        method: 'POST',
        body: formData,
      })
      
      console.log('[CashExpenseForm] 📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[CashExpenseForm] ❌ Error response:', errorData)
        
        // 🔧 CRITICAL: Show OpenAI's original error message
        const errorMessage = errorData.details || errorData.error || 'Failed to extract receipt data'
        const originalError = errorData.originalError
        
        // 🔧 CRITICAL: Include full error details in error message
        let fullErrorMessage = errorMessage
        if (originalError) {
          fullErrorMessage += `\n\nOpenAI Error Details:\n${JSON.stringify(originalError, null, 2)}`
        }
        
        throw new Error(fullErrorMessage)
      }

      const result = await response.json()
      const extractedData = result.data

      // Fill form fields with extracted data
      if (extractedData.date) {
        setDate(extractedData.date)
      }
      if (extractedData.amount) {
        setAmount(extractedData.amount.toString())
      }
      if (extractedData.merchant) {
        setMerchant(extractedData.merchant)
      }

      setExtractionSuccess(true)
      console.log('[CashExpenseForm] Receipt data extracted:', extractedData)
    } catch (err: any) {
      // 🔧 CRITICAL: Log error and stop - NO RETRY
      console.error('[CashExpenseForm] ❌ Receipt extraction failed (NO RETRY):', err)
      console.error('[CashExpenseForm] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        fullError: err
      })
      
      // 🔧 CRITICAL: Show OpenAI's original error message in full
      // The error message already contains the full OpenAI error details from the API
      setError(err.message || 'Failed to extract receipt data. Please try again manually or enter the information yourself.')
      // 🔧 CRITICAL: Do NOT retry - user can manually enter data or try again
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!amount || !merchant || !category) {
      setError('Please fill in all required fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      let receiptImageId: string | undefined

      // Save receipt image if provided
      if (receiptFile && receiptPreview) {
        // Convert base64 to blob for storage
        const base64Data = receiptPreview.split(',')[1]
        receiptImageId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Store receipt in IndexedDB (will be handled in parent component)
        // For now, we'll pass the base64 data
      }

      await onSave({
        date,
        amount: amountNum,
        merchant,
        category,
        receiptImageId,
        department: 'cleaning', // Default to Company
        description: merchant,
        source: 'manual',
      })

      // Reset form
      setDate(new Date().toISOString().split('T')[0])
      setAmount('')
      setMerchant('')
      setCategory('CASH_EXPENSE_PETTY')
      setReceiptFile(null)
      setReceiptPreview(null)
      setExtractionSuccess(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onClose()
    } catch (err: any) {
      console.error('[CashExpenseForm] Error saving expense:', err)
      setError(err.message || 'Failed to save cash expense')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add Cash & Petty Cash Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {extractionSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-800 font-medium">영수증 정보를 읽어왔습니다</p>
                <p className="text-xs text-green-700 mt-1">Receipt information has been extracted successfully</p>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Merchant (상호명) *
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Enter merchant name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-2" />
              Category (용도) *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Receipt className="w-4 h-4 inline mr-2" />
              Receipt Upload (영수증 첨부)
            </label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {receiptFile ? receiptFile.name : 'Click to upload receipt image (JPG, PNG)'}
                </span>
              </label>
              {isExtracting && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting receipt data...</span>
                </div>
              )}
              {receiptPreview && (
                <div className="mt-2">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-w-full h-auto max-h-48 rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !amount || !merchant || !category}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
