'use client'

import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { PAYGConfigManager } from '@/lib/payg-withholding/config'
import { PAYGConfig } from '@/lib/payg-withholding/types'

export function PAYGConfigForm() {
  const [config, setConfig] = useState<PAYGConfig>(PAYGConfigManager.getDefaultConfig())
  const [registrationDate, setRegistrationDate] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  // Load config on mount
  useEffect(() => {
    const loadedConfig = PAYGConfigManager.loadConfig()
    setConfig(loadedConfig)
    if (loadedConfig.registrationDate) {
      setRegistrationDate(loadedConfig.registrationDate)
    }
    if (loadedConfig.registrationNumber) {
      setRegistrationNumber(loadedConfig.registrationNumber)
    }
  }, [])

  /**
   * Enable PAYG
   */
  const handleEnable = () => {
    if (!registrationDate) {
      alert('Please enter PAYG registration date')
      return
    }

    PAYGConfigManager.enablePAYG(registrationDate, registrationNumber || undefined)
    const updatedConfig = PAYGConfigManager.loadConfig()
    setConfig(updatedConfig)
    setIsSaved(true)
    
    // Clear saved state after 3 seconds
    setTimeout(() => setIsSaved(false), 3000)
  }

  /**
   * Disable PAYG
   */
  const handleDisable = () => {
    if (!confirm('Are you sure you want to disable PAYG? This will disable all PAYG-related features.')) {
      return
    }

    PAYGConfigManager.disablePAYG()
    const updatedConfig = PAYGConfigManager.loadConfig()
    setConfig(updatedConfig)
    setRegistrationDate('')
    setRegistrationNumber('')
    setIsSaved(true)
    
    // Clear saved state after 3 seconds
    setTimeout(() => setIsSaved(false), 3000)
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <DollarSign className="w-6 h-6" />
        PAYG Withholding Settings
      </h2>

      <div className="space-y-4">
        {/* PAYG Status */}
        <div className={`p-4 rounded-md border-2 ${
          config.isEnabled
            ? 'bg-green-50 border-green-300'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {config.isEnabled ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">PAYG Enabled</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">PAYG Not Registered</span>
              </>
            )}
          </div>
          
          {config.isEnabled ? (
            <div className="text-sm text-green-700 space-y-1">
              {config.registrationDate && (
                <p>Registration Date: {config.registrationDate}</p>
              )}
              {config.registrationNumber && (
                <p>Registration Number: {config.registrationNumber}</p>
              )}
              <p className="mt-2 font-medium">✅ All PAYG features are active</p>
            </div>
          ) : (
            <div className="text-sm text-yellow-700 space-y-1">
              <p>PAYG is currently disabled. Focus on Director's Loan management.</p>
              <p className="mt-2 font-medium">⚠️ No ABN Withholding warnings will still be shown (legal requirement)</p>
            </div>
          )}
        </div>

        {/* Registration Form (only show if disabled) */}
        {!config.isEnabled && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="font-semibold text-gray-800">Enable PAYG Withholding</h3>
            
            <div>
              <label htmlFor="payg-date" className="block text-sm font-medium text-gray-700 mb-2">
                PAYG Registration Date <span className="text-red-500">*</span>
              </label>
              <input
                id="payg-date"
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the date when PAYG was registered with ATO
              </p>
            </div>

            <div>
              <label htmlFor="payg-number" className="block text-sm font-medium text-gray-700 mb-2">
                PAYG Registration Number (Optional)
              </label>
              <input
                id="payg-number"
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g., PAYG123456"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional: Your PAYG registration number from ATO
              </p>
            </div>

            <button
              onClick={handleEnable}
              disabled={!registrationDate}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Enable PAYG
            </button>
          </div>
        )}

        {/* Disable Button (only show if enabled) */}
        {config.isEnabled && (
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <button
              onClick={handleDisable}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Disable PAYG
            </button>
            <p className="mt-2 text-xs text-gray-500 text-center">
              This will disable all PAYG-related features. No ABN warnings will still be shown.
            </p>
          </div>
        )}

        {/* Save Status */}
        {isSaved && (
          <div className="p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>Settings saved successfully</span>
          </div>
        )}

        {/* Important Notes */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-semibold text-blue-800 mb-2">Important Notes:</h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>PAYG registration is required for businesses that pay salaries or director fees</li>
            <li>No ABN Withholding (47%) warnings will always be shown regardless of PAYG status</li>
            <li>When PAYG is disabled, focus on Director's Loan management</li>
            <li>You can enable PAYG at any time - no restart required</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

