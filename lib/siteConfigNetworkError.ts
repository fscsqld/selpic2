/**
 * Transient browser/server network failures for storefront CMS/catalog and admin Supabase.
 *
 * Chrome/Edge often log `net::ERR_NETWORK_IO_SUSPENDED` when a tab was backgrounded,
 * the laptop slept, or the page was frozen — then `visibilitychange` / poll wakes and
 * fires fetch while the network stack is still suspended. A follow-on direct Supabase
 * REST call then shows `net::ERR_ADDRESS_UNREACHABLE` (same outage, louder).
 *
 * Node/undici cousins: `TypeError: fetch failed` wrapping `ConnectTimeoutError`
 * (`UND_ERR_CONNECT_TIMEOUT`, default 10s connect to Cloudflare/Supabase), headers/body
 * timeouts, ECONNRESET, DNS blips. Walk `.cause` / AggregateError so the inner code is
 * not missed when the outer message is only `fetch failed`.
 *
 * Cousins: Failed to fetch, AbortError (timeout/Strict Mode), Wi‑Fi blips,
 * INTERNET_DISCONNECTED, CONNECTION_TIMED_OUT, DNS NAME_NOT_RESOLVED.
 */

const TRANSIENT_ERROR_NAMES = new Set([
  'AbortError',
  'ConnectTimeoutError',
  'TimeoutError',
  'HeadersTimeoutError',
  'BodyTimeoutError',
  'SocketError',
])

function collectErrorSignals(e: unknown, depth = 0): string {
  if (depth > 5 || e == null) return ''
  if (typeof e !== 'object') return String(e)
  const rec = e as {
    name?: unknown
    message?: unknown
    code?: unknown
    cause?: unknown
    errors?: unknown
  }
  const parts = [
    rec.name != null ? String(rec.name) : '',
    rec.message != null ? String(rec.message) : '',
    rec.code != null ? String(rec.code) : '',
  ]
  if (rec.cause) parts.push(collectErrorSignals(rec.cause, depth + 1))
  if (Array.isArray(rec.errors)) {
    for (const inner of rec.errors.slice(0, 4)) {
      parts.push(collectErrorSignals(inner, depth + 1))
    }
  }
  return parts.join(' ')
}

function looksLikeTransientNetworkBlob(blob: string): boolean {
  if (/failed to fetch/i.test(blob)) return true
  if (/networkerror/i.test(blob)) return true
  if (/load failed/i.test(blob)) return true
  if (/fetch failed/i.test(blob)) return true
  // Chromium net errors (sometimes copied into Error.message / cause)
  if (/NETWORK_IO_SUSPENDED/i.test(blob)) return true
  if (/ADDRESS_UNREACHABLE/i.test(blob)) return true
  if (/INTERNET_DISCONNECTED/i.test(blob)) return true
  if (/NAME_NOT_RESOLVED/i.test(blob)) return true
  if (/CONNECTION_TIMED_OUT/i.test(blob)) return true
  if (/CONNECTION_RESET/i.test(blob)) return true
  if (/CONNECTION_REFUSED/i.test(blob)) return true
  if (/ERR_NETWORK/i.test(blob)) return true
  if (/net::ERR_/i.test(blob)) return true
  // Node undici / syscall cousins (admin inbound, catalog, contact, newsletter)
  if (/connect timeout/i.test(blob)) return true
  if (/UND_ERR_CONNECT_TIMEOUT/i.test(blob)) return true
  if (/UND_ERR_HEADERS_TIMEOUT/i.test(blob)) return true
  if (/UND_ERR_BODY_TIMEOUT/i.test(blob)) return true
  if (/UND_ERR_SOCKET/i.test(blob)) return true
  if (/\bETIMEDOUT\b/i.test(blob)) return true
  if (/\bECONNRESET\b/i.test(blob)) return true
  if (/\bENOTFOUND\b/i.test(blob)) return true
  if (/\bEAI_AGAIN\b/i.test(blob)) return true
  if (/\bEHOSTUNREACH\b/i.test(blob)) return true
  if (/\bEPIPE\b/i.test(blob)) return true
  if (/socket hang up/i.test(blob)) return true
  return false
}

export function isBrowserLikelyOffline(): boolean {
  if (typeof navigator === 'undefined') return false
  // Only trust explicit offline — `true` can still mean "stack waking up".
  return navigator.onLine === false
}

/** Short pause after tab becomes visible so Chrome can unsuspend sockets. */
export function waitForNetworkWake(ms = 400): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }
    window.setTimeout(resolve, ms)
  })
}

export function isTransientSiteConfigNetworkError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const name = 'name' in e ? String((e as { name?: string }).name || '') : ''
  if (TRANSIENT_ERROR_NAMES.has(name)) return true
  const blob = collectErrorSignals(e)
  if (!blob.trim()) return false
  return looksLikeTransientNetworkBlob(blob)
}
