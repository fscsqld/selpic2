/**
 * Dev HMR / first compile / tab sleep often abort same-origin fetch with
 * TypeError "Failed to fetch" or AbortError — not a real CMS/auth failure.
 * Cousins: wrong host/port, server down, logout mid-flush.
 */
export function isTransientSiteConfigNetworkError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const name = 'name' in e ? String((e as { name?: string }).name || '') : ''
  if (name === 'AbortError') return true
  const message = 'message' in e ? String((e as { message?: string }).message || '') : ''
  if (/failed to fetch/i.test(message)) return true
  if (/networkerror/i.test(message)) return true
  if (/load failed/i.test(message)) return true
  if (/fetch failed/i.test(message)) return true
  return false
}
