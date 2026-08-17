/**
 * Resolve Fundraising Cashback Grant % and parent display % for a partner.
 * - Current (no onDateIso): prefer partner.donationRate / parentDisplayRate (cloud fields on Save).
 * - Dated (payout periods): prefer rateSchedule for that day, then partner fields, then settings.
 */

import type {
  FundraisingPartner,
  FundraisingPartnerRate,
  FundraisingSettings,
} from '@/lib/fundraising/types'
import { DEFAULT_FUNDRAISING_SETTINGS } from '@/lib/fundraising/types'

function sortRatesNewestFirst(a: FundraisingPartnerRate, b: FundraisingPartnerRate): number {
  const byFrom = b.effectiveFrom.localeCompare(a.effectiveFrom)
  if (byFrom !== 0) return byFrom
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
}

export function resolvePartnerGrantRates(
  partner: Pick<FundraisingPartner, 'donationRate' | 'parentDisplayRate' | 'rateSchedule'> | null | undefined,
  settings: Pick<FundraisingSettings, 'donationRate' | 'parentDisplayRate'> | null | undefined,
  opts?: {
    onDateIso?: string
    /** Browser-local rate rows (Zustand); merged with partner.rateSchedule */
    localRates?: FundraisingPartnerRate[]
    partnerId?: string
  }
): { donationRate: number; parentDisplayRate: number } {
  const globalDonation = settings?.donationRate ?? DEFAULT_FUNDRAISING_SETTINGS.donationRate
  const globalParent = settings?.parentDisplayRate ?? DEFAULT_FUNDRAISING_SETTINGS.parentDisplayRate

  const fromPartnerFields = (): { donationRate: number; parentDisplayRate: number } | null => {
    if (partner?.donationRate == null || !Number.isFinite(Number(partner.donationRate))) return null
    return {
      donationRate: Number(partner.donationRate),
      parentDisplayRate:
        partner.parentDisplayRate != null && Number.isFinite(Number(partner.parentDisplayRate))
          ? Number(partner.parentDisplayRate)
          : globalParent,
    }
  }

  // Lookup / "now": cloud current fields win (avoids same-day schedule ties showing an older %).
  if (!opts?.onDateIso) {
    const current = fromPartnerFields()
    if (current) return current
  }

  const on = (opts?.onDateIso || new Date().toISOString()).slice(0, 10)
  const partnerId = opts?.partnerId
  const schedule: FundraisingPartnerRate[] = [
    ...(partner?.rateSchedule || []),
    ...(opts?.localRates || []).filter((r) => !partnerId || r.partnerId === partnerId),
  ]

  const matches = schedule
    .filter((r) => r.effectiveFrom.slice(0, 10) <= on)
    .filter((r) => !r.effectiveTo || r.effectiveTo.slice(0, 10) >= on)
    .sort(sortRatesNewestFirst)

  const hit = matches[0]
  if (hit) {
    return {
      donationRate: hit.donationRate,
      parentDisplayRate: hit.parentDisplayRate,
    }
  }

  const fallback = fromPartnerFields()
  if (fallback) return fallback

  return { donationRate: globalDonation, parentDisplayRate: globalParent }
}
