/**
 * ATO Tax Tables 2025-26
 * 
 * Australian Taxation Office (ATO) withholding tax tables for 2025-26 financial year
 * Based on payment frequency: Weekly, Fortnightly, Monthly
 */

export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly'

/**
 * ATO 2025-26 Tax Brackets (Annual)
 */
export const ATO_2025_26_ANNUAL_BRACKETS = {
  TAX_FREE_THRESHOLD: 18200,
  BRACKETS: [
    { min: 0, max: 18200, rate: 0 }, // Tax-free threshold
    { min: 18201, max: 45000, rate: 0.19 }, // 19% for $18,201 - $45,000
    { min: 45001, max: 120000, rate: 0.325 }, // 32.5% for $45,001 - $120,000
    { min: 120001, max: 180000, rate: 0.37 }, // 37% for $120,001 - $180,000
    { min: 180001, max: Infinity, rate: 0.45 }, // 45% for $180,001+
  ]
}

/**
 * Calculate PAYG withholding based on ATO 2025-26 tax tables
 * @param grossAmount - Gross pay amount
 * @param payFrequency - Payment frequency (weekly, fortnightly, monthly)
 * @param hasTaxFreeThreshold - Whether tax-free threshold applies
 * @param isDirector - Whether this is a director (deprecated: now uses progressive rate like employees)
 * @returns PAYG withholding amount
 */
export function calculatePAYGWithholding2025_26(
  grossAmount: number,
  payFrequency: PayFrequency = 'monthly',
  hasTaxFreeThreshold: boolean = true,
  isDirector: boolean = false
): number {
  // Note: Director now uses progressive rate like employees (tax-free threshold applies)
  // The isDirector parameter is kept for backward compatibility but no longer affects calculation

  // Convert to annual income based on payment frequency
  let annualIncome: number
  switch (payFrequency) {
    case 'weekly':
      annualIncome = grossAmount * 52
      break
    case 'fortnightly':
      annualIncome = grossAmount * 26
      break
    case 'monthly':
      annualIncome = grossAmount * 12
      break
    default:
      annualIncome = grossAmount * 12 // Default to monthly
  }

  // Apply tax-free threshold
  let taxableIncome = annualIncome
  if (hasTaxFreeThreshold) {
    taxableIncome = Math.max(0, annualIncome - ATO_2025_26_ANNUAL_BRACKETS.TAX_FREE_THRESHOLD)
  }

  if (taxableIncome <= 0) {
    return 0
  }

  // Calculate tax using progressive brackets
  let totalTax = 0
  const brackets = ATO_2025_26_ANNUAL_BRACKETS.BRACKETS

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break

    const taxableInBracket = Math.min(
      taxableIncome - bracket.min,
      bracket.max === Infinity ? taxableIncome : bracket.max - bracket.min
    )

    if (taxableInBracket > 0) {
      totalTax += taxableInBracket * bracket.rate
    }
  }

  // Convert annual tax back to payment period
  let withholdingAmount: number
  switch (payFrequency) {
    case 'weekly':
      withholdingAmount = totalTax / 52
      break
    case 'fortnightly':
      withholdingAmount = totalTax / 26
      break
    case 'monthly':
      withholdingAmount = totalTax / 12
      break
    default:
      withholdingAmount = totalTax / 12
  }

  return Math.round(withholdingAmount * 100) / 100
}

/**
 * Get PAYG withholding for specific payment frequency
 * This is the main function to use for payroll calculations
 * 
 * Note: Director now uses progressive rate like employees (tax-free threshold applies)
 * The isDirector parameter is kept for backward compatibility but no longer affects calculation
 */
export function getPAYGWithholding(
  grossAmount: number,
  payFrequency: PayFrequency,
  hasTaxFreeThreshold: boolean = true,
  isDirector: boolean = false
): number {
  // Director now uses progressive rate like employees
  // isDirector parameter is ignored - all types use progressive rate with tax-free threshold
  return calculatePAYGWithholding2025_26(
    grossAmount,
    payFrequency,
    hasTaxFreeThreshold,
    false // Always use progressive rate, not 47% flat rate
  )
}
