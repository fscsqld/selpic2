/**
 * Production browser security headers (storefront proxy).
 * Keep Next.js + Stripe + Supabase + Google Fonts (customize) working.
 *
 * Cousins: local/LAN hosts skip these; Trusted Types deferred (breaks many libs);
 * overly strict script-src without unsafe-inline breaks Next App Router.
 */

/** Lighthouse “effective CSP” needs XSS-relevant directives (default-src / script-src). */
export function buildProductionContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    // Next.js hydration + some vendor chunks still need inline/eval in practice.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' https: data: blob:",
    "font-src 'self' https: data:",
    "connect-src 'self' https: wss:",
    "media-src 'self' https: data: blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:",
    "frame-ancestors 'self'",
    // Prefer upgrade over block-all-mixed-content (fewer CSP console violations).
    'upgrade-insecure-requests',
  ]
  return directives.join('; ')
}

/** Safer than `same-origin` when Stripe/OAuth popups may open. */
export const CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'

export const CROSS_ORIGIN_RESOURCE_POLICY = 'same-site'
