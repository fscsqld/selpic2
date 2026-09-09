/**
 * Map Performance coach opportunities → Site Review findings (S4).
 * Deep-links reuse each card's href — HITL only, no auto actions.
 */

import type { PerformanceOpportunity } from '@/lib/agent/performanceCoachBuild'
import type { SiteReviewFinding, SiteReviewSeverity, SiteReviewTrigger } from './types'
import { buildSiteReviewFingerprint } from './storefrontSmokeChecklist'

export const PERFORMANCE_FINDING_CAP = 12

export function performanceOpportunityFingerprint(opportunityId: string): string {
  return buildSiteReviewFingerprint(['catalog_heuristic', 'performance', opportunityId])
}

export function mapOpportunitySeverity(
  severity: PerformanceOpportunity['severity']
): SiteReviewSeverity {
  if (severity === 'high') return 'error'
  if (severity === 'medium') return 'warn'
  return 'info'
}

/**
 * Build draft findings from Performance cards.
 * Prefer site_upgrade first, then ops — cap to avoid report noise.
 */
export function buildFindingsFromPerformanceOpportunities(
  opportunities: PerformanceOpportunity[],
  opts: {
    trigger: SiteReviewTrigger
    nowIso: string
    priorByFingerprint: Map<string, SiteReviewFinding>
    merge: (args: {
      prior?: SiteReviewFinding
      nowIso: string
      nextDraft: Omit<SiteReviewFinding, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: string
        status?: SiteReviewFinding['status']
      }
    }) => SiteReviewFinding
  }
): SiteReviewFinding[] {
  const ranked = [...opportunities].sort((a, b) => {
    const rank = (k: PerformanceOpportunity['kind']) => (k === 'site_upgrade' ? 0 : 1)
    const d = rank(a.kind) - rank(b.kind)
    if (d !== 0) return d
    const sev = { high: 0, medium: 1, low: 2 } as const
    return sev[a.severity] - sev[b.severity]
  })

  const out: SiteReviewFinding[] = []
  for (const opp of ranked.slice(0, PERFORMANCE_FINDING_CAP)) {
    const fp = performanceOpportunityFingerprint(opp.id)
    out.push(
      opts.merge({
        prior: opts.priorByFingerprint.get(fp.toLowerCase()),
        nowIso: opts.nowIso,
        nextDraft: {
          fingerprint: fp,
          sector: 'performance',
          kind: 'catalog_heuristic',
          severity: mapOpportunitySeverity(opp.severity),
          title: opp.title,
          detail: [opp.summary, opp.metric].filter(Boolean).join(' · '),
          evidence: `performance_id=${opp.id}; kind=${opp.kind}; href=${opp.href}`,
          deepLink: opp.href || '/admin/agent/performance',
          trigger: opts.trigger,
          status: 'open',
        },
      })
    )
  }
  return out
}

/** True when this opportunity id is still present in the latest coach list. */
export function performanceOpportunityStillOpen(
  fingerprint: string,
  opportunities: PerformanceOpportunity[]
): boolean {
  const fp = fingerprint.trim().toLowerCase()
  return opportunities.some(
    (o) => performanceOpportunityFingerprint(o.id).toLowerCase() === fp
  )
}
