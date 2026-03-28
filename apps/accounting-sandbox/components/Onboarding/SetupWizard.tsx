'use client'

import { useState, useEffect } from 'react'
import { Building2, CheckCircle, Loader2, ArrowRight, AlertCircle, Link2, Key, TestTube } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface SetupWizardProps {
  onComplete: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1)
  const [accountType, setAccountType] = useState<'individual' | 'company' | 'sole_trader'>('individual')
  const [companyName, setCompanyName] = useState('')
  const [abn, setAbn] = useState('')
  const [acn, setAcn] = useState('')
  const [homepageApiUrl, setHomepageApiUrl] = useState('')
  const [homepageApiKey, setHomepageApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Format ABN (11 digits with spaces: XX XXX XXX XXX)
  const formatABN = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }

  // Format ACN (9 digits with spaces: XXX XXX XXX)
  const formatACN = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 9)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  const handleABNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatABN(e.target.value)
    setAbn(formatted)
  }

  const handleACNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatACN(e.target.value)
    setAcn(formatted)
  }

  const handleNext = () => {
    if (step === 1) {
      if (!companyName.trim()) {
        setError(accountType === 'individual' ? 'Please enter your name' : 'Please enter your company name')
        return
      }
      setError(null)
      // Individual users skip ABN/ACN step
      if (accountType === 'individual') {
        setStep(3) // Skip to API Integration step
      } else {
        setStep(2) // Go to ABN/ACN step
      }
    } else if (step === 2) {
      // Validate ABN before proceeding (only for company/sole_trader)
      if (accountType !== 'individual') {
        if (!abn.trim()) {
          setError('ABN is required')
          return
        }
        const abnDigits = abn.replace(/\D/g, '')
        if (abnDigits.length !== 11) {
          setError('ABN must be 11 digits')
          return
        }
      }
      setError(null)
      setStep(3)
    }
  }

  // Test homepage API connection
  const handleTestConnection = async () => {
    if (!homepageApiUrl.trim()) {
      setError('Please enter homepage API URL')
      return
    }

    setIsTestingConnection(true)
    setError(null)
    setConnectionTestResult(null)

    try {
      // Test connection by sending a simple request to homepage's proxy endpoint
      // The homepage proxy will forward to accounting program's API
      const testUrl = homepageApiUrl.trim().replace(/\/$/, '') // Remove trailing slash
      const testEndpoint = `${testUrl}/api/accounting/orders/import`
      
      console.log('[SetupWizard] Testing connection to homepage API:', testEndpoint)
      console.log('[SetupWizard] This will test if homepage can reach accounting program')

      const testResponse = await fetch(testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(homepageApiKey.trim() && { 'Authorization': `Bearer ${homepageApiKey.trim()}` }),
        },
        body: JSON.stringify({
          orders: [],
          period: {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          }
        }),
      })

      const result = await testResponse.json()

      if (testResponse.ok || testResponse.status === 400) {
        // 400 is OK - it means the endpoint exists (just no valid data)
        setConnectionTestResult({
          success: true,
          message: 'Connection successful! Homepage API is reachable and can communicate with accounting program.'
        })
        console.log('[SetupWizard] ✅ Connection test successful:', result)
      } else if (testResponse.status === 503) {
        // 503 means accounting program is not running
        setConnectionTestResult({
          success: false,
          message: result.details || 'Accounting program is not running. Please start it first.'
        })
        setError('Accounting program must be running for the connection test.')
      } else {
        throw new Error(result.error || result.details || `HTTP ${testResponse.status}: ${testResponse.statusText}`)
      }
    } catch (err: any) {
      console.error('[SetupWizard] ❌ Connection test failed:', err)
      
      let errorMessage = 'Failed to connect to homepage API. '
      if (err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED')) {
        errorMessage += 'Homepage is not running or URL is incorrect.'
      } else if (err.message?.includes('404')) {
        errorMessage += 'API endpoint not found. Please check the URL.'
      } else {
        errorMessage += err.message || 'Please check the URL and try again.'
      }
      
      setConnectionTestResult({
        success: false,
        message: errorMessage
      })
      setError('Connection test failed. Please verify the API URL and key.')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleComplete = async () => {
    // Validate API connection if on step 3
    if (step === 3) {
      if (!homepageApiUrl.trim()) {
        setError('Homepage API URL is required')
        return
      }

      // If connection test hasn't been done or failed, require it
      if (!connectionTestResult || !connectionTestResult.success) {
        setError('Please test the connection first and ensure it succeeds')
        return
      }
    }

    setIsSaving(true)
    setError(null)

    try {
      // Step 1: Save homepage API configuration to localStorage
      if (homepageApiUrl.trim()) {
        localStorage.setItem('homepage_api_url', homepageApiUrl.trim().replace(/\/$/, ''))
        console.log('[SetupWizard] Saved homepage API URL:', homepageApiUrl.trim())
      }
      
      if (homepageApiKey.trim()) {
        localStorage.setItem('homepage_api_key', homepageApiKey.trim())
        console.log('[SetupWizard] Saved homepage API Key')
      }

      // Step 2: Initialize IndexedDB (this will create all stores including incomingOrders)
      console.log('[SetupWizard] Initializing IndexedDB...')
      await indexedDBStorage.init()
      console.log('[SetupWizard] ✅ IndexedDB initialized successfully')

      // Step 3: Save business profile
      const abnDigits = abn.replace(/\D/g, '')
      await indexedDBStorage.saveBusinessProfile({
        companyName: companyName.trim(),
        abn: accountType === 'individual' ? '' : abnDigits, // Individual users don't need ABN
        acn: accountType === 'individual' ? undefined : (acn ? acn.replace(/\D/g, '') : undefined),
        accountType: accountType, // Save account type
        gstReportingCycle: 'Quarterly',
        paygReportingCycle: 'Quarterly',
        isGSTRegistered: accountType !== 'individual', // Individual users don't need GST
        isFBTRegistered: false,
      })
      console.log('[SetupWizard] ✅ Business profile saved')

      // Step 4: Mark setup as complete
      localStorage.setItem('selpic_setup_complete', 'true')
      localStorage.setItem('selpic_company_name', companyName.trim())
      localStorage.setItem('selpic_abn', abnDigits)
      if (acn) {
        localStorage.setItem('selpic_acn', acn.replace(/\D/g, ''))
      }

      // Step 5: Trigger profile update event
      window.dispatchEvent(new CustomEvent('businessProfileUpdated'))

      console.log('[SetupWizard] ✅ Setup complete! Redirecting to main screen...')

      // Step 6: Complete setup and redirect
      onComplete()
    } catch (err: any) {
      console.error('[SetupWizard] ❌ Setup failed:', err)
      setError(err.message || 'Failed to complete setup. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SELPIC A</h1>
          <p className="text-gray-600">Let's set up your company information</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-400'
            }`}>
              {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <div className={`h-1 w-20 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-400'
            }`}>
              {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <div className={`h-1 w-20 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= 3 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-400'
            }`}>
              {step > 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Company Name</span>
            <span>ABN & ACN</span>
            <span>API Integration</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Account Type & Company Name */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Account Type *
              </label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('individual')
                    setError(null)
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    accountType === 'individual'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-gray-900 mb-1">Individual User</div>
                  <div className="text-sm text-gray-600">Personal transactions only. No business tax calculations.</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('company')
                    setError(null)
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    accountType === 'company'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-gray-900 mb-1">Company</div>
                  <div className="text-sm text-gray-600">Business transactions with ABN/ACN. Full tax reporting.</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('sole_trader')
                    setError(null)
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    accountType === 'sole_trader'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-gray-900 mb-1">Sole Trader</div>
                  <div className="text-sm text-gray-600">Mixed personal and business transactions in same account.</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {accountType === 'individual' ? 'Your Name' : 'Company Name'} *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value)
                  setError(null)
                }}
                placeholder={accountType === 'individual' ? 'e.g., John Smith' : 'e.g., SELPIC PTY LTD'}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                {accountType === 'individual' 
                  ? 'This will be displayed on all reports and dashboards.'
                  : 'This will be displayed on all reports and dashboards.'}
              </p>
            </div>

            <button
              onClick={handleNext}
              disabled={!companyName.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: ABN & ACN */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ABN (Australian Business Number) *
              </label>
              <input
                type="text"
                value={abn}
                onChange={handleABNChange}
                placeholder="XX XXX XXX XXX"
                maxLength={14}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                11 digits required. Format: XX XXX XXX XXX
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ACN (Australian Company Number) - Optional
              </label>
              <input
                type="text"
                value={acn}
                onChange={handleACNChange}
                placeholder="XXX XXX XXX"
                maxLength={11}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
              />
              <p className="mt-2 text-sm text-gray-500">
                9 digits. Format: XXX XXX XXX (Optional for non-company entities)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep(1)
                  setError(null)
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!abn.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Homepage API Integration */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Connect to your SELPIC homepage to receive orders automatically. 
                This will enable the Incoming Orders feature.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Link2 className="w-4 h-4 inline mr-1" />
                Homepage API URL *
              </label>
              <input
                type="url"
                value={homepageApiUrl}
                onChange={(e) => {
                  setHomepageApiUrl(e.target.value)
                  setError(null)
                  setConnectionTestResult(null)
                }}
                placeholder="https://your-homepage.com or http://localhost:3000"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the base URL of your SELPIC homepage (e.g., http://localhost:3000)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                API Key (Optional)
              </label>
              <input
                type="password"
                value={homepageApiKey}
                onChange={(e) => {
                  setHomepageApiKey(e.target.value)
                  setError(null)
                  setConnectionTestResult(null)
                }}
                placeholder="Enter API key if required"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
              />
              <p className="mt-2 text-sm text-gray-500">
                If your homepage API requires authentication, enter the API key here.
              </p>
            </div>

            {/* Connection Test */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection || !homepageApiUrl.trim()}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="w-5 h-5" />
                    Test Connection
                  </>
                )}
              </button>

              {connectionTestResult && (
                <div className={`mt-4 p-4 rounded-md flex items-start gap-2 ${
                  connectionTestResult.success
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {connectionTestResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm font-medium">{connectionTestResult.message}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep(2)
                  setError(null)
                  setConnectionTestResult(null)
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={isSaving || !homepageApiUrl.trim() || !connectionTestResult?.success}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Completing Setup...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            This information will be used across all reports and dashboards. You can update it later in Settings.
          </p>
        </div>
      </div>
    </div>
  )
}
