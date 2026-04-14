'use client'

import { useEffect, useRef } from 'react'
import { partializedSiteConfigForPersist, useContentStore } from '@/lib/contentStore'
import {
  flushPendingSiteConfigState,
  scheduleSiteConfigStateUpsert,
} from '@/lib/siteConfigClient'

/** ContentStoreSupabaseSync 첫 fetch 종료 후 true — 그 전 기본값만 upsert하는 레이스 완화 */
let siteConfigRemoteFetchSettled = false

export function markSiteConfigRemoteFetchSettled(): void {
  if (siteConfigRemoteFetchSettled) return
  siteConfigRemoteFetchSettled = true
  try {
    // _hasHydrated 가 아직 false인 타이밍이 있어도 병합된 스토어를 Supabase에 반영해야 함.
    // (이전에는 여기서 return 되어 첫 저장이 영원히 스킵되는 경우가 있었음)
    const payload = partializedSiteConfigForPersist(useContentStore.getState())
    scheduleSiteConfigStateUpsert(payload)
  } catch (e) {
    console.warn('[siteConfig] initial flush after remote fetch failed', e)
  }
}

/**
 * CMS 스토어 변경 시 partialize 페이로드를 Supabase에 upsert합니다.
 */
export default function SiteConfigStoreAutosave() {
  const hydrated = useContentStore((s) => s._hasHydrated)
  const lastJson = useRef<string>('')

  // 클라이언트 라우팅은 pagehide 가 없어 디바운스 중인 저장이 사라질 수 있음 → 언마운트 시 플러시
  useEffect(() => {
    return () => {
      flushPendingSiteConfigState()
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    const unsub = useContentStore.subscribe((state) => {
      if (!state._hasHydrated) return
      if (!siteConfigRemoteFetchSettled) return
      try {
        const payload = partializedSiteConfigForPersist(state)
        const json = JSON.stringify(payload)
        if (json === lastJson.current) return
        lastJson.current = json
        scheduleSiteConfigStateUpsert(payload)
      } catch (e) {
        console.warn('[siteConfig] autoserialize failed', e)
      }
    })

    return () => {
      unsub()
    }
  }, [hydrated])

  return null
}
