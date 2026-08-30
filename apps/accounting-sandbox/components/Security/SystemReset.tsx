'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, RefreshCw, X } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { clearBrowserLedgerCaches } from '@/lib/storage/backup-preferences'
import { clearSSOToken } from '@/lib/sso-handler'

interface SystemResetProps {
  onResetComplete: () => void
  onCancel: () => void
}

const CONFIRMATION_TEXT = 'RESET'

/** Extra keys beyond clearBrowserLedgerCaches / selpic_* prefix. */
const FACTORY_LOCAL_KEYS = [
  'director_name',
  'openai_api_key',
  'user_openai_api_key',
  'homepage_api_url',
  'homepage_api_key',
  'employee_session',
  'selpic_a_pin',
  'selpic_a_attempts',
  'selpic_a_lockout_until',
  'selpic_setup_complete',
  'selpic_company_name',
  'selpic_abn',
  'selpic_acn',
  'selpic_payg_config',
  'payg_config',
  'selpic_user_mappings',
  'user_mappings',
  'selpic_sso_token',
] as const

export function SystemReset({ onResetComplete, onCancel }: SystemResetProps) {
  const [confirmationText, setConfirmationText] = useState<string>('')
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [resetProgress, setResetProgress] = useState<string>('')

  const isConfirmButtonEnabled = confirmationText === CONFIRMATION_TEXT

  const handleReset = async () => {
    if (!isConfirmButtonEnabled) return

    setIsResetting(true)
    setError(null)
    setResetProgress('')

    try {
      setResetProgress('Clearing IndexedDB data...')
      await indexedDBStorage.init()
      await indexedDBStorage.factoryResetAllData()

      setResetProgress('Clearing localStorage...')
      clearFactoryLocalStorage()

      setResetProgress('Clearing session data...')
      if (typeof window !== 'undefined') {
        sessionStorage.clear()
      }

      setResetProgress('Reset complete! Redirecting to setup...')
      await new Promise((resolve) => setTimeout(resolve, 800))
      onResetComplete()
    } catch (err) {
      console.error('[SystemReset] Error during reset:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset system. Please try again.')
      setIsResetting(false)
    }
  }

  function clearFactoryLocalStorage() {
    if (typeof window === 'undefined') return

    clearBrowserLedgerCaches()
    clearSSOToken()

    for (const key of FACTORY_LOCAL_KEYS) {
      localStorage.removeItem(key)
    }

    const extra: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (
        key.startsWith('selpic_') ||
        key.startsWith('accounting_') ||
        key.startsWith('journey_') ||
        key.startsWith('ato_') ||
        key.startsWith('individual_tax_')
      ) {
        extra.push(key)
      }
    }
    extra.forEach((key) => localStorage.removeItem(key))
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
            Permanently deletes all ledger and setup data and returns to the first-time Setup Wizard.
          </p>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Warning: data will be permanently deleted</h3>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>Statements, cash, periods, bank recon, journals</li>
                <li>HR / payroll (employees, payslips, timesheets)</li>
                <li>Business profile, PIN, and API usage logs</li>
                <li>Lodgment worksheets and local settings caches</li>
              </ul>
              <p className="text-sm font-medium text-red-900 mt-3">
                Export a JSON backup from Settings → Data Management first. This cannot be undone.
              </p>
            </div>
          </div>
        </div>

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
        </div>

        {resetProgress && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-800">{resetProgress}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void handleReset()}
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
            type="button"
            onClick={onCancel}
            disabled={isResetting}
            className="w-full py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
