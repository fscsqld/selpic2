'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'

let saveTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Persists the Zustand persist payload (JSON string of `{ state, version }`) to Supabase.
 * Called from localStorage shim when code still uses localStorage.setItem('content-store', …).
 */
export function scheduleSiteConfigPersistString(serialized: string): void {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void pushPersistStringToSupabase(serialized)
  }, 1200)
}

/** 디바운스 없이 즉시 Supabase에 반영 (백업 가져오기 등) */
export function persistSiteConfigPayloadNow(serialized: string): Promise<void> {
  return pushPersistStringToSupabase(serialized)
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
