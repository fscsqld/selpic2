/**
 * Transient browser network failures for storefront CMS/catalog sync.
 *
 * Chrome/Edge often log `net::ERR_NETWORK_IO_SUSPENDED` when a tab was backgrounded,
 * the laptop slept, or the page was frozen — then `visibilitychange` / poll wakes and
 * fires fetch while the network stack is still suspended. A follow-on direct Supabase
 * REST call then shows `net::ERR_ADDRESS_UNREACHABLE` (same outage, louder).
 *
 * Cousins: Failed to fetch, AbortError (timeout/Strict Mode), Wi‑Fi blips,
 * INTERNET_DISCONNECTED, CONNECTION_TIMED_OUT, DNS NAME_NOT_RESOLVED.
 */

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
  if (name === 'AbortError') return true
  const message = 'message' in e ? String((e as { message?: string }).message || '') : ''
  if (!message) return false
  if (/failed to fetch/i.test(message)) return true
  if (/networkerror/i.test(message)) return true
  if (/load failed/i.test(message)) return true
  if (/fetch failed/i.test(message)) return true
  // Chromium net errors (sometimes copied into Error.message / cause)
  if (/NETWORK_IO_SUSPENDED/i.test(message)) return true
  if (/ADDRESS_UNREACHABLE/i.test(message)) return true
  if (/INTERNET_DISCONNECTED/i.test(message)) return true
  if (/NAME_NOT_RESOLVED/i.test(message)) return true
  if (/CONNECTION_TIMED_OUT/i.test(message)) return true
  if (/CONNECTION_RESET/i.test(message)) return true
  if (/CONNECTION_REFUSED/i.test(message)) return true
  if (/ERR_NETWORK/i.test(message)) return true
  if (/net::ERR_/i.test(message)) return true
  return false
}
