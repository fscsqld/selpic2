/**
 * Site Review finding status + display order (S2).
 */

import type { SiteReviewFinding, SiteReviewFindingStatus } from './types'

const MARKABLE: ReadonlySet<SiteReviewFindingStatus> = new Set([
  'fixed',
  'accepted',
  'wontfix',
])

/** Statuses an admin may set via Mark fixed / accepted / wontfix. */
export function isMarkableFindingStatus(status: string): status is SiteReviewFindingStatus {
  return MARKABLE.has(status as SiteReviewFindingStatus)
}

/**
 * Allow HITL status change from actionable rows.
 * Cousins: already-accepted → fixed (re-open path via recheck only); empty id; stale status strings.
 */
export function canMarkFindingStatus(
  current: SiteReviewFindingStatus,
  next: SiteReviewFindingStatus
): boolean {
  if (!isMarkableFindingStatus(next)) return false
  return (
    current === 'open' ||
    current === 'regressed' ||
    current === 'fixed' ||
    current === 'accepted' ||
    current === 'wontfix'
  )
}

export function applyFindingStatus(
  finding: SiteReviewFinding,
  nextStatus: SiteReviewFindingStatus,
  nowIso = new Date().toISOString()
): SiteReviewFinding | null {
  if (!canMarkFindingStatus(finding.status, nextStatus)) return null
  return {
    ...finding,
    status: nextStatus,
    updatedAt: nowIso,
  }
}

/** Pass → fixed; fail after fixed/accepted → regressed; else open/regressed. */
export function resolveRecheckStatus(
  priorStatus: SiteReviewFindingStatus,
  stillFailing: boolean
): SiteReviewFindingStatus {
  if (!stillFailing) return 'fixed'
  if (priorStatus === 'fixed' || priorStatus === 'accepted') return 'regressed'
  if (priorStatus === 'regressed') return 'regressed'
  return 'open'
}

/** Sort key: regressed → open → error severity → newer updatedAt. */
export function findingSortRank(f: SiteReviewFinding): number {
  if (f.status === 'regressed') return 0
  if (f.status === 'open') return 1
  if (f.severity === 'error') return 2
  if (f.severity === 'warn') return 3
  if (f.status === 'fixed') return 4
  if (f.status === 'accepted') return 5
  return 6
}

export function sortSiteReviewFindings(findings: SiteReviewFinding[]): SiteReviewFinding[] {
  return [...findings].sort((a, b) => {
    const d = findingSortRank(a) - findingSortRank(b)
    if (d !== 0) return d
    return String(b.updatedAt).localeCompare(String(a.updatedAt))
  })
}
