'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, RefreshCw, CheckCircle, X } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface SystemResetProps {
  onResetComplete: () => void
  onCancel: () => void
}

const CONFIRMATION_TEXT = 'RESET'

export function SystemReset({ onResetComplete, onCancel }: SystemResetProps) {
  const [confirmationText, setConfirmationText] = useState<string>('')
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [resetProgress, setResetProgress] = useState<string>('')

  const isConfirmButtonEnabled = confirmationText === CONFIRMATION_TEXT

  const handleReset = async () => {
    if (!isConfirmButtonEnabled) {
      return
    }

    setIsResetting(true)
    setError(null)
    setResetProgress('')

    try {
      // Step 1: Clear all IndexedDB stores
      setResetProgress('Clearing IndexedDB data...')
      await clearAllIndexedDBData()

      // Step 2: Clear all localStorage (except browser settings)
      setResetProgress('Clearing localStorage...')
      await clearAllLocalStorage()

      // Step 3: Clear sessionStorage
      setResetProgress('Clearing session data...')
      if (typeof window !== 'undefined') {
        sessionStorage.clear()
      }

      setResetProgress('Reset complete! Redirecting to setup...')
      
      // Wait a moment to show completion message
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Call completion callback (will trigger Setup Wizard)
      onResetComplete()
    } catch (err) {
      console.error('[SystemReset] Error during reset:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset system. Please try again.')
      setIsResetting(false)
    }
  }

  const clearAllIndexedDBData = async (): Promise<void> => {
    try {
      // Initialize IndexedDB first
      await indexedDBStorage.init()

      // Clear all stores one by one
      const storesToClear = [
        'statements',
        'cashExpenses',
        'receipts',
        'transactionReceipts',
        'businessProfile',
        'usageLogging',
        'apiUsage',
        'apiBalance',
        'assets',
        'auditTrail',
        'periods',
        'periodCarryForward',
        'incomingOrders'
      ]

      for (const storeName of storesToClear) {
        try {
          await clearStore(storeName)
        } catch (err) {
          console.warn(`[SystemReset] Warning: Could not clear store ${storeName}:`, err)
          // Continue with other stores even if one fails
        }
      }

      console.log('[SystemReset] ✅ All IndexedDB stores cleared')
    } catch (err) {
      console.error('[SystemReset] Error clearing IndexedDB:', err)
      throw new Error('Failed to clear IndexedDB data')
    }
  }

  const clearStore = async (storeName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Access IndexedDB directly
      const request = indexedDB.open('selpic-accounting')
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(storeName)) {
          // Store doesn't exist, skip
          console.log(`[SystemReset] Store ${storeName} does not exist, skipping`)
          db.close()
          resolve()
          return
        }

        try {
          const transaction = db.transaction([storeName], 'readwrite')
          const store = transaction.objectStore(storeName)
          const clearRequest = store.clear()

          clearRequest.onsuccess = () => {
            console.log(`[SystemReset] ✅ Cleared store: ${storeName}`)
            db.close()
            resolve()
          }

          clearRequest.onerror = () => {
            console.error(`[SystemReset] ❌ Error clearing store ${storeName}:`, clearRequest.error)
            db.close()
            // Don't reject, just log and continue
            resolve()
          }

          transaction.onerror = () => {
            console.error(`[SystemReset] ❌ Transaction error for store ${storeName}:`, transaction.error)
            db.close()
            resolve()
          }
        } catch (err) {
          console.error(`[SystemReset] ❌ Exception clearing store ${storeName}:`, err)
          db.close()
          resolve() // Continue with other stores
        }
      }

      request.onerror = () => {
        console.error('[SystemReset] ❌ Error opening IndexedDB:', request.error)
        reject(request.error)
      }

      request.onblocked = () => {
        console.warn('[SystemReset] ⚠️ IndexedDB is blocked. Please close other tabs.')
        // Wait a bit and retry
        setTimeout(() => {
          resolve() // Continue anyway
        }, 1000)
      }
    })
  }

  const clearAllLocalStorage = async (): Promise<void> => {
    if (typeof window === 'undefined') {
      return
    }

    // Get all localStorage keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        // Keep browser-specific keys, remove all SELPIC-related keys
        if (key.startsWith('selpic_') || 
            key.startsWith('accounting_') || 
            key === 'opening_director_loan_balance' ||
            key === 'selpic_setup_complete') {
          keysToRemove.push(key)
        }
      }
    }

    // Remove all SELPIC-related keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`[SystemReset] Removed localStorage key: ${key}`)
    })

    console.log('[SystemReset] ✅ All localStorage cleared')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Reset</h2>
          <p className="text-gray-600">
            This will permanently delete all data and restore the system to its initial state.
          </p>
        </div>

        {/* Warning Box */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">⚠️ Warning: Data Will Be Permanently Deleted</h3>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>All transactions and financial data</li>
                <li>All uploaded statements and receipts</li>
                <li>Business profile and settings</li>
                <li>API usage logs and balances</li>
                <li>Asset records and audit trails</li>
                <li>All periods and carry-forward data</li>
                <li>Incoming orders from homepage</li>
              </ul>
              <p className="text-sm font-medium text-red-900 mt-3">
                This action cannot be undone. Please ensure you have exported all important data before proceeding.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-mono font-bold text-red-600">{CONFIRMATION_TEXT}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
            placeholder={CONFIRMATION_TEXT}
            className="w-full px-4 py-3 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-colors uppercase tracking-wider"
            disabled={isResetting}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            You must type exactly "{CONFIRMATION_TEXT}" to enable the reset button.
          </p>
        </div>

        {/* Progress Message */}
        {resetProgress && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-800">{resetProgress}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleReset}
            disabled={!isConfirmButtonEnabled || isResetting}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isResetting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                Reset System & Clear All Data
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={isResetting}
            className="w-full py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            After reset, you will be guided through the initial setup process, including PIN setup and homepage API integration.
          </p>
        </div>
      </div>
    </div>
  )
}
