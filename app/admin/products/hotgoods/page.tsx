'use client'

import AdminProductHeader from '@/components/AdminProductHeader'
import CategoryProductManager from '@/components/CategoryProductManager'
import { MARKET_S_SUBCATEGORIES } from '@/lib/marketSSubcategory'

export default function HotGoodsPage() {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <AdminProductHeader
        title="Market S Management"
        icon="🔥"
        showHomepageLink={false}
        showLanguageSelector={true}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page description */}
        <div className="mb-8">
          <p className="text-gray-600">Manage Market S products. Manage popular items separately.</p>
        </div>

        <CategoryProductManager
          categoryName="Market S"
          categoryValue="HotGoods"
          categoryIcon="🔥"
          categoryColor="bg-red-600"
          specialFields={{
            subcategories: MARKET_S_SUBCATEGORIES.map((row) => ({
              value: row.value,
              label: row.label,
              icon: row.icon,
            })),
          }}
        />
      </div>
    </div>
  )
}
