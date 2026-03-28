'use client'

import AdminProductHeader from '@/components/AdminProductHeader'
import CategoryProductManager from '@/components/CategoryProductManager'

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
            subcategories: [
              { value: 'Sunscreen', label: 'Sunscreen', icon: '☀️' },
              { value: 'Sunstick', label: 'Sunstick', icon: '🧴' },
              { value: 'Cool Patch', label: 'Cool Patch', icon: '❄️' },
              { value: 'Lifestyle', label: 'Lifestyle', icon: '🌟' },
              { value: 'Other', label: 'Other', icon: '🔥' }
            ],
            sizes: [
              { value: 'Small', label: 'Small' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Large', label: 'Large' },
              { value: 'Custom', label: 'Custom' }
            ],
            colors: [
              { value: 'Red', label: 'Red' },
              { value: 'Orange', label: 'Orange' },
              { value: 'Yellow', label: 'Yellow' },
              { value: 'Pink', label: 'Pink' },
              { value: 'Transparent', label: 'Transparent' },
              { value: 'Multi', label: 'Multi Color' },
              { value: 'Custom', label: 'Custom' }
            ]
          }}
        />
      </div>
    </div>
  )
}
