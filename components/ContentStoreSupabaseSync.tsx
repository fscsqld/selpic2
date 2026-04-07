'use client'

import { useEffect, useRef } from 'react'
import { fetchSiteConfigValue } from '@/lib/siteConfigClient'
import {
  mergePersistedSiteConfig,
  normalizeRehydratedContentStoreState,
  useContentStore
} from '@/lib/contentStore'

/**
 * 마운트 후 Supabase `site_configs`에서 스토어프론트 CMS를 불러와 스토어에 반영합니다.
 * Zustand persist의 merge/rehydrate와 동일한 규칙을 사용합니다.
 */
export default function ContentStoreSupabaseSync() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    void (async () => {
      const remote = await fetchSiteConfigValue()
      if (!remote) return

      const current = useContentStore.getState()
      const merged = mergePersistedSiteConfig(remote, current)
      normalizeRehydratedContentStoreState(merged)
      useContentStore.setState(merged)
    })()
  }, [])

  return null
}
