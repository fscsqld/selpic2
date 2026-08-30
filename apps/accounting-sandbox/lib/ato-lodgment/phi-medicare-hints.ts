/**
 * Indicative PHI / Medicare levy surcharge guidance for myTax preparation.
 * Thresholds are approximate — confirm on ato.gov.au for the lodgment year.
 */

/** Singles MLS threshold (approx. FY 2024–25). */
export const MLS_SINGLE_THRESHOLD = 97_000

/** Family MLS threshold (approx. FY 2024–25). */
export const MLS_FAMILY_THRESHOLD = 194_000

export interface PhiMedicareGuidance {
  taxableIncome: number
  mlsMayApply: boolean
  mlsMessage: string
  phiRebateMessage: string
  medicareSurchargeFieldHint: string
}

export function buildPhiMedicareGuidance(taxableIncome: number): PhiMedicareGuidance {
  const mlsMayApply = taxableIncome >= MLS_SINGLE_THRESHOLD

  return {
    taxableIncome,
    mlsMayApply,
    mlsMessage: mlsMayApply
      ? `Estimated taxable income is at or above $${MLS_SINGLE_THRESHOLD.toLocaleString('en-AU')} — you may owe Medicare levy surcharge without adequate private hospital cover.`
      : `Estimated taxable income is below $${MLS_SINGLE_THRESHOLD.toLocaleString('en-AU')} — MLS is unlikely to apply (confirm family tier if applicable).`,
    phiRebateMessage:
      'Enter your PHI rebate from your health fund statement in myTax → Private health insurance. SELPIC does not calculate the rebate automatically.',
    medicareSurchargeFieldHint: mlsMayApply
      ? 'Review MLS in myTax — enter surcharge only if calculated by myTax or your adviser.'
      : 'Enter only if myTax or your tax agent calculates Medicare levy surcharge for your situation.',
  }
}

export function phiFieldDescription(
  guidance: PhiMedicareGuidance,
  hasAmount: boolean
): string {
  if (hasAmount) {
    return 'Rebate amount entered — confirm against your PHI statement in myTax.'
  }
  return `${guidance.phiRebateMessage} Not derived from bank data.`
}

export function medicareSurchargeFieldDescription(guidance: PhiMedicareGuidance): string {
  return guidance.medicareSurchargeFieldHint
}
