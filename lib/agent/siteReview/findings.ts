/**
 * Site Review finding helpers — fingerprint + incremental selection (S0).
 */

import type { SiteReviewFinding, SiteReviewFindingStatus } from './types'
import { buildSiteReviewFingerprint } from './storefrontSmokeChecklist'

export { buildSiteReviewFingerprint }

const DEEP_RECHECK: ReadonlySet<SiteReviewFindingStatus> = new Set(['open', 'regressed'])

/** Findings that must be deep-rechecked next quarterly/incremental run. */
export function isDeepRecheckStatus(status: SiteReviewFindingStatus): boolean {
  return DEEP_RECHECK.has(status)
}

/**
 * Incremental mode: keep open/regressed for deep work.
 * fixed / accepted / wontfix are excluded from the deep set (S1 may still cheap-smoke).
 */
export function selectFindingsForIncrementalDeepRecheck(
  findings: SiteReviewFinding[]
): SiteReviewFinding[] {
  return findings.filter((f) => isDeepRecheckStatus(f.status))
}

/**
 * When a re-check fails after Mark fixed, mark regressed (forced into next report body).
 */
export function markFindingRegressed(
  finding: SiteReviewFinding,
  nowIso = new Date().toISOString()
): SiteReviewFinding {
  return {
    ...finding,
    status: 'regressed',
    updatedAt: nowIso,
    trigger: 'error_recheck',
  }
}

/**
 * Merge prior baseline findings with new scan results by fingerprint.
 * - New fingerprint → open
 * - Prior open/regressed + still present → keep status (or stay open)
 * - Prior fixed + still failing evidence → regressed (caller passes stillFailing=true)
 * S0 only defines pure merge helpers; runners land in S1.
 */
export function mergeFindingByFingerprint(opts: {
  prior?: SiteReviewFinding
  nextDraft: Omit<SiteReviewFinding, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
    id?: string
    status?: SiteReviewFindingStatus
  }
  stillFailing?: boolean
  nowIso?: string
}): SiteReviewFinding {
  const now = opts.nowIso || new Date().toISOString()
  const prior = opts.prior
  const draft = opts.nextDraft
  const fingerprint =
    draft.fingerprint ||
    buildSiteReviewFingerprint([draft.kind, draft.sector, draft.title, draft.deepLink])

  if (!prior) {
    return {
      id: draft.id || fingerprint,
      fingerprint,
      sector: draft.sector,
      kind: draft.kind,
      severity: draft.severity,
      status: draft.status || 'open',
      title: draft.title,
      detail: draft.detail,
      deepLink: draft.deepLink,
      evidence: draft.evidence,
      trigger: draft.trigger,
      createdAt: now,
      updatedAt: now,
    }
  }

  let status: SiteReviewFindingStatus = prior.status
  if (opts.stillFailing && (prior.status === 'fixed' || prior.status === 'accepted')) {
    status = 'regressed'
  } else if (prior.status === 'fixed' || prior.status === 'accepted' || prior.status === 'wontfix') {
    status = prior.status
  } else {
    status = draft.status || prior.status || 'open'
  }

  return {
    ...prior,
    ...draft,
    id: prior.id,
    fingerprint,
    status,
    createdAt: prior.createdAt,
    updatedAt: now,
  }
}

export function fingerprintsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
