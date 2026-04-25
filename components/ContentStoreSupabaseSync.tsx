'use client'

import { useEffect, useRef } from 'react'
import { fetchSiteConfigValue, flushPendingSiteConfigState } from '@/lib/siteConfigClient'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  mergeRemoteSiteConfigForStoreApply,
  partializedSiteConfigForPersist,
  normalizeRehydratedContentStoreState,
  useContentStore
} from '@/lib/contentStore'
import { markSiteConfigRemoteFetchSettled } from '@/components/SiteConfigStoreAutosave'
import { SELPIC_CMS_BUILD_APPLIED_SESSION_KEY } from '@/lib/siteConfigConstants'

/** After initial retries, periodic merge with Supabase. Realtime + visibility handle most updates; this is a safety net (not every 8s — saves battery and server load on tablets). */
const BACKGROUND_SITE_CONFIG_POLL_MS = 120_000

/**
 * After mount, loads storefront CMS from Supabase `site_configs` via `fetchSiteConfigValue()`
 * in `@/lib/siteConfigClient` — same Supabase URL/anon key and `cache: 'no-store'` fetch as saves.
 */
export default function ContentStoreSupabaseSync() {
  const ran = useRef(false)
  const lastRemoteSignature = useRef<string>('')
  const remoteMergeSucceeded = useRef(false)
  const disableRemoteSync = (process.env.NEXT_PUBLIC_DISABLE_REMOTE_CMS_SYNC || '').trim() === '1'

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (disableRemoteSync) {
      try {
        useContentStore.getState().setSiteConfigRemoteSynced(true)
      } catch {
        // ignore
      }
      // Diagnostic mode: ignore Supabase CMS and keep bundle/local defaults.
      markSiteConfigRemoteFetchSettled(false)
      return
    }

    const deployVersion = (process.env.NEXT_PUBLIC_DEPLOY_VERSION || '').trim()
    if (typeof window !== 'undefined' && deployVersion) {
      try {
        const applied = window.sessionStorage.getItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY)
        if (applied !== deployVersion) {
          lastRemoteSignature.current = ''
        }
      } catch {
        lastRemoteSignature.current = ''
      }
    }

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
        if (typeof window !== 'undefined' && deployVersion) {
          try {
            if (window.sessionStorage.getItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY) !== deployVersion) {
              window.sessionStorage.setItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY, deployVersion)
            }
          } catch {
            // ignore
          }
        }
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
      if (typeof window !== 'undefined' && deployVersion) {
        try {
          window.sessionStorage.setItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY, deployVersion)
        } catch {
          // ignore
        }
      }
      return true
    }

    let pollTimer: ReturnType<typeof setInterval> | undefined
    let realtimeChannel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | undefined
    let realtimeClient: ReturnType<typeof createSupabaseBrowserClient> | undefined
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void applyRemoteIfChanged()
    }

    /** iOS Safari back-forward cache: restore old JS + localStorage; force a fresh CMS merge. */
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        lastRemoteSignature.current = ''
      }
      try {
        if (deployVersion && window.sessionStorage.getItem(SELPIC_CMS_BUILD_APPLIED_SESSION_KEY) !== deployVersion) {
          lastRemoteSignature.current = ''
        }
      } catch {
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

    /** Must allow ~2× slow `/api/site-config/public` attempts (see siteConfigClient fetch timeout). */
    const INITIAL_FETCH_BUDGET_MS = 45_000

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
        // If remote never merged, keep siteConfigRemoteSynced false so the homepage can show the
        // timeout + retry UI instead of treating stale localStorage as canonical (common on flaky tablet Wi‑Fi).
        // Keep local/deployed tabs converged when realtime misses (flaky Wi‑Fi / Safari).
        pollTimer = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
          void applyRemoteIfChanged()
        }, BACKGROUND_SITE_CONFIG_POLL_MS)
        try {
          realtimeClient = createSupabaseBrowserClient()
          // Unique channel name per mount avoids "cannot add callbacks after subscribe" races.
          const channelName = `site-configs-live-sync-${Date.now()}`
          realtimeChannel = realtimeClient
            .channel(channelName)
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
          if (realtimeClient?.removeChannel) {
            void realtimeClient.removeChannel(realtimeChannel)
          } else {
            realtimeChannel.unsubscribe()
          }
        } catch {
          // ignore
        }
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', onPageShow as EventListener)
      window.removeEventListener('online', onOnline)
      flushPendingSiteConfigState()
    }
  }, [disableRemoteSync])

  return null
}
