'use client'

import { useState, useEffect } from 'react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface BusinessProfile {
  companyName: string
  abn?: string
  acn?: string
}

export function ReportFooter() {
  const [companyInfo, setCompanyInfo] = useState<BusinessProfile>({
    companyName: 'SELPIC PTY LTD',
    abn: '79 694 194 011',
    acn: '694 194 011',
  })

  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const profile = await indexedDBStorage.getBusinessProfile()
        if (profile) {
          setCompanyInfo({
            companyName: profile.companyName || 'SELPIC PTY LTD',
            abn: profile.abn || '79 694 194 011',
            acn: profile.acn || '694 194 011',
          })
        }
      } catch (err) {
        console.error('Failed to load company info:', err)
        // Use defaults if loading fails
      }
    }
    loadCompanyInfo()
  }, [])

  return (
    <div className="hidden print:block mt-8 pt-6 border-t border-gray-300 print:mt-12 print:pt-8">
      <div className="text-center text-sm text-gray-600">
        <p className="font-semibold text-gray-800">{companyInfo.companyName}</p>
        <div className="mt-1 space-y-0.5">
          {companyInfo.abn && (
            <p>ABN: {companyInfo.abn}</p>
          )}
          {companyInfo.acn && (
            <p>ACN: {companyInfo.acn}</p>
          )}
        </div>
      </div>
    </div>
  )
}
