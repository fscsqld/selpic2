'use client'

import { useLayoutEffect, useRef } from 'react'
import { fetchSiteConfigValue, flushPendingSiteConfigState } from '@/lib/siteConfigClient'
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

  useLayoutEffect(() => {
    if (ran.current) return
    ran.current = true

    void (async () => {
      try {
        for (let attempt = 1; attempt <= 3; attempt++) {
          const remote = await fetchSiteConfigValue()
          if (remote) {
            const current = useContentStore.getState()
            const merged = mergePersistedSiteConfig(remote, current, true)
            normalizeRehydratedContentStoreState(merged)
            useContentStore.setState(merged)
            return
          }
          await new Promise((r) => setTimeout(r, attempt * 800))
        }
      } finally {
        markSiteConfigRemoteFetchSettled()
      }
    })()

    return () => {
      flushPendingSiteConfigState()
    }
  }, [])

  return null
}
