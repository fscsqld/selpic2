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
      // 첫 로드에서 캐시/네트워크 타이밍 이슈가 있으면 짧게 재시도
      for (let attempt = 1; attempt <= 3; attempt++) {
        const remote = await fetchSiteConfigValue()
        if (remote) {
          const current = useContentStore.getState()
          const merged = mergePersistedSiteConfig(remote, current)
          normalizeRehydratedContentStoreState(merged)
          useContentStore.setState(merged)
          return
        }
        await new Promise((r) => setTimeout(r, attempt * 800))
      }
    })()
  }, [])

  return null
}
