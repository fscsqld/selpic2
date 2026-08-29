'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAdminAuth } from '@/lib/adminAuth'
import { partializedSiteConfigForPersist, useContentStore } from '@/lib/contentStore'
import {
  flushPendingSiteConfigState,
  scheduleSiteConfigStateUpsert,
  setSiteConfigCloudWritesAllowed,
} from '@/lib/siteConfigClient'

/** ContentStoreSupabaseSync 첫 fetch 종료 후 true — 그 전 기본값만 upsert하는 레이스 완화 */
let siteConfigRemoteFetchSettled = false
/** Prevent storefront visitors from overwriting canonical CMS rows. */
let siteConfigWriteEnabled = false

/**
 * @param allowInitialUpsert When false, skip scheduling an upsert (e.g. remote fetch never succeeded —
 * avoids writing bundle defaults over production `site_configs` on slow/offline mobile).
 */
export function markSiteConfigRemoteFetchSettled(allowInitialUpsert = true): void {
  if (siteConfigRemoteFetchSettled) return
  siteConfigRemoteFetchSettled = true
  if (!siteConfigWriteEnabled) return
  if (!allowInitialUpsert) return
  try {
    const payload = partializedSiteConfigForPersist(useContentStore.getState())
    scheduleSiteConfigStateUpsert(payload)
  } catch (e) {
    console.warn('[siteConfig] initial flush after remote fetch failed', e)
  }
}

/**
 * CMS 스토어 변경 시 partialize 페이로드를 Supabase에 upsert합니다.
 * Requires authenticated admin session — not merely being on `/admin/login`.
 */
export default function SiteConfigStoreAutosave() {
  const pathname = usePathname() || ''
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/')
  const isLoggedIn = useAdminAuth((s) => s.isLoggedIn)
  const hydrated = useContentStore((s) => s._hasHydrated)
  const lastJson = useRef<string>('')
  const writesAllowed = isAdminArea && isLoggedIn

  useEffect(() => {
    siteConfigWriteEnabled = writesAllowed
    setSiteConfigCloudWritesAllowed(writesAllowed)
    return () => {
      if (siteConfigWriteEnabled === writesAllowed) {
        siteConfigWriteEnabled = false
        // Do not clear the global gate here on every template remount while still logged in —
        // the next effect run re-enables. Clearing would drop in-flight debounced saves.
        // Logout clears the gate via adminAuth + writesAllowed becoming false.
      }
    }
  }, [writesAllowed])

  // 클라이언트 라우팅은 pagehide 가 없어 디바운스 중인 저장이 사라질 수 있음 → 언마운트 시 플러시
  useEffect(() => {
    return () => {
      if (siteConfigWriteEnabled) {
        flushPendingSiteConfigState()
      }
    }
  }, [])

  useEffect(() => {
    if (!writesAllowed) return
    if (!hydrated) return

    const unsub = useContentStore.subscribe((state) => {
      if (!siteConfigWriteEnabled) return
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
  }, [hydrated, writesAllowed])

  return null
}
