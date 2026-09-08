/**
 * Wave 4.5 Site Review S0 — fingerprint + incremental filter tests.
 */

import { describe, expect, it } from 'vitest'
import {
  buildSiteReviewFingerprint,
  STOREFRONT_SMOKE_CHECKS,
  storefrontSmokeFingerprint,
} from './storefrontSmokeChecklist'
import {
  mergeFindingByFingerprint,
  selectFindingsForIncrementalDeepRecheck,
  markFindingRegressed,
} from './findings'
import { isSiteReviewPeriodKey, siteReviewPeriodKey } from './periodKey'
import type { SiteReviewFinding } from './types'
import { AGENT_SITE_REVIEW_CONFIG_KEY } from '../../siteConfigConstants'

function baseFinding(
  overrides: Partial<SiteReviewFinding> & Pick<SiteReviewFinding, 'fingerprint' | 'status'>
): SiteReviewFinding {
  return {
    id: overrides.id || overrides.fingerprint,
    fingerprint: overrides.fingerprint,
    sector: overrides.sector || 'storefront',
    kind: overrides.kind || 'storefront_smoke',
    severity: overrides.severity || 'warn',
    status: overrides.status,
    title: overrides.title || 'Test',
    trigger: overrides.trigger || 'quarterly',
    createdAt: overrides.createdAt || '2026-07-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-07-01T00:00:00.000Z',
    deepLink: overrides.deepLink,
    detail: overrides.detail,
    evidence: overrides.evidence,
  }
}

describe('storefront smoke checklist', () => {
  it('includes homepage as critical read-only smoke', () => {
    const home = STOREFRONT_SMOKE_CHECKS.find((c) => c.id === 'home')
    expect(home?.path).toBe('/')
    expect(home?.critical).toBe(true)
  })

  it('builds stable fingerprints for the same check', () => {
    const a = storefrontSmokeFingerprint('home', '/')
    const b = storefrontSmokeFingerprint('home', '/')
    expect(a).toBe(b)
    expect(a).toContain('storefront_smoke')
  })
})

describe('buildSiteReviewFingerprint', () => {
  it('is order-stable and case-insensitive', () => {
    expect(buildSiteReviewFingerprint(['Home', ' / '])).toBe(
      buildSiteReviewFingerprint(['home', '/'])
    )
  })

  it('drops empty parts', () => {
    expect(buildSiteReviewFingerprint(['a', '', null, 'b'])).toBe('a|b')
  })
})

describe('incremental deep re-check filter', () => {
  it('keeps only open and regressed', () => {
    const findings = [
      baseFinding({ fingerprint: 'f1', status: 'open' }),
      baseFinding({ fingerprint: 'f2', status: 'fixed' }),
      baseFinding({ fingerprint: 'f3', status: 'regressed' }),
      baseFinding({ fingerprint: 'f4', status: 'accepted' }),
      baseFinding({ fingerprint: 'f5', status: 'wontfix' }),
    ]
    const deep = selectFindingsForIncrementalDeepRecheck(findings)
    expect(deep.map((f) => f.fingerprint).sort()).toEqual(['f1', 'f3'])
  })

  it('returns empty when baseline is all fixed', () => {
    expect(
      selectFindingsForIncrementalDeepRecheck([
        baseFinding({ fingerprint: 'x', status: 'fixed' }),
      ])
    ).toEqual([])
  })
})

describe('mergeFindingByFingerprint', () => {
  it('creates open finding when no prior', () => {
    const f = mergeFindingByFingerprint({
      nextDraft: {
        fingerprint: 'storefront_smoke|home|/',
        sector: 'storefront',
        kind: 'storefront_smoke',
        severity: 'error',
        title: 'Homepage smoke failed',
        trigger: 'quarterly',
      },
      nowIso: '2026-09-08T00:00:00.000Z',
    })
    expect(f.status).toBe('open')
    expect(f.fingerprint).toBe('storefront_smoke|home|/')
  })

  it('marks regressed when prior fixed still failing', () => {
    const prior = baseFinding({ fingerprint: 'f1', status: 'fixed' })
    const f = mergeFindingByFingerprint({
      prior,
      stillFailing: true,
      nextDraft: {
        fingerprint: 'f1',
        sector: 'storefront',
        kind: 'storefront_smoke',
        severity: 'error',
        title: 'Homepage smoke failed',
        trigger: 'error_recheck',
      },
    })
    expect(f.status).toBe('regressed')
    expect(f.id).toBe(prior.id)
  })
})

describe('markFindingRegressed', () => {
  it('sets regressed + error_recheck trigger', () => {
    const f = markFindingRegressed(
      baseFinding({ fingerprint: 'f1', status: 'fixed' }),
      '2026-09-08T12:00:00.000Z'
    )
    expect(f.status).toBe('regressed')
    expect(f.trigger).toBe('error_recheck')
    expect(f.updatedAt).toBe('2026-09-08T12:00:00.000Z')
  })
})

describe('periodKey', () => {
  it('formats AU FY quarter key', () => {
    // 15 Aug 2025 Sydney → FY2025-26 Q1
    const key = siteReviewPeriodKey(new Date('2025-08-15T02:00:00.000Z'))
    expect(isSiteReviewPeriodKey(key)).toBe(true)
    expect(key).toMatch(/^FY\d{4}-\d{2}-Q[1-4]$/)
  })
})

describe('config key', () => {
  it('uses dedicated site_configs key', () => {
    expect(AGENT_SITE_REVIEW_CONFIG_KEY).toBe('agent_site_review_reports')
  })
})
