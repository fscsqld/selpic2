'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  getOrCreateVisitorId,
  isStorefrontPath,
  shouldSendPageviewForPath,
  shouldTrackStorefrontTraffic,
} from '@/lib/analytics/visitor-client'

/**
 * Anonymous production storefront pageviews for Admin daily traffic.
 * No-op on localhost / Vercel preview / admin routes.
 */
export default function StorefrontPageViewTracker() {
  const pathname = usePathname() || '/'

  useEffect(() => {
    if (!shouldTrackStorefrontTraffic()) return
    if (!isStorefrontPath(pathname)) return
    if (!shouldSendPageviewForPath(pathname)) return

    const visitorId = getOrCreateVisitorId()
    if (!visitorId) return

    const body = {
      visitorId,
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    }

    const send = () => {
      void fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {})
    }

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
        if (navigator.sendBeacon('/api/analytics/pageview', blob)) return
      } catch {
        // fall through to fetch
      }
    }
    send()
  }, [pathname])

  return null
}
