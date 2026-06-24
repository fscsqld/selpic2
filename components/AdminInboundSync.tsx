'use client'

import { useEffect, useRef } from 'react'
import { useAdminInboundStore } from '@/lib/adminInboundStore'
import type { AdminInboundSummary } from '@/lib/server/adminInboundSummary'
import { useMessageStore } from '@/lib/messageStore'

const POLL_MS = 60_000

/**
 * Polls unified inbound summary so dashboard badges stay in sync with Supabase + server files.
 */
export default function AdminInboundSync() {
  const prevTotalRef = useRef<number | null>(null)
  const prevOrdersCountRef = useRef<number | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    let cancelled = false

    const applySummary = (summary: AdminInboundSummary) => {
      useAdminInboundStore.getState().setSummary(summary)
      const contactCount = summary.items.find((i) => i.key === 'contact')?.count ?? 0
      useMessageStore.setState({ unreadCount: contactCount })
    }

    const sync = async () => {
      try {
        const res = await fetch('/api/admin/inbound-summary', {
          cache: 'no-store',
          credentials: 'include',
        })
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean
          totalCount?: number
          items?: AdminInboundSummary['items']
        } | null
        if (!res.ok || !json?.ok || cancelled || !Array.isArray(json.items)) return

        const summary: AdminInboundSummary = {
          totalCount: typeof json.totalCount === 'number' ? json.totalCount : 0,
          items: json.items,
        }
        const prev = prevTotalRef.current
        const ordersCount = summary.items.find((i) => i.key === 'orders')?.count ?? 0
        const prevOrders = prevOrdersCountRef.current
        applySummary(summary)

        if (prevOrders !== null && ordersCount > prevOrders) {
          window.dispatchEvent(
            new CustomEvent('admin-new-order', {
              detail: { delta: ordersCount - prevOrders, summary },
            })
          )
        }
        prevOrdersCountRef.current = ordersCount

        if (prev !== null && summary.totalCount > prev) {
          window.dispatchEvent(
            new CustomEvent('admin-inbound-updated', {
              detail: { summary, delta: summary.totalCount - prev },
            })
          )
        }
        prevTotalRef.current = summary.totalCount
      } catch {
        /* non-fatal */
      }
    }

    void sync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void sync()
    }, POLL_MS)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [])

  return null
}
