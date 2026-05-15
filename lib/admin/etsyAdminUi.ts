import { sanitizeEtsyOAuthReturnPath } from '@/lib/integrations/etsy/etsyOAuthReturn'

/** Start Etsy OAuth; after approval the seller returns to `returnPath` (admin routes only). */
export function startEtsyOAuth(returnPath?: string): void {
  if (typeof window === 'undefined') return
  const path = sanitizeEtsyOAuthReturnPath(returnPath ?? window.location.pathname)
  window.location.href = `/api/admin/integrations/etsy/oauth/start?returnTo=${encodeURIComponent(path)}`
}

export function stripEtsyOAuthSearchParams(): void {
  if (typeof window === 'undefined') return
  const u = new URL(window.location.href)
  ;['etsy', 'detail', 'reason'].forEach((k) => u.searchParams.delete(k))
  const q = u.searchParams.toString()
  window.history.replaceState({}, '', u.pathname + (q ? `?${q}` : ''))
}

export function etsyOAuthBannerMessage(etsy: string, detail: string | null): string {
  if (etsy === 'connected') return 'Etsy connected successfully.'
  if (etsy === 'denied') return 'Etsy authorization was cancelled or denied.'
  if (etsy === 'invalid_state') return 'OAuth state mismatch — try connecting again.'
  if (etsy === 'error') {
    return detail ? `Etsy error: ${decodeURIComponent(detail)}` : 'Etsy connection failed.'
  }
  if (etsy === 'missing_env') return 'Server missing Etsy OAuth environment variables.'
  if (etsy === 'missing_secret')
    return 'Server missing ETSY_CLIENT_SECRET — Open API needs x-api-key as KEYSTRING:SHARED_SECRET.'
  if (etsy === 'no_db') return 'Supabase is not configured.'
  return ''
}

export async function runEtsyOrderSync(): Promise<{
  ok: boolean
  imported?: number
  scanned?: number
  sinceDays?: number
  error?: string
}> {
  const res = await fetch('/api/admin/integrations/etsy/sync', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sinceDays: 90, openOnly: true }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    imported?: number
    scanned?: number
    sinceDays?: number
    error?: string
  }
  if (!res.ok) {
    return { ok: false, error: typeof data.error === 'string' ? data.error : 'Sync failed.' }
  }
  return {
    ok: true,
    imported: data.imported,
    scanned: data.scanned,
    sinceDays: data.sinceDays,
  }
}

export function formatEtsySyncSuccessMessage(imported?: number, scanned?: number, sinceDays?: number): string {
  return `Imported ${imported ?? 0} open paid receipt(s) (${scanned ?? 0} scanned, last ${sinceDays ?? 90} days).`
}
