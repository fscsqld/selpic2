'use client'

import { useState, useEffect, useMemo } from 'react'
import { Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface BusinessProfile {
  // Individual User fields
  individualName?: string
  
  // Company/Sole Trader fields
  companyName: string
  abn: string
  acn?: string
  gstReportingCycle: 'Monthly' | 'Quarterly'
  paygReportingCycle: 'Monthly' | 'Quarterly'
  gstRegistered?: boolean
  fbtRegistered?: boolean
  
  // Current account type
  accountType?: 'individual' | 'company' | 'sole_trader'
}

export function BusinessProfileForm() {
  const [profile, setProfile] = useState<BusinessProfile>({
    companyName: '',
    abn: '',
    acn: '',
    gstReportingCycle: 'Quarterly',
    paygReportingCycle: 'Quarterly',
    gstRegistered: false,
    fbtRegistered: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Store previous values for each account type
  const [savedProfiles, setSavedProfiles] = useState<{
    individual?: BusinessProfile
    company?: BusinessProfile
    sole_trader?: BusinessProfile
  }>({})

  // Load business profile on mount
  useEffect(() => {
    loadProfile()
  }, [])
  
  // Handle account type change - restore saved values for that type
  const handleAccountTypeChange = (newType: 'individual' | 'company' | 'sole_trader') => {
    // Save current profile values before switching
    const currentType = profile.accountType || 'individual'
    setSavedProfiles(prev => ({
      ...prev,
      [currentType]: { ...profile },
    }))
    
    // Restore saved values for the new type, or use defaults
    const savedForNewType = savedProfiles[newType]
    if (savedForNewType) {
      setProfile({ ...savedForNewType, accountType: newType })
    } else {
      // Use defaults for new type
      if (newType === 'individual') {
        setProfile({
          individualName: savedProfiles.individual?.individualName || '',
          accountType: 'individual',
        })
      } else if (newType === 'company') {
        setProfile({
          companyName: savedProfiles.company?.companyName || '',
          abn: savedProfiles.company?.abn || '',
          acn: savedProfiles.company?.acn || '',
          gstReportingCycle: savedProfiles.company?.gstReportingCycle || 'Quarterly',
          paygReportingCycle: savedProfiles.company?.paygReportingCycle || 'Quarterly',
          gstRegistered: savedProfiles.company?.gstRegistered || false,
          fbtRegistered: savedProfiles.company?.fbtRegistered || false,
          accountType: 'company',
        })
      } else {
        setProfile({
          companyName: savedProfiles.sole_trader?.companyName || '',
          abn: savedProfiles.sole_trader?.abn || '',
          acn: savedProfiles.sole_trader?.acn || '',
          gstReportingCycle: savedProfiles.sole_trader?.gstReportingCycle || 'Quarterly',
          paygReportingCycle: savedProfiles.sole_trader?.paygReportingCycle || 'Quarterly',
          gstRegistered: savedProfiles.sole_trader?.gstRegistered || false,
          fbtRegistered: savedProfiles.sole_trader?.fbtRegistered || false,
          accountType: 'sole_trader',
        })
      }
    }
  }

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const savedProfile = await indexedDBStorage.getBusinessProfile()
      if (savedProfile) {
        // Restore saved profiles for each account type
        const currentAccountType = savedProfile.accountType || 'individual'
        
        // Load saved values for each type from the profile
        const individualProfile: BusinessProfile = {
          individualName: savedProfile.individualName || '',
          accountType: 'individual',
        }
        
        const companyProfile: BusinessProfile = {
          companyName: savedProfile.companyName || '',
          abn: savedProfile.abn || '',
          acn: savedProfile.acn || '',
          gstReportingCycle: savedProfile.gstReportingCycle || 'Quarterly',
          paygReportingCycle: savedProfile.paygReportingCycle || 'Quarterly',
          gstRegistered: savedProfile.gstRegistered || false,
          fbtRegistered: savedProfile.fbtRegistered || false,
          accountType: 'company',
        }
        
        const soleTraderProfile: BusinessProfile = {
          companyName: savedProfile.companyName || '',
          abn: savedProfile.abn || '',
          acn: savedProfile.acn || '',
          gstReportingCycle: savedProfile.gstReportingCycle || 'Quarterly',
          paygReportingCycle: savedProfile.paygReportingCycle || 'Quarterly',
          gstRegistered: savedProfile.gstRegistered || false,
          fbtRegistered: savedProfile.fbtRegistered || false,
          accountType: 'sole_trader',
        }
        
        setSavedProfiles({
          individual: individualProfile,
          company: companyProfile,
          sole_trader: soleTraderProfile,
        })
        
        // Set current profile based on account type
        if (currentAccountType === 'individual') {
          setProfile(individualProfile)
        } else if (currentAccountType === 'company') {
          setProfile(companyProfile)
        } else {
          setProfile(soleTraderProfile)
        }
      } else {
        // Set default profile for new users (individual by default)
        const defaultProfile: BusinessProfile = {
          individualName: '',
          companyName: '',
          abn: '',
          acn: '',
          accountType: 'individual' as const,
          gstReportingCycle: 'Quarterly' as const,
          paygReportingCycle: 'Quarterly' as const,
          gstRegistered: false,
          fbtRegistered: false,
        }
        setProfile(defaultProfile)
        setSavedProfiles({
          individual: { individualName: '', accountType: 'individual' },
          company: { companyName: '', abn: '', acn: '', accountType: 'company', gstReportingCycle: 'Quarterly', paygReportingCycle: 'Quarterly' },
          sole_trader: { companyName: '', abn: '', acn: '', accountType: 'sole_trader', gstReportingCycle: 'Quarterly', paygReportingCycle: 'Quarterly' },
        })
      }
    } catch (err) {
      console.error('Failed to load business profile:', err)
      setError('Failed to load business profile')
    } finally {
      setIsLoading(false)
    }
  }

  // Check if form is valid - use useMemo for better reactivity
  const isFormValid = useMemo(() => {
    // Individual users don't need GST/PAYG cycles
    if (profile.accountType === 'individual') {
      const hasIndividualName = (profile.individualName || '').trim().length > 0
      return hasIndividualName
    }
    
    // Company/Sole Trader need company name, GST and PAYG cycles
    const hasCompanyName = (profile.companyName || '').trim().length > 0
    const hasGSTCycle = !!profile.gstReportingCycle
    const hasPAYGCycle = !!profile.paygReportingCycle
    
    console.log('[BusinessProfile] Validation:', {
      accountType: profile.accountType,
      hasCompanyName,
      hasGSTCycle,
      hasPAYGCycle,
      companyName: profile.companyName,
      gstCycle: profile.gstReportingCycle,
      paygCycle: profile.paygReportingCycle,
      isValid: hasCompanyName && hasGSTCycle && hasPAYGCycle
    })
    
    return hasCompanyName && hasGSTCycle && hasPAYGCycle
  }, [profile.individualName, profile.companyName, profile.accountType, profile.gstReportingCycle, profile.paygReportingCycle])

  const handleSave = async () => {
    // Validate required fields
    if (profile.accountType === 'individual') {
      if (!profile.individualName?.trim()) {
        setError('Your name is required')
        return
      }
    } else {
      if (!profile.companyName?.trim()) {
        setError('Company Name is required')
        return
      }
      
      if (!profile.gstReportingCycle) {
        setError('GST Reporting Cycle is required')
        return
      }
      
      if (!profile.paygReportingCycle) {
        setError('PAYG Reporting Cycle is required')
        return
      }
    }

    // Validate ABN format (11 digits, optional spaces) - only if provided and not individual
    if (profile.accountType !== 'individual') {
      const abnClean = (profile.abn || '').replace(/\s/g, '')
      if (profile.abn && abnClean.length > 0 && (abnClean.length !== 11 || !/^\d+$/.test(abnClean))) {
        setError('ABN must be 11 digits (or leave blank)')
        return
      }
    }

    try {
      setIsSaving(true)
      setError(null)
      
      // Save current profile values to savedProfiles
      const updatedSavedProfiles = {
        ...savedProfiles,
        [profile.accountType || 'individual']: { ...profile },
      }
      setSavedProfiles(updatedSavedProfiles)
      
      // Save to IndexedDB - merge all account type data
      const profileToSave = {
        ...updatedSavedProfiles.individual,
        ...updatedSavedProfiles.company,
        ...updatedSavedProfiles.sole_trader,
        accountType: profile.accountType, // Current account type
      }
      
      await indexedDBStorage.saveBusinessProfile(profileToSave)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
      
      // Dispatch custom event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('businessProfileUpdated'))
      }
    } catch (err) {
      console.error('Failed to save business profile:', err)
      setError('Failed to save business profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleABNChange = (value: string) => {
    // Format ABN with spaces (XX XXX XXX XXX)
    const cleaned = value.replace(/\s/g, '')
    if (cleaned.length <= 11 && /^\d*$/.test(cleaned)) {
      const formatted = cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4').trim()
      setProfile({ ...profile, abn: formatted })
    } else if (cleaned.length === 0) {
      setProfile({ ...profile, abn: '' })
    }
  }

  const handleACNChange = (value: string) => {
    // Format ACN with spaces (XXX XXX XXX)
    const cleaned = value.replace(/\s/g, '')
    if (cleaned.length <= 9 && /^\d*$/.test(cleaned)) {
      const formatted = cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim()
      setProfile({ ...profile, acn: formatted })
    } else if (cleaned.length === 0) {
      setProfile({ ...profile, acn: '' })
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Building2 className="w-6 h-6" />
        Business Profile
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {isSaved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>Business profile saved successfully</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Account Type *
          </label>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => handleAccountTypeChange('individual')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                profile.accountType === 'individual'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">Individual User</div>
              <div className="text-sm text-gray-600">Personal transactions only. No business tax calculations.</div>
            </button>
            <button
              type="button"
              onClick={() => handleAccountTypeChange('company')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                profile.accountType === 'company'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">Company</div>
              <div className="text-sm text-gray-600">Business transactions with ABN/ACN. Full tax reporting.</div>
            </button>
            <button
              type="button"
              onClick={() => handleAccountTypeChange('sole_trader')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                profile.accountType === 'sole_trader'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">Sole Trader</div>
              <div className="text-sm text-gray-600">Mixed personal and business transactions in same account.</div>
            </button>
          </div>
        </div>

        {profile.accountType === 'individual' ? (
          <div>
            <label htmlFor="individual-name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name *
            </label>
            <input
              id="individual-name"
              type="text"
              value={profile.individualName || ''}
              onChange={(e) => setProfile({ ...profile, individualName: e.target.value })}
              placeholder="Enter your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        ) : (
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              id="company-name"
              type="text"
              value={profile.companyName || ''}
              onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
              placeholder="Enter company name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        )}

        {profile.accountType !== 'individual' && (
          <div>
            <label htmlFor="abn" className="block text-sm font-medium text-gray-700 mb-2">
              ABN (Australian Business Number) {profile.accountType === 'company' && '*'}
            </label>
            <input
              id="abn"
              type="text"
              value={profile.abn}
              onChange={(e) => handleABNChange(e.target.value)}
              placeholder="XX XXX XXX XXX"
              maxLength={14}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={profile.accountType === 'company'}
            />
            <p className="mt-1 text-sm text-gray-500">
              Format: 11 digits (e.g., 12 345 678 901)
            </p>
          </div>
        )}

        {profile.accountType === 'company' && (
          <div>
            <label htmlFor="acn" className="block text-sm font-medium text-gray-700 mb-2">
              ACN (Australian Company Number) <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              id="acn"
              type="text"
              value={profile.acn || ''}
              onChange={(e) => handleACNChange(e.target.value)}
              placeholder="XXX XXX XXX"
              maxLength={11}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Format: 9 digits (e.g., 123 456 789) - Required for companies only
            </p>
          </div>
        )}

        {/* Tax & Reporting Settings - Only for Company/Sole Trader */}
        {profile.accountType !== 'individual' && (
          <>
            <div>
              <label htmlFor="gst-reporting-cycle" className="block text-sm font-medium text-gray-700 mb-2">
                GST Reporting Cycle *
              </label>
              <select
                id="gst-reporting-cycle"
                value={profile.gstReportingCycle}
                onChange={(e) => setProfile({ ...profile, gstReportingCycle: e.target.value as 'Monthly' | 'Quarterly' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Used for BAS deadline calculation (28th of the month following quarter end)
              </p>
            </div>

            <div>
              <label htmlFor="payg-reporting-cycle" className="block text-sm font-medium text-gray-700 mb-2">
                PAYG Reporting Cycle *
              </label>
              <select
                id="payg-reporting-cycle"
                value={profile.paygReportingCycle}
                onChange={(e) => setProfile({ ...profile, paygReportingCycle: e.target.value as 'Monthly' | 'Quarterly' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Used for PAYG Withholding deadline calculation
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Tax Registration Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <label htmlFor="gst-registered" className="block text-sm font-medium text-gray-700 mb-1">
                      GST Registered
                    </label>
                    <p className="text-xs text-gray-500">
                      Is your business registered for GST?
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="gst-registered"
                      type="checkbox"
                      checked={profile.gstRegistered || false}
                      onChange={(e) => setProfile({ ...profile, gstRegistered: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <label htmlFor="fbt-registered" className="block text-sm font-medium text-gray-700 mb-1">
                      FBT Registered
                    </label>
                    <p className="text-xs text-gray-500">
                      Is your business registered for FBT (Fringe Benefits Tax)?
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="fbt-registered"
                      type="checkbox"
                      checked={profile.fbtRegistered || false}
                      onChange={(e) => setProfile({ ...profile, fbtRegistered: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !isFormValid}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            title={!isFormValid 
              ? (profile.accountType === 'individual' 
                  ? 'Please enter your name' 
                  : 'Please fill in all required fields (Company Name, GST Cycle, PAYG Cycle)')
              : 'Save business profile'}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
        
        {/* Debug info (dev only - remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600 space-y-1">
            <p><strong>Debug Info:</strong></p>
            <p>Account Type: {profile.accountType || 'NOT SET'}</p>
            {profile.accountType === 'individual' ? (
              <p>Individual Name: "{profile.individualName || ''}" (length: {(profile.individualName || '').length})</p>
            ) : (
              <p>Company Name: "{profile.companyName || ''}" (length: {(profile.companyName || '').length})</p>
            )}
            {profile.accountType !== 'individual' && (
              <>
                <p>GST Cycle: {profile.gstReportingCycle || 'NOT SET'}</p>
                <p>PAYG Cycle: {profile.paygReportingCycle || 'NOT SET'}</p>
              </>
            )}
            <p>isSaving: {isSaving ? 'true' : 'false'}</p>
            <p>isFormValid: {isFormValid ? 'true' : 'false'}</p>
            <p>Button Disabled: {isSaving || !isFormValid ? 'YES' : 'NO'}</p>
            <p>Disabled Reason: {
              isSaving ? 'Saving...' 
              : profile.accountType === 'individual' 
                ? (!profile.individualName?.trim() ? 'Individual Name empty' : 'N/A')
                : (!profile.companyName?.trim() ? 'Company Name empty' : !profile.gstReportingCycle ? 'GST Cycle not set' : !profile.paygReportingCycle ? 'PAYG Cycle not set' : 'N/A')
            }</p>
          </div>
        )}
      </div>
    </div>
  )
}
