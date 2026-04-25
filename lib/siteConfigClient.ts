'use client'

/**
 * CMS site_configs read/write uses {@link createSupabaseBrowserClientNoStore} only — same
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY as the rest of the app, but every
 * request uses `cache: 'no-store'` so the browser does not reuse a stale PostgREST response.
 */
import { createSupabaseBrowserClientNoStore } from '@/lib/supabase/browser'
import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'

function siteConfigSupabase() {
  return createSupabaseBrowserClientNoStore()
}

function resolvePublicSiteConfigUrl(): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
  if (base) {
    return `${base}/api/site-config/public`
  }
  return '/api/site-config/public'
}

/** Legacy: Zustand가 localStorage에 쓴 문자열을 그대로 upsert할 때 사용 */
let saveTimer: ReturnType<typeof setTimeout> | undefined
let pendingSerialized: string | undefined

/** 스토어 partialize 객체를 직접 upsert할 때 사용 (권장 경로) */
let stateTimer: ReturnType<typeof setTimeout> | undefined
let pendingState: Record<string, unknown> | undefined

let flushHandlersInstalled = false

const DEBOUNCE_MS = 400

type SiteConfigWriteStatus =
  | { kind: 'idle' }
  | { kind: 'saving'; source: 'state' | 'string' }
  | { kind: 'saved'; source: 'state' | 'string'; at: number }
  | { kind: 'error'; source: 'state' | 'string'; at: number; message: string }

let lastStatus: SiteConfigWriteStatus = { kind: 'idle' }

function emitStatus(next: SiteConfigWriteStatus) {
  lastStatus = next
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('site-config-write-status', { detail: next }))
  } catch {
    // ignore
  }
}

export function getLastSiteConfigWriteStatus(): SiteConfigWriteStatus {
  return lastStatus
}

/**
 * Persists the Zustand persist payload (JSON string of `{ state, version }`) to Supabase.
 * Prefer `scheduleSiteConfigStateUpsert` / `SiteConfigStoreAutosave`; kept for manual/legacy callers.
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
  }, DEBOUNCE_MS)
}

/**
 * partialize된 CMS state 객체를 Supabase에 저장 (스토어 subscribe 경로).
 * localStorage 디바운스/누락과 무관하게 동일 페이로드를 보냅니다.
 */
export function scheduleSiteConfigStateUpsert(state: Record<string, unknown>): void {
  pendingState = state
  installFlushHandlersOnce()
  clearTimeout(stateTimer)
  stateTimer = setTimeout(() => {
    const s = pendingState
    pendingState = undefined
    if (!s) return
    void upsertSiteConfigValue(s)
  }, DEBOUNCE_MS)
}

/** 디바운스 없이 즉시 Supabase에 반영 (백업 가져오기 등) */
export function persistSiteConfigPayloadNow(serialized: string): Promise<void> {
  pendingSerialized = undefined
  clearTimeout(saveTimer)
  saveTimer = undefined
  return pushPersistStringToSupabase(serialized)
}

export function persistSiteConfigStateNow(state: Record<string, unknown>): Promise<void> {
  pendingState = undefined
  clearTimeout(stateTimer)
  stateTimer = undefined
  return upsertSiteConfigValue(state)
}

/**
 * 페이지 이탈/백그라운드 전환 시 디바운스 저장이 유실되지 않도록 즉시 플러시합니다.
 */
export function flushPendingSiteConfigPersist(): void {
  clearTimeout(saveTimer)
  saveTimer = undefined
  const payload = pendingSerialized
  pendingSerialized = undefined
  if (!payload) return
  void pushPersistStringToSupabase(payload)
}

export function flushPendingSiteConfigState(): void {
  clearTimeout(stateTimer)
  stateTimer = undefined
  const s = pendingState
  pendingState = undefined
  if (!s) return
  void upsertSiteConfigValue(s)
}

function flushAllPendingSiteConfigWrites(): void {
  flushPendingSiteConfigPersist()
  flushPendingSiteConfigState()
}

function installFlushHandlersOnce(): void {
  if (flushHandlersInstalled) return
  if (typeof window === 'undefined') return
  flushHandlersInstalled = true

  window.addEventListener('pagehide', () => flushAllPendingSiteConfigWrites())
  window.addEventListener('beforeunload', () => flushAllPendingSiteConfigWrites())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAllPendingSiteConfigWrites()
  })
}

async function upsertSiteConfigValue(state: Record<string, unknown>): Promise<void> {
  emitStatus({ kind: 'saving', source: 'state' })
  try {
    const supabase = siteConfigSupabase()
    const { data, error } = await supabase
      .from('site_configs')
      .upsert(
        {
          config_key: STOREFRONT_CMS_CONFIG_KEY,
          value: state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'config_key' }
      )
      .select('config_key')
      .maybeSingle()
    if (error) {
      console.error('[siteConfig] Supabase upsert failed:', error)
      emitStatus({ kind: 'error', source: 'state', at: Date.now(), message: error.message })
      return
    }
    if (!data?.config_key) {
      console.error(
        '[siteConfig] upsert reported success but no row returned — table site_configs, RLS, or project URL/key를 확인하세요.'
      )
      emitStatus({
        kind: 'error',
        source: 'state',
        at: Date.now(),
        message: '저장 응답에 행이 없습니다. Supabase site_configs·RLS·환경변수를 확인하세요.',
      })
      return
    }
    emitStatus({ kind: 'saved', source: 'state', at: Date.now() })
  } catch (e) {
    console.error('[siteConfig] upsert error', e)
    emitStatus({
      kind: 'error',
      source: 'state',
      at: Date.now(),
      message: e instanceof Error ? e.message : 'Unknown error',
    })
  }
}

async function pushPersistStringToSupabase(serialized: string): Promise<void> {
  emitStatus({ kind: 'saving', source: 'string' })
  try {
    const parsed = JSON.parse(serialized) as { state?: Record<string, unknown>; version?: number }
    const state = parsed.state
    if (!state || typeof state !== 'object') return
    await upsertSiteConfigValue(state as Record<string, unknown>)
  } catch (e) {
    console.error('[siteConfig] upsert error', e)
    emitStatus({
      kind: 'error',
      source: 'string',
      at: Date.now(),
      message: e instanceof Error ? e.message : 'Unknown error',
    })
  }
}

/** Load raw value JSON from Supabase (same shape as persist `state` object). */
export async function fetchSiteConfigValue(): Promise<Record<string, unknown> | null> {
  // Primary path: same-origin server route (service-role read). This is most stable on iPad Safari.
  if (typeof window !== 'undefined') {
    try {
      const controller = new AbortController()
      // Slow tablet / LAN dev: 5.5s aborted too many good responses and left stale localStorage visible.
      const timeout = window.setTimeout(() => controller.abort(), 12_000)
      const res = await fetch(`${resolvePublicSiteConfigUrl()}?cb=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      window.clearTimeout(timeout)
      if (res.ok) {
        const body = (await res.json()) as { success?: boolean; value?: unknown }
        if (body?.success) {
          if (body.value && typeof body.value === 'object' && !Array.isArray(body.value)) {
            return body.value as Record<string, unknown>
          }
          // Empty row is still a successful canonical fetch; use empty object instead of "not fetched".
          if (body.value == null) {
            return {}
          }
        }
      }
    } catch (e) {
      console.warn('[siteConfig] public route fetch error', e)
    }
  }

  // Fallback: direct browser Supabase read.
  try {
    const supabase = siteConfigSupabase()
    const { data, error } = await supabase
      .from('site_configs')
      .select('value')
      .eq('config_key', STOREFRONT_CMS_CONFIG_KEY)
      .maybeSingle()

    if (error) {
      console.warn('[siteConfig] direct fetch:', error.message)
      return null
    }
    const rawValue = data?.value
    if (!rawValue) return {}

    let raw: Record<string, unknown> | null = null
    if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      raw = rawValue as Record<string, unknown>
    } else if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          raw = parsed as Record<string, unknown>
        }
      } catch {
        raw = null
      }
    }
    if (!raw) return null
    // Legacy rows may store persist shape `{ state: { ... } }`; canonical CMS is the inner object.
    const inner = raw.state
    return inner && typeof inner === 'object' && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : raw
  } catch (e) {
    console.warn('[siteConfig] direct fetch error', e)
  }

  return null
}
