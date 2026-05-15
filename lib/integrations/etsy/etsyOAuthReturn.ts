/** Cookie set during Etsy OAuth start; read on callback for admin return navigation. */
export const ETSY_OAUTH_RETURN_COOKIE = 'etsy_oauth_return_to' as const

const ALLOWED_RETURN_PATHS = new Set([
  '/admin/dashboard',
  '/admin/orders',
  '/admin/integrations',
])

/** Whitelist admin paths only — prevents open redirects after OAuth. */
export function sanitizeEtsyOAuthReturnPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '/admin/integrations'
  const path = raw.startsWith('/') ? raw.split('?')[0]?.split('#')[0] ?? '' : ''
  if (!path.startsWith('/admin/')) return '/admin/integrations'
  if (!ALLOWED_RETURN_PATHS.has(path)) return '/admin/integrations'
  return path
}
