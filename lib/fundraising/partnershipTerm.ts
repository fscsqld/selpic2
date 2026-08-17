/**
 * Annual partnership term + inactivity helpers (fundraising partners).
 */

import type { FundraisingPartner, FundraisingSettings } from '@/lib/fundraising/types'
import type { OrderRecord } from '@/lib/store'

const DAY_MS = 24 * 60 * 60 * 1000

export function addMonthsIso(fromIso: string, months: number): string {
  const d = new Date(fromIso)
  if (!Number.isFinite(d.getTime())) return fromIso
  const day = d.getUTCDate()
  d.setUTCMonth(d.getUTCMonth() + months)
  // Clamp overflow (e.g. Jan 31 + 1 month)
  if (d.getUTCDate() < day) d.setUTCDate(0)
  return d.toISOString()
}

export function partnershipTermMonths(settings: FundraisingSettings): number {
  const n = Number(settings.partnershipTermMonths)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12
}

export function renewalNoticeDays(settings: FundraisingSettings): number {
  const n = Number(settings.renewalNoticeDays)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 45
}

export function inactivityMonths(settings: FundraisingSettings): number {
  const n = Number(settings.inactivityMonths)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6
}

/** First activation: start a new term from now. */
export function startPartnershipTerm(
  settings: FundraisingSettings,
  nowIso = new Date().toISOString()
): Pick<FundraisingPartner, 'approvedAt' | 'termStartsAt' | 'termEndsAt' | 'renewalIntent' | 'renewalNoticeSentAt'> {
  return {
    approvedAt: nowIso,
    termStartsAt: nowIso,
    termEndsAt: addMonthsIso(nowIso, partnershipTermMonths(settings)),
    renewalIntent: null,
    renewalNoticeSentAt: undefined,
  }
}

/** Extend current term by another full term length from current end (or now if already past). */
export function extendPartnershipTerm(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  nowIso = new Date().toISOString()
): Pick<FundraisingPartner, 'termStartsAt' | 'termEndsAt' | 'renewalIntent' | 'renewalNoticeSentAt'> {
  const months = partnershipTermMonths(settings)
  const currentEnd = partner.termEndsAt ? new Date(partner.termEndsAt).getTime() : 0
  const now = new Date(nowIso).getTime()
  const baseIso =
    Number.isFinite(currentEnd) && currentEnd > now ? partner.termEndsAt! : nowIso
  const nextEnd = addMonthsIso(baseIso, months)
  return {
    termStartsAt: partner.termStartsAt || nowIso,
    termEndsAt: nextEnd,
    renewalIntent: null,
    renewalNoticeSentAt: undefined,
  }
}

export function daysUntilTermEnd(partner: FundraisingPartner, now = new Date()): number | null {
  if (!partner.termEndsAt) return null
  const end = new Date(partner.termEndsAt).getTime()
  if (!Number.isFinite(end)) return null
  return Math.ceil((end - now.getTime()) / DAY_MS)
}

export function isTermExpiringSoon(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  now = new Date()
): boolean {
  if (partner.status !== 'active') return false
  const days = daysUntilTermEnd(partner, now)
  if (days === null) return false
  return days <= renewalNoticeDays(settings) && days >= 0
}

export function isTermExpired(partner: FundraisingPartner, now = new Date()): boolean {
  if (!partner.termEndsAt) return false
  const end = new Date(partner.termEndsAt).getTime()
  if (!Number.isFinite(end)) return false
  return end < now.getTime()
}

/** Latest order date (ISO) for this partner's community code, or null. */
export function lastCommunitySaleAt(
  partner: FundraisingPartner,
  orders: OrderRecord[]
): string | null {
  const code = String(partner.linkedPromoCode || '')
    .trim()
    .toUpperCase()
  if (!code) return null
  let latest = 0
  let latestIso: string | null = null
  for (const order of orders) {
    const orderCode = String(order.promoCode || '')
      .trim()
      .toUpperCase()
    if (orderCode !== code) continue
    const status = String((order as { status?: string }).status || '').toLowerCase()
    if (status.includes('cancel') || status.includes('refund')) continue
    const iso = order.createdAtIso || (order as { createdAt?: string }).createdAt || ''
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t) || t <= latest) continue
    latest = t
    latestIso = iso
  }
  return latestIso
}

export function isInactivePartner(
  partner: FundraisingPartner,
  orders: OrderRecord[],
  settings: FundraisingSettings,
  now = new Date()
): boolean {
  if (partner.status !== 'active' || !partner.linkedPromoCode) return false
  const months = inactivityMonths(settings)
  const cutoff = now.getTime() - months * 30 * DAY_MS
  const last = lastCommunitySaleAt(partner, orders)
  if (!last) {
    // Never had a sale — use approval/term start as activity proxy
    const start = partner.approvedAt || partner.termStartsAt || partner.createdAt
    const t = new Date(start).getTime()
    return Number.isFinite(t) ? t < cutoff : true
  }
  return new Date(last).getTime() < cutoff
}

export function isInRenewalNoticeWindow(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  now = new Date()
): boolean {
  if (partner.status !== 'active' || !partner.termEndsAt) return false
  const days = daysUntilTermEnd(partner, now)
  if (days === null) return false
  const lead = renewalNoticeDays(settings)
  // Upcoming: within lead days. Slightly past end: still notify for 14 days.
  if (days >= 0 && days <= lead) return true
  if (days < 0 && days >= -14) return true
  return false
}

/** True when D19 should be emailed (due window, not yet notified this term, no intent yet). */
export function shouldSendRenewalNotice(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  now = new Date()
): boolean {
  if (!partner.contactEmail?.trim()) return false
  if (partner.renewalIntent === 'wants_renew' || partner.renewalIntent === 'declines') return false
  if (!isInRenewalNoticeWindow(partner, settings, now)) return false
  if (partner.renewalNoticeSentAt && partner.termEndsAt) {
    const sent = new Date(partner.renewalNoticeSentAt).getTime()
    const termEnd = new Date(partner.termEndsAt).getTime()
    // Already notified for this term (notice sent before the current term end date)
    if (Number.isFinite(sent) && Number.isFinite(termEnd) && sent < termEnd) return false
  }
  return true
}

export function formatTermDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
