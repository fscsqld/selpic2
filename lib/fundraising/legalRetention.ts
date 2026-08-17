/**
 * Legal retention archive for ended Community Fundraising partnerships.
 *
 * When a partnership is suspended/terminated, the partner is auto-classified into a
 * legal_retention archive until the configured retention period elapses (default 7 years —
 * covers ATO ~5-year tax records and common company financial record-keeping).
 * Admins may delete app records only after retentionUntil; deletion is always manual.
 */

import type { FundraisingPartner, FundraisingSettings } from '@/lib/fundraising/types'
import { addMonthsIso, formatTermDate } from '@/lib/fundraising/partnershipTerm'

export type LegalRetentionArchiveClass = 'legal_retention'

export type LegalRetentionPhase = 'none' | 'retaining' | 'eligible_delete'

const DAY_MS = 24 * 60 * 60 * 1000

/** Default 7 years (84 months) — conservative AU company + tax alignment. */
export function legalRetentionYears(settings: FundraisingSettings): number {
  const n = Number(settings.legalRetentionYears)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7
}

export function isEndedPartnershipStatus(
  status: FundraisingPartner['status']
): status is 'suspended' | 'terminated' {
  return status === 'suspended' || status === 'terminated'
}

/** Start / refresh legal retention classification when partnership ends. */
export function applyLegalRetentionOnEnd(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  nowIso = new Date().toISOString()
): Pick<
  FundraisingPartner,
  | 'partnershipEndedAt'
  | 'retentionArchiveClass'
  | 'retentionUntil'
  | 'retentionYearsApplied'
> {
  const years = legalRetentionYears(settings)
  const endedAt = partner.partnershipEndedAt || nowIso
  return {
    partnershipEndedAt: endedAt,
    retentionArchiveClass: 'legal_retention',
    retentionUntil: addMonthsIso(endedAt, years * 12),
    retentionYearsApplied: years,
  }
}

/** Clear retention archive fields when partnership returns to active/pending. */
export function clearLegalRetention(): Pick<
  FundraisingPartner,
  | 'partnershipEndedAt'
  | 'retentionArchiveClass'
  | 'retentionUntil'
  | 'retentionYearsApplied'
> {
  return {
    partnershipEndedAt: undefined,
    retentionArchiveClass: undefined,
    retentionUntil: undefined,
    retentionYearsApplied: undefined,
  }
}

/**
 * Ensure ended partners carry retention fields (backfill for legacy suspended rows).
 * Does not change partnershipEndedAt if already set; recomputes retentionUntil from it.
 */
export function ensureLegalRetention(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  nowIso = new Date().toISOString()
): FundraisingPartner {
  if (!isEndedPartnershipStatus(partner.status)) {
    if (partner.retentionArchiveClass || partner.retentionUntil) {
      return { ...partner, ...clearLegalRetention() }
    }
    return partner
  }
  if (
    partner.retentionArchiveClass === 'legal_retention' &&
    partner.partnershipEndedAt &&
    partner.retentionUntil
  ) {
    return partner
  }
  const endedAt =
    partner.partnershipEndedAt ||
    partner.updatedAt ||
    partner.termEndsAt ||
    partner.createdAt ||
    nowIso
  const years = legalRetentionYears(settings)
  return {
    ...partner,
    partnershipEndedAt: endedAt,
    retentionArchiveClass: 'legal_retention',
    retentionUntil: addMonthsIso(endedAt, years * 12),
    retentionYearsApplied: years,
  }
}

export function isLegalRetentionArchive(partner: FundraisingPartner): boolean {
  return (
    isEndedPartnershipStatus(partner.status) &&
    (partner.retentionArchiveClass === 'legal_retention' || Boolean(partner.retentionUntil))
  )
}

export function isRetentionPeriodElapsed(
  partner: FundraisingPartner,
  now = new Date()
): boolean {
  if (!partner.retentionUntil) return false
  const until = new Date(partner.retentionUntil).getTime()
  if (!Number.isFinite(until)) return false
  return until <= now.getTime()
}

/** App-row delete is allowed only after legal retention window ends (ended partners). */
export function isEligibleForAppDeletion(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  now = new Date()
): boolean {
  if (!isEndedPartnershipStatus(partner.status)) return true
  const p = ensureLegalRetention(partner, settings, now.toISOString())
  return isRetentionPeriodElapsed(p, now)
}

export function legalRetentionPhase(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  now = new Date()
): LegalRetentionPhase {
  if (!isEndedPartnershipStatus(partner.status)) return 'none'
  const p = ensureLegalRetention(partner, settings, now.toISOString())
  if (isRetentionPeriodElapsed(p, now)) return 'eligible_delete'
  return 'retaining'
}

export function retentionDaysRemaining(
  partner: FundraisingPartner,
  now = new Date()
): number | null {
  if (!partner.retentionUntil) return null
  const until = new Date(partner.retentionUntil).getTime()
  if (!Number.isFinite(until)) return null
  return Math.ceil((until - now.getTime()) / DAY_MS)
}

export function formatRetentionUntil(iso?: string | null): string {
  return formatTermDate(iso)
}

export function applyStatusWithLegalRetention(
  partner: FundraisingPartner,
  nextStatus: FundraisingPartner['status'],
  settings: FundraisingSettings,
  nowIso = new Date().toISOString()
): FundraisingPartner {
  if (isEndedPartnershipStatus(nextStatus)) {
    const base = { ...partner, status: nextStatus, updatedAt: nowIso }
    // Fresh end (or first classification): stamp endedAt now if newly ending
    const newlyEnding = !isEndedPartnershipStatus(partner.status)
    const withEnd = newlyEnding
      ? { ...base, partnershipEndedAt: nowIso }
      : { ...base, partnershipEndedAt: partner.partnershipEndedAt || nowIso }
    return { ...withEnd, ...applyLegalRetentionOnEnd(withEnd, settings, nowIso) }
  }
  return {
    ...partner,
    status: nextStatus,
    updatedAt: nowIso,
    ...clearLegalRetention(),
  }
}
