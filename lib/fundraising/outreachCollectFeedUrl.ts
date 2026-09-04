/** SSRF-safe URL checks for licensed outreach collect feeds (https only). */

export function isBlockedOutreachCollectHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true
  if (h === 'metadata.google.internal') return true
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
  }
  return false
}

/** Validate collect feed URL: https only, no obvious SSRF targets. */
export function assertSafeOutreachCollectFeedUrl(
  raw: string
): { ok: true; url: URL } | { ok: false; error: string } {
  const s = String(raw || '').trim()
  if (!s) return { ok: false, error: 'Feed URL is empty.' }
  let url: URL
  try {
    url = new URL(s)
  } catch {
    return { ok: false, error: 'Feed URL is invalid.' }
  }
  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Feed URL must use https://' }
  }
  if (url.username || url.password) {
    return { ok: false, error: 'Feed URL must not embed username/password. Use an auth header instead.' }
  }
  if (isBlockedOutreachCollectHostname(url.hostname)) {
    return { ok: false, error: 'Feed host is not allowed.' }
  }
  return { ok: true, url }
}
