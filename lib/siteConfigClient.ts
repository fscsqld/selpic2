'use client'

/**
 * CMS reads: same-origin `/api/site-config/public` (service role) with a direct Supabase fallback.
 * CMS writes: same-origin `/api/admin/site-config` (admin session + service role). Do not upsert
 * `site_configs` from the browser — RLS blocks anon and legacy local admin has no JWT.
 */
import { createSupabaseBrowserClientNoStore } from '@/lib/supabase/browser'
import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'
import { scheduleLogAdminActivityThrottled } from '@/lib/loadLogAdminActivity'
import { unwrapSiteConfigValue } from '@/lib/siteConfigWritePayload'

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

/** False after logout / outside authenticated admin — skip schedule/flush so 401 is not shown on login. */
let cloudWritesAllowed = false

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

/** Drop debounced payloads without calling the API (logout / leave admin). */
export function cancelPendingSiteConfigWrites(): void {
  clearTimeout(saveTimer)
  saveTimer = undefined
  pendingSerialized = undefined
  clearTimeout(stateTimer)
  stateTimer = undefined
  pendingState = undefined
}

export function resetSiteConfigWriteStatus(): void {
  emitStatus({ kind: 'idle' })
}

/**
 * Gate for CMS cloud upserts. Call with false on admin logout before signOut so
 * template remount / pagehide flushes do not POST with a dead session.
 */
export function setSiteConfigCloudWritesAllowed(allowed: boolean): void {
  cloudWritesAllowed = allowed
  if (!allowed) {
    cancelPendingSiteConfigWrites()
    resetSiteConfigWriteStatus()
  }
}

export function areSiteConfigCloudWritesAllowed(): boolean {
  return cloudWritesAllowed
}

/**
 * Persists the Zustand persist payload (JSON string of `{ state, version }`) to Supabase.
 * Prefer `scheduleSiteConfigStateUpsert` / `SiteConfigStoreAutosave`; kept for manual/legacy callers.
 */
export function scheduleSiteConfigPersistString(serialized: string): void {
  if (!cloudWritesAllowed) return
  pendingSerialized = serialized
  installFlushHandlersOnce()
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const payload = pendingSerialized
    pendingSerialized = undefined
    if (!payload || !cloudWritesAllowed) return
    void pushPersistStringToSupabase(payload).catch(() => {})
  }, DEBOUNCE_MS)
}

/**
 * partialize된 CMS state 객체를 Supabase에 저장 (스토어 subscribe 경로).
 * localStorage 디바운스/누락과 무관하게 동일 페이로드를 보냅니다.
 */
export function scheduleSiteConfigStateUpsert(state: Record<string, unknown>): void {
  if (!cloudWritesAllowed) return
  pendingState = state
  installFlushHandlersOnce()
  clearTimeout(stateTimer)
  stateTimer = setTimeout(() => {
    const s = pendingState
    pendingState = undefined
    if (!s || !cloudWritesAllowed) return
    void upsertSiteConfigValue(s).catch(() => {})
  }, DEBOUNCE_MS)
}

/** 디바운스 없이 즉시 Supabase에 반영 (백업 가져오기 등) */
export function persistSiteConfigPayloadNow(serialized: string): Promise<void> {
  if (!cloudWritesAllowed) return Promise.resolve()
  pendingSerialized = undefined
  clearTimeout(saveTimer)
  saveTimer = undefined
  return pushPersistStringToSupabase(serialized)
}

export function persistSiteConfigStateNow(state: Record<string, unknown>): Promise<void> {
  if (!cloudWritesAllowed) return Promise.resolve()
  pendingState = undefined
  clearTimeout(stateTimer)
  stateTimer = undefined
  return upsertSiteConfigValue(state)
}

/**
 * 페이지 이탈/백그라운드 전환 시 디바운스 저장이 유실되지 않도록 즉시 플러시합니다.
 */
export function flushPendingSiteConfigPersist(): void {
  if (!cloudWritesAllowed) {
    cancelPendingSiteConfigWrites()
    return
  }
  clearTimeout(saveTimer)
  saveTimer = undefined
  const payload = pendingSerialized
  pendingSerialized = undefined
  if (!payload) return
  void pushPersistStringToSupabase(payload).catch(() => {})
}

export function flushPendingSiteConfigState(): void {
  if (!cloudWritesAllowed) {
    cancelPendingSiteConfigWrites()
    return
  }
  clearTimeout(stateTimer)
  stateTimer = undefined
  const s = pendingState
  pendingState = undefined
  if (!s) return
  void upsertSiteConfigValue(s).catch(() => {})
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
  if (!cloudWritesAllowed) return
  emitStatus({ kind: 'saving', source: 'state' })
  const value = unwrapSiteConfigValue(state)
  if (!value) {
    const message = 'CMS payload must be a JSON object.'
    emitStatus({ kind: 'error', source: 'state', at: Date.now(), message })
    throw new Error(message)
  }
  try {
    const res = await fetch('/api/admin/site-config', {
      method: 'PUT',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    const body = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null
    if (!res.ok || !body?.success) {
      const message =
        (typeof body?.message === 'string' && body.message.trim()) ||
        (res.status === 401
          ? 'Sign in with a Supabase admin email. Legacy local admin cannot save CMS.'
          : `Cloud save failed (${res.status})`)
      console.error('[siteConfig] admin upsert failed:', res.status, body)
      emitStatus({ kind: 'error', source: 'state', at: Date.now(), message })
      throw new Error(message)
    }
    emitStatus({ kind: 'saved', source: 'state', at: Date.now() })
    scheduleLogAdminActivityThrottled('cms-blob:storefront_cms', {
      action: 'cms_content_updated',
      target: STOREFRONT_CMS_CONFIG_KEY,
      description: 'Saved storefront CMS snapshot to site_configs',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    if (getLastSiteConfigWriteStatus().kind !== 'error') {
      console.error('[siteConfig] upsert error', e)
      emitStatus({ kind: 'error', source: 'state', at: Date.now(), message })
    }
    throw e instanceof Error ? e : new Error(message)
  }
}

async function pushPersistStringToSupabase(serialized: string): Promise<void> {
  if (!cloudWritesAllowed) return
  emitStatus({ kind: 'saving', source: 'string' })
  try {
    const parsed = JSON.parse(serialized) as { state?: Record<string, unknown>; version?: number }
    const state = parsed.state
    if (!state || typeof state !== 'object') return
    await upsertSiteConfigValue(state as Record<string, unknown>)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[siteConfig] upsert error', e)
    emitStatus({
      kind: 'error',
      source: 'string',
      at: Date.now(),
      message,
    })
    throw e instanceof Error ? e : new Error(message)
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
            return unwrapSiteConfigValue(body.value) ?? {}
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
    return unwrapSiteConfigValue(rawValue)
  } catch (e) {
    console.warn('[siteConfig] direct fetch error', e)
  }

  return null
}
