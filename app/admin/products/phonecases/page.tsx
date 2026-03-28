'use client'

import AdminProductHeader from '@/components/AdminProductHeader'
import PhoneCaseManager from '@/components/PhoneCaseManager'

export default function PhoneCasesPage() {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <AdminProductHeader
        title="Phone Case Management"
        icon="📱"
        showHomepageLink={false}
        showLanguageSelector={true}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page description */}
        <div className="mb-8">
          <p className="text-gray-600">Manage phone case products. Categorize by brand and model.</p>
        </div>

        <PhoneCaseManager />
      </div>
    </div>
  )
}
