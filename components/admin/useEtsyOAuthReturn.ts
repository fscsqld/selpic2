'use client'

import { useEffect, useRef } from 'react'
import {
  etsyOAuthBannerMessage,
  formatEtsySyncSuccessMessage,
  runEtsyOrderSync,
  stripEtsyOAuthSearchParams,
} from '@/lib/admin/etsyAdminUi'

/**
 * Handles ?etsy=... after OAuth redirect. Runs one post-connect sync when `etsy=connected`.
 */
export function useEtsyOAuthReturn(options: {
  enabled: boolean
  onBanner: (message: string) => void
  afterConnected?: () => void | Promise<void>
}) {
  const ranSync = useRef(false)
  const onBannerRef = useRef(options.onBanner)
  const afterConnectedRef = useRef(options.afterConnected)
  onBannerRef.current = options.onBanner
  afterConnectedRef.current = options.afterConnected

  useEffect(() => {
    if (!options.enabled || typeof window === 'undefined') return

    const sp = new URLSearchParams(window.location.search)
    const etsy = sp.get('etsy')
    if (!etsy) return

    const detail = sp.get('detail')
    const baseMsg = etsyOAuthBannerMessage(etsy, detail)
    if (baseMsg && etsy !== 'connected') {
      onBannerRef.current(baseMsg)
      stripEtsyOAuthSearchParams()
      return
    }

    if (etsy !== 'connected') return

    if (ranSync.current) {
      stripEtsyOAuthSearchParams()
      return
    }
    ranSync.current = true

    void (async () => {
      try {
        const result = await runEtsyOrderSync()
        if (result.ok) {
          onBannerRef.current(
            `Etsy connected. ${formatEtsySyncSuccessMessage(result.imported, result.scanned, result.sinceDays)}`
          )
        } else {
          onBannerRef.current(`Etsy connected, but sync failed: ${result.error ?? 'Unknown error'}`)
        }
      } catch {
        onBannerRef.current('Etsy connected, but the sync request failed.')
      } finally {
        await afterConnectedRef.current?.()
        stripEtsyOAuthSearchParams()
      }
    })()
  }, [options.enabled])
}
