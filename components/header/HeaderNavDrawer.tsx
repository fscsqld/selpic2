'use client'

import type { ReactNode, MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Home,
  Package,
  ShoppingCart,
  ShoppingBag,
  Info,
  Grid3X3,
  Smartphone,
  Flame,
  Palette,
  Gift,
  MessageSquare,
  BarChart3,
  Users,
  Settings,
  X,
} from 'lucide-react'
import type { SidebarMenuItem } from '@/lib/contentStore'

type Props = {
  menuItems: SidebarMenuItem[]
  brandHref: string
  brandSlot: ReactNode
  onClose: () => void
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Home,
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  Settings,
  Info,
  Smartphone,
  Flame,
  Gift,
  Palette,
  MessageSquare,
  Grid3X3,
  ShoppingBag,
}

/** Mobile side drawer — code-split; mounts only when the menu is open. */
export default function HeaderNavDrawer({ menuItems, brandHref, brandSlot, onClose }: Props) {
  const router = useRouter()

  const handleNavigation = (path: string) => {
    try {
      onClose()
      let normalizedPath = path.trim()
      if (!normalizedPath) return
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = `/${normalizedPath}`
      }
      if (normalizedPath.includes('#app/')) {
        normalizedPath = normalizedPath.replace('#app/', '/')
      }
      if (normalizedPath.includes('/page.tsx')) {
        normalizedPath = normalizedPath.replace('/page.tsx', '')
      }
      router.push(normalizedPath)
    } catch {
      try {
        window.location.href = path
      } catch {
        /* ignore */
      }
    }
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName]
    return IconComponent ? <IconComponent size={24} /> : <Home size={24} />
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 gap-3">
            <Link
              href={brandHref}
              onClick={onClose}
              className="flex items-center min-h-10 min-w-0 flex-1"
            >
              {brandSlot}
            </Link>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-600 rounded-full transition-all duration-200 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                aria-label="Close navigation menu"
              >
                <X size={24} aria-hidden />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto scrollbar-thin max-h-[calc(100vh-120px)]">
            <div className="p-6 space-y-4">
              {menuItems.map((menuItem) => {
                const handleMenuClick = (e: MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()

                  setTimeout(() => {
                    onClose()
                  }, 100)

                  if (menuItem.type === 'link') {
                    let url = menuItem.url?.trim()
                    if (!url) return

                    if (url.includes('#app/')) {
                      url = url.replace('#app/', '/')
                    }
                    if (url.includes('/page.tsx')) {
                      url = url.replace('/page.tsx', '')
                    }

                    if (menuItem.title === '스티커' && url === '/products') {
                      url = '/stickers'
                    }

                    handleNavigation(url)
                  } else if (menuItem.type === 'scroll') {
                    const targetElement = document.querySelector(menuItem.url)
                    if (targetElement) {
                      targetElement.scrollIntoView({ behavior: 'smooth' })
                    }
                  } else if (menuItem.type === 'disabled') {
                    return
                  }
                }

                if (menuItem.type === 'disabled') {
                  return (
                    <div
                      key={menuItem.id}
                      className="relative w-full flex items-center space-x-4 p-4 text-lg font-semibold text-gray-400 bg-gray-50 rounded-xl cursor-not-allowed"
                    >
                      {getIconComponent(menuItem.icon)}
                      <span>{menuItem.title}</span>
                      {menuItem.isComingSoon && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  )
                }

                return (
                  <button
                    key={menuItem.id}
                    type="button"
                    onClick={handleMenuClick}
                    className="w-full flex items-center space-x-4 p-4 text-lg font-semibold text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-200"
                  >
                    {getIconComponent(menuItem.icon)}
                    <span>{menuItem.title}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
