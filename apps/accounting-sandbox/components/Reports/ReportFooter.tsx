'use client'

import { useState, useEffect } from 'react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { COMPANY_LEGAL } from '@/lib/companyLegal'

interface BusinessProfile {
  companyName: string
  domain?: string
  abn?: string
  acn?: string
}

export function ReportFooter() {
  const [companyInfo, setCompanyInfo] = useState<BusinessProfile>({
    companyName: COMPANY_LEGAL.companyName,
    domain: COMPANY_LEGAL.domain,
    abn: COMPANY_LEGAL.abn,
    acn: COMPANY_LEGAL.acn,
  })

  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const profile = await indexedDBStorage.getBusinessProfile()
        if (profile) {
          setCompanyInfo({
            companyName: profile.companyName || COMPANY_LEGAL.companyName,
            domain: COMPANY_LEGAL.domain,
            abn: profile.abn || COMPANY_LEGAL.abn,
            acn: profile.acn || COMPANY_LEGAL.acn,
          })
        }
      } catch (err) {
        console.error('Failed to load company info:', err)
      }
    }
    loadCompanyInfo()
  }, [])

  return (
    <div className="hidden print:block mt-8 pt-6 border-t border-gray-300 print:mt-12 print:pt-8">
      <div className="text-center text-sm text-gray-600">
        <p className="font-semibold text-gray-800">{companyInfo.companyName}</p>
        <div className="mt-1 space-y-0.5">
          {companyInfo.domain && (
            <p>{companyInfo.domain}</p>
          )}
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
