'use client'

import { useLayoutEffect, useRef } from 'react'
import { fetchSiteConfigValue, flushPendingSiteConfigState } from '@/lib/siteConfigClient'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  mergePersistedSiteConfig,
  normalizeRehydratedContentStoreState,
  useContentStore
} from '@/lib/contentStore'
import { markSiteConfigRemoteFetchSettled } from '@/components/SiteConfigStoreAutosave'

/**
 * After mount, loads storefront CMS from Supabase `site_configs` via `fetchSiteConfigValue()`
 * in `@/lib/siteConfigClient` — same Supabase URL/anon key and `cache: 'no-store'` fetch as saves.
 */
export default function ContentStoreSupabaseSync() {
  const ran = useRef(false)
  const lastRemoteSignature = useRef<string>('')

  useLayoutEffect(() => {
    if (ran.current) return
    ran.current = true

    const applyRemoteIfChanged = async (): Promise<boolean> => {
      const remote = await fetchSiteConfigValue()
      if (!remote) return false
      const signature = JSON.stringify(remote)
      if (signature === lastRemoteSignature.current) return true
      lastRemoteSignature.current = signature

      const current = useContentStore.getState()
      // Supabase is the canonical source for storefront/admin CMS across local + deployed.
      // Keep local-only data only as fallback when remote payload is missing fields.
      const merged = mergePersistedSiteConfig(remote, current, false)
      normalizeRehydratedContentStoreState(merged)
      useContentStore.setState(merged)
      return true
    }

    let pollTimer: ReturnType<typeof setInterval> | undefined
    let realtimeChannel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | undefined
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void applyRemoteIfChanged()
    }

    void (async () => {
      try {
        for (let attempt = 1; attempt <= 3; attempt++) {
          const ok = await applyRemoteIfChanged()
          if (ok) break
          await new Promise((r) => setTimeout(r, attempt * 800))
        }
      } finally {
        markSiteConfigRemoteFetchSettled()
        // Keep local/deployed tabs converged even when content is edited elsewhere.
        pollTimer = setInterval(() => {
          void applyRemoteIfChanged()
        }, 15000)
        try {
          const supabase = createSupabaseBrowserClient()
          realtimeChannel = supabase
            .channel('site-configs-live-sync')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'site_configs',
                filter: 'config_key=eq.storefront_cms',
              },
              () => {
                void applyRemoteIfChanged()
              }
            )
            .subscribe()
        } catch (e) {
          console.warn('[siteConfig] realtime subscribe failed', e)
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
      }
    })()

    return () => {
      if (pollTimer) clearInterval(pollTimer)
      if (realtimeChannel) {
        try {
          realtimeChannel.unsubscribe()
        } catch {
          // ignore
        }
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flushPendingSiteConfigState()
    }
  }, [])

  return null
}
