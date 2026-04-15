'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const VERSION_KEY = 'selpic-deploy-version'

/**
 * Prevent stale storefront state across devices after deployments.
 * When deploy version changes, clear cached CMS snapshot and force a reload.
 */
export default function StorefrontDeployVersionGuard() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return

    const currentVersion = (process.env.NEXT_PUBLIC_DEPLOY_VERSION || '').trim()
    if (!currentVersion) return

    const previousVersion = window.localStorage.getItem(VERSION_KEY)
    if (!previousVersion) {
      window.localStorage.setItem(VERSION_KEY, currentVersion)
      return
    }
    if (previousVersion === currentVersion) return

    // Cached storefront CMS can keep old hero/content on some clients after deploy.
    window.localStorage.removeItem('content-store')
    window.localStorage.setItem(VERSION_KEY, currentVersion)
    window.location.reload()
  }, [pathname])

  return null
}
