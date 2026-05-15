'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SELPIC_CMS_BUILD_APPLIED_SESSION_KEY } from '@/lib/siteConfigConstants'

const VERSION_KEY = 'selpic-deploy-version'
const VERSION_COOKIE_KEY = 'selpic_deploy_version'
const RESET_QUERY_KEY = 'resetCache'

/**
 * Prevent stale storefront state across devices after deployments.
 * When deploy version changes, clear cached CMS snapshot and force a reload.
 *
 * Also runs under `admin` URLs (except the admin login page): those routes were
 * skipped before, so browsers could keep old `_next/static` chunks after deploy.
 */
export default function StorefrontDeployVersionGuard() {
  const pathname = usePathname()

  const readRuntimeBuildId = (): string | null => {
    if (typeof window === 'undefined') return null
    try {
      const nextData = (window as any).__NEXT_DATA__
      const buildId = typeof nextData?.buildId === 'string' ? nextData.buildId.trim() : ''
      if (buildId) return buildId
    } catch {
      // ignore
    }
    try {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      for (const s of scripts) {
        const src = s.getAttribute('src') || ''
        const m = src.match(/\/_next\/static\/([^/]+)\//)
        if (m?.[1]) return m[1]
      }
    } catch {
      // ignore
    }
    return null
  }

  const readCookieVersion = (): string | null => {
    if (typeof document === 'undefined') return null
    const chunk = document.cookie
      .split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${VERSION_COOKIE_KEY}=`))
    if (!chunk) return null
    const raw = chunk.slice(VERSION_COOKIE_KEY.length + 1)
    return raw ? decodeURIComponent(raw) : null
  }

  const writeCookieVersion = (value: string): void => {
    if (typeof document === 'undefined') return
    // 1 year. SameSite=Lax keeps normal navigation behavior.
    document.cookie = `${VERSION_COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
  }

  const getStoredVersion = (): string | null => {
    if (typeof window === 'undefined') return null
    try {
      const v = window.localStorage.getItem(VERSION_KEY)
      if (v) return v
    } catch {
      // ignore
    }
    try {
      const v = window.sessionStorage.getItem(VERSION_KEY)
      if (v) return v
    } catch {
      // ignore
    }
    return readCookieVersion()
  }

  const persistVersion = (value: string): void => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(VERSION_KEY, value)
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.setItem(VERSION_KEY, value)
    } catch {
      // ignore
    }
    try {
      writeCookieVersion(value)
    } catch {
      // ignore
    }
  }

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

  // useEffect (not useLayoutEffect): sync localStorage clears + reload during layout were racing
  // React 19 hydration on localhost and caused removeChild NotFoundError. iOS may show one stale frame.
  useEffect(() => {
    if (typeof window === 'undefined') return

    /** Avoid full-document reload during sign-in / auth — was interrupting login & showing confusing failures. */
    const skipHardReload =
      pathname === '/login' ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/auth/') ||
      pathname === '/forgot-password' ||
      pathname.startsWith('/reset-password') ||
      pathname === '/admin/login' ||
      pathname.startsWith('/admin/login/')

    const envVersion = (process.env.NEXT_PUBLIC_DEPLOY_VERSION || '').trim()
    const runtimeBuildId = readRuntimeBuildId()
    const currentVersion =
      envVersion && envVersion !== 'dev-local'
        ? envVersion
        : (runtimeBuildId || envVersion).trim()
    if (!currentVersion) return

    const url = new URL(window.location.href)
    const wantsForcedReset = url.searchParams.get(RESET_QUERY_KEY) === '1'
    const hasVisibleVersionToken = url.searchParams.has('v')

    // Keep URL clean for visitors. If legacy links/redirects still include `v`, remove it silently.
    if (!wantsForcedReset && hasVisibleVersionToken) {
      url.searchParams.delete('v')
      window.history.replaceState(null, '', url.toString())
    }
    if (wantsForcedReset) {
      try {
        window.sessionStorage.removeItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY)
      } catch {
        // ignore
      }
      try {
        window.localStorage.removeItem('content-store')
        window.localStorage.removeItem('selpic-store')
      } catch {
        // ignore
      }
      persistVersion(currentVersion)
      void clearClientCaches().finally(() => {
        const next = new URL(window.location.href)
        next.searchParams.delete(RESET_QUERY_KEY)
        if (skipHardReload) {
          window.history.replaceState(null, '', next.toString())
          return
        }
        // Defer past React commit — sync reload during layout effect caused removeChild errors on localhost.
        window.setTimeout(() => {
          window.location.replace(next.toString())
        }, 0)
      })
      return
    }

    const previousVersion = getStoredVersion()
    if (!previousVersion) {
      try {
        window.sessionStorage.removeItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY)
      } catch {
        // ignore
      }
      try {
        // Safari can occasionally evict only the version key while keeping store snapshots.
        // If that happens, stale storefront blocks can survive unless we reset here.
        window.localStorage.removeItem('content-store')
        window.localStorage.removeItem('selpic-store')
      } catch {
        // ignore
      }
      persistVersion(currentVersion)
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
      // Also clear storefront product/order cache to prevent stale UI + broken links on old snapshots.
      window.localStorage.removeItem('selpic-store')
    } catch {
      // ignore
    }
    persistVersion(currentVersion)
    void clearClientCaches().finally(() => {
      if (skipHardReload) return
      const next = new URL(window.location.href)
      window.setTimeout(() => {
        window.location.replace(next.toString())
      }, 0)
    })
  }, [pathname])

  return null
}
