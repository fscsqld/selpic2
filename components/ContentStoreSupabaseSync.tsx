'use client'

import { useLayoutEffect, useRef } from 'react'
import { fetchSiteConfigValue, flushPendingSiteConfigState } from '@/lib/siteConfigClient'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  mergeRemoteSiteConfigForStoreApply,
  partializedSiteConfigForPersist,
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
  const remoteMergeSucceeded = useRef(false)

  useLayoutEffect(() => {
    if (ran.current) return
    ran.current = true

    const setSynced = (v: boolean) => {
      try {
        useContentStore.getState().setSiteConfigRemoteSynced(v)
      } catch {
        // ignore
      }
    }

    const applyRemoteIfChanged = async (): Promise<boolean> => {
      const remote = await fetchSiteConfigValue()
      if (!remote) return false
      const signature = JSON.stringify(remote)
      if (signature === lastRemoteSignature.current) {
        setSynced(true)
        return true
      }
      lastRemoteSignature.current = signature

      const current = useContentStore.getState()
      // Supabase is canonical (private/incognito: no localStorage — must not keep bundle defaults over remote arrays).
      const merged = mergeRemoteSiteConfigForStoreApply(remote as Record<string, unknown>, current)
      normalizeRehydratedContentStoreState(merged)
      useContentStore.setState(merged)
      remoteMergeSucceeded.current = true
      setSynced(true)
      try {
        // Ensure local browser cache cannot keep stale CMS values after remote sync.
        const payload = {
          state: partializedSiteConfigForPersist(useContentStore.getState()),
          version: 0,
        }
        window.localStorage.setItem('content-store', JSON.stringify(payload))
      } catch (e) {
        console.warn('[siteConfig] failed to persist synced content-store locally', e)
      }
      return true
    }

    let pollTimer: ReturnType<typeof setInterval> | undefined
    let realtimeChannel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | undefined
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void applyRemoteIfChanged()
    }

    /** iOS Safari back-forward cache: restore old JS + localStorage; force a fresh CMS merge. */
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        lastRemoteSignature.current = ''
      }
      void applyRemoteIfChanged()
    }

    // Register immediately so bfcache restore and tab switches refetch without waiting on network.
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', onPageShow as EventListener)

    /** Slow mobile / flaky networks: retry until success or budget elapses (avoid stale localStorage as "the site"). */
    const onOnline = () => {
      void applyRemoteIfChanged()
    }
    window.addEventListener('online', onOnline)

    const INITIAL_FETCH_BUDGET_MS = 22_000

    void (async () => {
      try {
        const deadline = Date.now() + INITIAL_FETCH_BUDGET_MS
        let attempt = 0
        while (Date.now() < deadline) {
          attempt += 1
          const ok = await applyRemoteIfChanged()
          if (ok) break
          const remaining = deadline - Date.now()
          if (remaining <= 0) break
          const backoff = Math.min(400 + attempt * 450, 5_500)
          await new Promise((r) => setTimeout(r, Math.min(backoff, remaining)))
        }
      } finally {
        // Never upsert bundle defaults over Supabase when the remote row was never read (mobile/offline).
        markSiteConfigRemoteFetchSettled(remoteMergeSucceeded.current)
        if (!remoteMergeSucceeded.current) {
          setSynced(true)
        }
        // Keep local/deployed tabs converged even when content is edited elsewhere.
        pollTimer = setInterval(() => {
          void applyRemoteIfChanged()
        }, 8000)
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
      window.removeEventListener('pageshow', onPageShow as EventListener)
      window.removeEventListener('online', onOnline)
      flushPendingSiteConfigState()
    }
  }, [])

  return null
}
