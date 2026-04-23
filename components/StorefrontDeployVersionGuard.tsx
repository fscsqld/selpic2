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

  const clearClientCaches = async (): Promise<void> => {
    if (typeof window === 'undefined') return
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys()
        await Promise.all(keys.map((key) => window.caches.delete(key)))
      }
    } catch {
      // ignore
    }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          regs.map(async (reg) => {
            try {
              await reg.update()
            } catch {
              // ignore
            }
            await reg.unregister()
          })
        )
      }
    } catch {
      // ignore
    }
  }

  // useLayoutEffect: must run before ContentStoreSupabaseSync (also layout) so session bust
  // is visible on first paint; useEffect would run too late on iOS Safari.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return

    const currentVersion = (process.env.NEXT_PUBLIC_DEPLOY_VERSION || '').trim()
    if (!currentVersion) return

    let previousVersion: string | null = null
    try {
      previousVersion = window.localStorage.getItem(VERSION_KEY)
    } catch {
      // iOS private mode can throw SecurityError on localStorage access.
      return
    }
    if (!previousVersion) {
      try {
        window.sessionStorage.removeItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY)
      } catch {
        // ignore
      }
      try {
        window.localStorage.setItem(VERSION_KEY, currentVersion)
      } catch {
        // ignore
      }
      return
    }
    if (previousVersion === currentVersion) return

    // Cached storefront CMS can keep old hero/content on some clients after deploy.
    try {
      window.sessionStorage.removeItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY)
    } catch {
      // ignore
    }
    try {
      window.localStorage.removeItem('content-store')
      window.localStorage.setItem(VERSION_KEY, currentVersion)
    } catch {
      // ignore
    }
    void clearClientCaches().finally(() => {
      const next = new URL(window.location.href)
      next.searchParams.set('v', currentVersion)
      window.location.replace(next.toString())
    })
  }, [pathname])

  return null
}
