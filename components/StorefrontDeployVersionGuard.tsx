'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SELPIC_CMS_BUILD_APPLIED_SESSION_KEY } from '@/lib/siteConfigConstants'

const VERSION_KEY = 'selpic-deploy-version'

/**
 * Prevent stale storefront state across devices after deployments.
 * When deploy version changes, clear cached CMS snapshot and force a reload.
 */
export default function StorefrontDeployVersionGuard() {
  const pathname = usePathname()

  // useLayoutEffect: must run before ContentStoreSupabaseSync (also layout) so session bust
  // is visible on first paint; useEffect would run too late on iOS Safari.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return

    const currentVersion = (process.env.NEXT_PUBLIC_DEPLOY_VERSION || '').trim()
    if (!currentVersion) return

    const previousVersion = window.localStorage.getItem(VERSION_KEY)
    if (!previousVersion) {
      try {
        window.sessionStorage.removeItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY)
      } catch {
        // ignore
      }
      window.localStorage.setItem(VERSION_KEY, currentVersion)
      return
    }
    if (previousVersion === currentVersion) return

    // Cached storefront CMS can keep old hero/content on some clients after deploy.
    try {
      window.sessionStorage.removeItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY)
    } catch {
      // ignore
    }
    window.localStorage.removeItem('content-store')
    window.localStorage.setItem(VERSION_KEY, currentVersion)
    window.location.reload()
  }, [pathname])

  return null
}
