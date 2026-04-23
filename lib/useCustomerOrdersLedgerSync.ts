'use client'

import { useEffect, useState } from 'react'
import { useUserAuth } from '@/lib/userAuth'
import { useStore } from '@/lib/store'

/**
 * Pulls orders from the Supabase ledger into the persisted storefront store when the user
 * has a Supabase Auth session. Enables the same order history across devices/browsers.
 *
 * `ledgerSyncDone` is false until the optional /api/me/orders request finishes (logged-in only),
 * so order detail pages can avoid flashing "not found" while the ledger merge runs.
 */
export function useCustomerOrdersLedgerSync(): { ledgerSyncDone: boolean } {
  const { isLoggedIn, user } = useUserAuth()
  const mergeOrdersFromServer = useStore((s) => s.mergeOrdersFromServer)
  const refreshOrdersFromStorage = useStore((s) => s.refreshOrdersFromStorage)
  const [ledgerSyncDone, setLedgerSyncDone] = useState(false)

  useEffect(() => {
    refreshOrdersFromStorage()
    if (!isLoggedIn || !user?.email?.trim()) {
      setLedgerSyncDone(true)
      return
    }

    let cancelled = false
    setLedgerSyncDone(false)
    ;(async () => {
      try {
        const res = await fetch('/api/me/orders', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          if (Array.isArray(data.orders) && data.orders.length > 0) {
            mergeOrdersFromServer(data.orders)
          }
        }
      } catch {
        /* ledger unavailable or not signed in with Supabase cookie */
      } finally {
        if (!cancelled) setLedgerSyncDone(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, user?.email, mergeOrdersFromServer, refreshOrdersFromStorage])

  return { ledgerSyncDone }
}
