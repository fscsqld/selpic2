/**
 * S4 — Performance deep-link findings + optional LLM summary parse.
 */

import { describe, expect, it } from 'vitest'
import {
  buildFindingsFromPerformanceOpportunities,
  mapOpportunitySeverity,
  performanceOpportunityFingerprint,
  performanceOpportunityStillOpen,
  PERFORMANCE_FINDING_CAP,
} from './performanceFindings'
import {
  composeReportSummary,
  parseSummaryParagraphJson,
  isSiteReviewSummaryLlmEnabled,
} from './summaryLlmParse'
import { mergeFindingByFingerprint } from './findings'
import type { PerformanceOpportunity } from '@/lib/agent/performanceCoachBuild'

function opp(
  over: Partial<PerformanceOpportunity> & Pick<PerformanceOpportunity, 'id' | 'title'>
): PerformanceOpportunity {
  return {
    severity: 'medium',
    kind: 'site_upgrade',
    summary: 'Do something HITL.',
    href: '/admin/products',
    actionLabel: 'Open',
    domain: 'products',
    ...over,
  }
}

const ALL_IDS: PerformanceOpportunity['id'][] = [
  'thin_product_copy',
  'weak_product_imagery',
  'traffic_up_conversion_flat',
  'revenue_week_down',
  'fundraising_stale_pending',
  'bank_transfer_pending',
  'inbound_queue_backlog',
  'community_drafts_pending',
  'fundraising_open_replies',
  'newsletter_idle',
]

describe('performanceFindings', () => {
  it('maps severity and builds deepLink fingerprint', () => {
    expect(mapOpportunitySeverity('high')).toBe('error')
    expect(performanceOpportunityFingerprint('thin_product_copy')).toContain('thin_product_copy')
  })

  it('builds findings with Performance href deep-links and respects cap', () => {
    const list = ALL_IDS.map((id) =>
      opp({
        id,
        title: id,
        kind:
          id === 'thin_product_copy' ||
          id === 'weak_product_imagery' ||
          id === 'traffic_up_conversion_flat' ||
          id === 'revenue_week_down'
            ? 'site_upgrade'
            : 'ops',
        href: id.includes('product') ? '/admin/products' : '/admin/agent/performance',
      })
    )
    expect(list.length).toBeLessThanOrEqual(PERFORMANCE_FINDING_CAP)

    const findings = buildFindingsFromPerformanceOpportunities(list, {
      trigger: 'manual',
      nowIso: '2026-09-08T00:00:00.000Z',
      priorByFingerprint: new Map(),
      merge: (args) =>
        mergeFindingByFingerprint({
          prior: args.prior,
          nowIso: args.nowIso,
          nextDraft: args.nextDraft,
        }),
    })
    expect(findings.length).toBe(list.length)
    expect(findings[0].kind).toBe('catalog_heuristic')
    expect(findings[0].deepLink).toMatch(/^\/admin\//)
    expect(findings[0].sector).toBe('performance')
  })

  it('detects still-open opportunity by fingerprint', () => {
    const fp = performanceOpportunityFingerprint('thin_product_copy')
    expect(
      performanceOpportunityStillOpen(fp, [opp({ id: 'thin_product_copy', title: 'Thin' })])
    ).toBe(true)
    expect(
      performanceOpportunityStillOpen(fp, [opp({ id: 'newsletter_idle', title: 'News' })])
    ).toBe(false)
  })
})

describe('summaryLlm', () => {
  it('parses valid summary JSON and rejects Hero rewrite language', () => {
    expect(
      parseSummaryParagraphJson(
        '{"summary":"Two storefront smoke gaps remain; review Performance cards next."}'
      )
    ).toMatch(/storefront/i)
    expect(
      parseSummaryParagraphJson(
        '{"summary":"Please rewrite hero and publish now today for launch."}'
      )
    ).toBeNull()
  })

  it('composes heuristic + optional LLM paragraph', () => {
    expect(composeReportSummary({ heuristic: 'Base line', llmParagraph: null })).toBe('Base line')
    expect(composeReportSummary({ heuristic: 'Base line', llmParagraph: 'Extra note.' })).toBe(
      'Base line\n\nExtra note.'
    )
  })

  it('respects summary LLM kill switch', () => {
    expect(isSiteReviewSummaryLlmEnabled({ OPENAI_API_KEY: 'sk-x' })).toBe(true)
    expect(
      isSiteReviewSummaryLlmEnabled({
        OPENAI_API_KEY: 'sk-x',
        AGENT_SITE_REVIEW_SUMMARY_LLM: '0',
      })
    ).toBe(false)
  })
})
