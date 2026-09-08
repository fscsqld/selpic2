/**
 * S2 — mark status, sort order, recheck outcome + storefront smoke evaluate.
 */

import { describe, expect, it } from 'vitest'
import {
  applyFindingStatus,
  canMarkFindingStatus,
  resolveRecheckStatus,
  sortSiteReviewFindings,
} from './findingStatus'
import { evaluateStorefrontSmoke } from './recheckStorefrontSmoke'
import type { SiteReviewFinding } from './types'

function baseFinding(over: Partial<SiteReviewFinding> = {}): SiteReviewFinding {
  return {
    id: 'f1',
    fingerprint: 'storefront_smoke|home|/',
    sector: 'storefront',
    kind: 'storefront_smoke',
    severity: 'error',
    status: 'open',
    title: 'Homepage smoke failed',
    trigger: 'manual',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  }
}

describe('applyFindingStatus', () => {
  it('marks open → fixed', () => {
    const next = applyFindingStatus(baseFinding(), 'fixed', '2026-09-08T00:00:00.000Z')
    expect(next?.status).toBe('fixed')
    expect(next?.updatedAt).toBe('2026-09-08T00:00:00.000Z')
  })

  it('rejects unknown mark status', () => {
    expect(canMarkFindingStatus('open', 'open')).toBe(false)
  })
})

describe('sortSiteReviewFindings', () => {
  it('puts regressed and open before fixed', () => {
    const sorted = sortSiteReviewFindings([
      baseFinding({ id: 'a', status: 'fixed', updatedAt: '2026-09-08T01:00:00.000Z' }),
      baseFinding({ id: 'b', status: 'regressed', updatedAt: '2026-09-08T00:00:00.000Z' }),
      baseFinding({ id: 'c', status: 'open', updatedAt: '2026-09-08T00:30:00.000Z' }),
    ])
    expect(sorted.map((f) => f.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('resolveRecheckStatus', () => {
  it('pass → fixed', () => {
    expect(resolveRecheckStatus('open', false)).toBe('fixed')
    expect(resolveRecheckStatus('regressed', false)).toBe('fixed')
  })

  it('fail after fixed → regressed', () => {
    expect(resolveRecheckStatus('fixed', true)).toBe('regressed')
    expect(resolveRecheckStatus('accepted', true)).toBe('regressed')
  })

  it('fail while open stays open', () => {
    expect(resolveRecheckStatus('open', true)).toBe('open')
  })
})

describe('evaluateStorefrontSmoke', () => {
  it('stillFailing false on 200', async () => {
    const result = await evaluateStorefrontSmoke(baseFinding({ status: 'fixed' }), {
      env: { NEXT_PUBLIC_SITE_URL: 'https://example.test' },
      fetchImpl: (async () =>
        new Response('ok', { status: 200 })) as unknown as typeof fetch,
    })
    expect(result.stillFailing).toBe(false)
    expect(resolveRecheckStatus('fixed', result.stillFailing)).toBe('fixed')
  })

  it('stillFailing true on 500 → regressed after fixed', async () => {
    const result = await evaluateStorefrontSmoke(baseFinding({ status: 'fixed' }), {
      env: { NEXT_PUBLIC_SITE_URL: 'https://example.test' },
      fetchImpl: (async () =>
        new Response('nope', { status: 500 })) as unknown as typeof fetch,
    })
    expect(result.stillFailing).toBe(true)
    expect(resolveRecheckStatus('fixed', result.stillFailing)).toBe('regressed')
  })
})
