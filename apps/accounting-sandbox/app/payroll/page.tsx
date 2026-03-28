'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Payroll Page - Redirects to main dashboard HR & Payroll tab
 * 
 * This page redirects users to the main dashboard's HR & Payroll tab
 * to maintain a unified experience within SELPIC A.
 */
export default function PayrollPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main dashboard with hr tab (legacy payroll support)
    router.replace('/?tab=hr')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to HR & Payroll...</p>
      </div>
    </div>
  )
}
