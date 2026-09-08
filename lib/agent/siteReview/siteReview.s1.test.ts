/**
 * S1 extras — parse sectors + normalize snapshot.
 */

import { describe, expect, it } from 'vitest'
import { parseSiteReviewRunSectors } from './runSectors'
import { parseSiteReviewSnapshot } from './normalize'
import { resolvePublicSiteOrigin } from './publicOrigin'
import { mergeFindingByFingerprint } from './findings'

describe('parseSiteReviewRunSectors', () => {
  it('defaults to all sectors when empty', () => {
    expect(parseSiteReviewRunSectors([])).toContain('storefront')
    expect(parseSiteReviewRunSectors(null).length).toBeGreaterThan(3)
  })

  it('filters unknown ids', () => {
    expect(parseSiteReviewRunSectors(['storefront', 'nope', 'inbound'])).toEqual([
      'storefront',
      'inbound',
    ])
  })
})

describe('parseSiteReviewSnapshot', () => {
  it('returns empty on garbage', () => {
    expect(parseSiteReviewSnapshot('not-json')).toEqual({ updatedAt: '', reports: [] })
  })

  it('keeps a valid report', () => {
    const snap = parseSiteReviewSnapshot({
      updatedAt: '2026-09-08T00:00:00.000Z',
      reports: [
        {
          id: 'sr-1',
          periodKey: 'FY2025-26-Q1',
          trigger: 'manual',
          createdAt: '2026-09-08T00:00:00.000Z',
          updatedAt: '2026-09-08T00:00:00.000Z',
          incremental: false,
          findings: [
            {
              id: 'f1',
              fingerprint: 'a|b',
              sector: 'storefront',
              kind: 'storefront_smoke',
              severity: 'info',
              status: 'fixed',
              title: 'Homepage smoke OK',
              trigger: 'manual',
              createdAt: '2026-09-08T00:00:00.000Z',
              updatedAt: '2026-09-08T00:00:00.000Z',
            },
          ],
        },
      ],
    })
    expect(snap.reports).toHaveLength(1)
    expect(snap.reports[0].findings[0].fingerprint).toBe('a|b')
  })
})

describe('resolvePublicSiteOrigin', () => {
  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    expect(
      resolvePublicSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://www.selpic.com.au/' })
    ).toBe('https://www.selpic.com.au')
  })

  it('falls back to local storefront port', () => {
    expect(resolvePublicSiteOrigin({})).toBe('http://127.0.0.1:3005')
  })
})

describe('mergeFindingByFingerprint (S1 regress)', () => {
  it('marks fixed → regressed when still failing', () => {
    const prior = mergeFindingByFingerprint({
      nowIso: '2026-09-01T00:00:00.000Z',
      nextDraft: {
        fingerprint: 'smoke|home',
        sector: 'storefront',
        kind: 'storefront_smoke',
        severity: 'error',
        title: 'Home failed',
        trigger: 'manual',
        status: 'fixed',
      },
    })
    const next = mergeFindingByFingerprint({
      prior: { ...prior, status: 'fixed' },
      stillFailing: true,
      nowIso: '2026-09-08T00:00:00.000Z',
      nextDraft: {
        fingerprint: 'smoke|home',
        sector: 'storefront',
        kind: 'storefront_smoke',
        severity: 'error',
        title: 'Home failed',
        trigger: 'manual',
        status: 'open',
      },
    })
    expect(next.status).toBe('regressed')
    expect(next.id).toBe(prior.id)
  })

  it('keeps open when still failing without prior fixed', () => {
    const next = mergeFindingByFingerprint({
      stillFailing: true,
      nowIso: '2026-09-08T00:00:00.000Z',
      nextDraft: {
        fingerprint: 'smoke|shop',
        sector: 'storefront',
        kind: 'storefront_smoke',
        severity: 'warn',
        title: 'Shop failed',
        trigger: 'manual',
        status: 'open',
      },
    })
    expect(next.status).toBe('open')
  })
})
