'use client'

import { ArrowLeft, Eye, RefreshCw, Package, Globe } from 'lucide-react'

interface AdminProductHeaderProps {
  title: string
  icon?: string
  showBackButton?: boolean
  backUrl?: string
  backLabel?: string
  showHomepageLink?: boolean
  showProductsPageLink?: boolean
  showCacheReset?: boolean
  showLanguageSelector?: boolean
  customActions?: React.ReactNode
}

export default function AdminProductHeader({
  title,
  icon,
  showBackButton = true,
  backUrl = '/admin/products',
  backLabel = 'Product Management',
  showHomepageLink = false,
  showProductsPageLink = false,
  showCacheReset = false,
  showLanguageSelector = false,
  customActions
}: AdminProductHeaderProps) {
  const handleCacheReset = () => {
    localStorage.removeItem('selpic-store')
    window.location.reload()
  }

  return (
    <div className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={() => (window.location.href = backUrl)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {backLabel}
              </button>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h1>

          <div className="flex items-center space-x-2">
            {showLanguageSelector && (
              <div
                className="p-2 text-gray-600 flex items-center gap-2"
                title="Site language: English"
                aria-label="Site language English"
              >
                <Globe className="h-5 w-5" />
                <span className="text-sm font-semibold">EN</span>
              </div>
            )}

            {showProductsPageLink && (
              <button
                onClick={() => window.open('/stickers', '_blank')}
                className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors duration-200"
                title="Open products page in new tab"
              >
                <Package className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Products</span>
              </button>
            )}

            {showCacheReset && (
              <button
                onClick={handleCacheReset}
                className="inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors duration-200"
                title="Clear cache and reload"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Reset cache</span>
              </button>
            )}

            {customActions}
          </div>
        </div>
      </div>
    </div>
  )
}
