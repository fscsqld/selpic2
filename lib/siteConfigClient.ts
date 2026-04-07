'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'

let saveTimer: ReturnType<typeof setTimeout> | undefined
let pendingSerialized: string | undefined
let flushHandlersInstalled = false

/**
 * Persists the Zustand persist payload (JSON string of `{ state, version }`) to Supabase.
 * Called from localStorage shim when code still uses localStorage.setItem('content-store', …).
 */
export function scheduleSiteConfigPersistString(serialized: string): void {
  pendingSerialized = serialized
  installFlushHandlersOnce()
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const payload = pendingSerialized
    pendingSerialized = undefined
    if (!payload) return
    void pushPersistStringToSupabase(payload)
  }, 1200)
}

/** 디바운스 없이 즉시 Supabase에 반영 (백업 가져오기 등) */
export function persistSiteConfigPayloadNow(serialized: string): Promise<void> {
  pendingSerialized = undefined
  return pushPersistStringToSupabase(serialized)
}

/**
 * 페이지 이탈/백그라운드 전환 시 디바운스 저장이 유실되지 않도록 즉시 플러시합니다.
 * (사용자가 저장 직후 새로고침/탭 닫기를 할 때 가장 자주 발생)
 */
export function flushPendingSiteConfigPersist(): void {
  clearTimeout(saveTimer)
  saveTimer = undefined
  const payload = pendingSerialized
  pendingSerialized = undefined
  if (!payload) return
  void pushPersistStringToSupabase(payload)
}

function installFlushHandlersOnce(): void {
  if (flushHandlersInstalled) return
  if (typeof window === 'undefined') return
  flushHandlersInstalled = true

  // pagehide: iOS/Safari 포함 페이지 전환/닫기 케이스에서 가장 신뢰도 높음
  window.addEventListener('pagehide', () => flushPendingSiteConfigPersist())
  window.addEventListener('beforeunload', () => flushPendingSiteConfigPersist())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSiteConfigPersist()
  })
}

async function pushPersistStringToSupabase(serialized: string): Promise<void> {
  try {
    const parsed = JSON.parse(serialized) as { state?: Record<string, unknown>; version?: number }
    const state = parsed.state
    if (!state || typeof state !== 'object') return

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from('site_configs').upsert(
      {
        config_key: STOREFRONT_CMS_CONFIG_KEY,
        value: state as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'config_key' }
    )
    if (error) {
      console.error('[siteConfig] Supabase upsert failed:', error.message)
    }
  } catch (e) {
    console.error('[siteConfig] upsert error', e)
  }
}

/** Load raw value JSON from Supabase (same shape as persist `state` object). */
export async function fetchSiteConfigValue(): Promise<Record<string, unknown> | null> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('site_configs')
      .select('value')
      .eq('config_key', STOREFRONT_CMS_CONFIG_KEY)
      .maybeSingle()

    if (error) {
      console.warn('[siteConfig] fetch:', error.message)
      return null
    }
    if (!data?.value || typeof data.value !== 'object') return null
    return data.value as Record<string, unknown>
  } catch (e) {
    console.warn('[siteConfig] fetch error', e)
    return null
  }
}
