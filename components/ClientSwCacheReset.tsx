'use client'

import { useEffect } from 'react'

/**
 * Runs after React commit — avoids racing the reconciler during hydration (NotFoundError removeChild).
 * Service worker + cache cleanup for LAN/tablet dev; gated by env so production stays quiet.
 */
export default function ClientSwCacheReset() {
  useEffect(() => {
    const forceReset = (process.env.NEXT_PUBLIC_FORCE_CLIENT_RESET || '').trim() === '1'
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev && !forceReset) return

    const run = () => {
      if (typeof window === 'undefined') return

      let swPromise: Promise<unknown> = Promise.resolve()
      if ('serviceWorker' in navigator) {
        swPromise = navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
          .then(() =>
            navigator.serviceWorker
              .register(`/sw.js?v=${Date.now()}`, { scope: '/' })
              .then((reg) => reg.unregister())
              .catch(() => {})
          )
          .catch(() => {})
      }

      void swPromise.finally(() => {
        if (!forceReset) return

        try {
          try {
            window.localStorage.clear()
          } catch {
            /* ignore */
          }
          try {
            window.sessionStorage.clear()
          } catch {
            /* ignore */
          }
        } catch {
          /* ignore */
        }

        if ('caches' in window) {
          void window.caches
            .keys()
            .then((keys) => Promise.all(keys.map((k) => window.caches.delete(k))))
            .catch(() => {})
        }

        try {
          const idb = window.indexedDB
          if (typeof idb.databases === 'function') {
            void idb
              .databases()
              .then((dbs) =>
                Promise.all(
                  (dbs || []).map(
                    (db) =>
                      new Promise<void>((resolve) => {
                        if (!db?.name) {
                          resolve()
                          return
                        }
                        try {
                          const req = idb.deleteDatabase(db.name)
                          req.onsuccess = req.onerror = req.onblocked = () => resolve()
                        } catch {
                          resolve()
                        }
                      })
                  )
                )
              )
              .catch(() => {})
          }
        } catch {
          /* ignore */
        }
      })
    }

    queueMicrotask(run)
  }, [])

  return null
}
