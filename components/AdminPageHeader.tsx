'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Home, Globe } from 'lucide-react'

interface AdminPageHeaderProps {
  title: string
  icon?: React.ReactNode
  showBackButton?: boolean
  backUrl?: string
  backLabel?: string
  showHomepageLink?: boolean
  showLanguageSelector?: boolean
  customActions?: React.ReactNode
}

export default function AdminPageHeader({
  title,
  icon,
  showBackButton = true,
  backUrl = '/admin/dashboard',
  backLabel = 'Dashboard',
  showHomepageLink = true,
  showLanguageSelector = false,
  customActions
}: AdminPageHeaderProps) {
  const router = useRouter()

  return (
    <div className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={() => router.push(backUrl)}
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

            {showHomepageLink && (
              <button
                onClick={() => window.open('/', '_blank')}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
                title="Open storefront in new tab"
              >
                <Home className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Storefront</span>
              </button>
            )}

            {customActions}
          </div>
        </div>
      </div>
    </div>
  )
}
