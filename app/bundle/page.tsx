'use client'

import { useStore } from '@/lib/store'
import Header from '@/components/Header'
import Link from 'next/link'

export default function BundlePage() {
  const { products } = useStore()
  
  // 묶음 상품만 필터링
  const bundleProducts = products.filter(product => product.isBundle && product.category === 'Bundle')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 Bundle Products</h1>
          <p className="text-gray-600">
            Special event bundles combining multiple products. Customize each item individually. ({bundleProducts.length} bundles)
          </p>
        </div>

        {/* 상품 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundleProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4">{product.description}</p>
                
                {/* 포함된 상품 정보 */}
                {product.bundleItems && product.bundleItems.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Includes:</p>
                    <div className="flex flex-wrap gap-2">
                      {product.bundleItems.map((item, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                        >
                          {item.category === 'Stickers' && '🏷️'}
                          {item.category === 'Stamps' && '📮'}
                          {item.category === 'PhoneCases' && '📱'}
                          {item.category === 'HotGoods' && '🔥'}
                          {' '}
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">
                    ${product.price}
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-lg text-gray-500 line-through ml-2">
                        ${product.originalPrice}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Link 
                      href={`/bundle/customize?product=${product.id}`}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-center"
                    >
                      Customize
                    </Link>
                    <Link 
                      href="/cart"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
                    >
                      Cart
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {bundleProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No bundle products available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

