/**
 * Storefront smoke re-check helpers (no DB imports — unit-test friendly).
 */

import { STOREFRONT_SMOKE_CHECKS } from './storefrontSmokeChecklist'
import { resolvePublicSiteOrigin } from './publicOrigin'
import type { SiteReviewFinding } from './types'

export function parseStorefrontSmokePath(fingerprint: string): string | null {
  const fp = fingerprint.trim().toLowerCase()
  for (const check of STOREFRONT_SMOKE_CHECKS) {
    const expected = `storefront_smoke|${check.id}|${check.path}`.toLowerCase()
    if (fp === expected) return check.path
  }
  const parts = fp.split('|')
  if (parts[0] === 'storefront_smoke' && parts.length >= 3) {
    return parts.slice(2).join('|') || null
  }
  return null
}

export async function evaluateStorefrontSmoke(
  finding: SiteReviewFinding,
  opts: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch }
): Promise<{ stillFailing: boolean; detail: string; evidence: string }> {
  const origin = resolvePublicSiteOrigin(opts.env)
  const fetchImpl = opts.fetchImpl ?? fetch
  const path = parseStorefrontSmokePath(finding.fingerprint)
  if (!path) {
    return {
      stillFailing: true,
      detail: 'Unknown storefront smoke fingerprint — cannot re-check.',
      evidence: `fingerprint=${finding.fingerprint}`,
    }
  }

  const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { Accept: 'text/html,application/json,*/*' },
    })
    const status = res.status
    const ok = status >= 200 && status < 400
    return {
      stillFailing: !ok,
      detail: ok
        ? `Re-check OK · GET ${origin}${path} → ${status}`
        : `Re-check failed · GET ${origin}${path} → ${status}`,
      evidence: `origin=${origin}; path=${path}; status=${status}`,
    }
  } catch (e) {
    return {
      stillFailing: true,
      detail: `Re-check failed · GET ${origin}${path} (${
        e instanceof Error ? e.message : 'Request failed'
      })`,
      evidence: `origin=${origin}; path=${path}; status=0`,
    }
  } finally {
    clearTimeout(timer)
  }
}
