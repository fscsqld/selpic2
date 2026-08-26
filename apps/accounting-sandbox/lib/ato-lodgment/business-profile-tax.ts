/**
 * Resolve company tax rate from business profile settings.
 * AU base-rate entity 30%; base-rate entity eligible for lower rate typically 25%.
 */

export const COMPANY_TAX_RATE_SMALL = 0.25
export const COMPANY_TAX_RATE_STANDARD = 0.3

export type BusinessProfileTaxFields = {
  companyTaxRate?: number
  /** @deprecated prefer smallBusinessEntity */
  isSmallBusinessEntity?: boolean
  smallBusinessEntity?: boolean
  aggregatedTurnoverUnder50m?: boolean
  accountType?: 'company' | 'sole_trader' | 'individual'
}

function normalizeRate(rate: number): number | null {
  if (!Number.isFinite(rate) || rate <= 0) return null
  if (rate <= 1) return rate
  if (rate <= 100) return rate / 100
  return null
}

export function resolveCompanyTaxRate(
  profile?: BusinessProfileTaxFields | null
): number {
  if (profile?.companyTaxRate != null) {
    const normalized = normalizeRate(Number(profile.companyTaxRate))
    if (normalized != null) return normalized
  }

  const isSbe =
    profile?.smallBusinessEntity ?? profile?.isSmallBusinessEntity

  if (isSbe === false) return COMPANY_TAX_RATE_STANDARD
  if (profile?.aggregatedTurnoverUnder50m === false) {
    return COMPANY_TAX_RATE_STANDARD
  }

  // Sole traders / individuals: use small-business style rate for estimates.
  if (
    profile?.accountType === 'sole_trader' ||
    profile?.accountType === 'individual'
  ) {
    return COMPANY_TAX_RATE_SMALL
  }

  return COMPANY_TAX_RATE_SMALL
}

/** Display label for a decimal (0.25) or percent (25) company tax rate. */
export function companyTaxRateLabel(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return 'company tax rate n/a'
  const pct = rate <= 1 ? rate * 100 : rate
  const rounded = Math.round(pct * 100) / 100
  return `company tax rate ${rounded}%`
}
