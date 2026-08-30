/**
 * Merge account-type drafts into one IndexedDB business_profile record.
 * Current form must win for shared flags (gstRegistered, cycles, ABN, etc.).
 */

export type AccountTypeDraft = 'individual' | 'company' | 'sole_trader'

export type BusinessProfileDraft = {
  individualName?: string
  companyName?: string
  abn?: string
  acn?: string
  gstReportingCycle?: 'Monthly' | 'Quarterly'
  paygReportingCycle?: 'Monthly' | 'Quarterly'
  gstRegistered?: boolean
  fbtRegistered?: boolean
  companyTaxRate?: number
  smallBusinessEntity?: boolean
  openingCapital?: number
  openingRetainedEarnings?: number
  openingCashBalance?: number
  accountingBasis?: 'cash' | 'accrual'
  autoPostArApJournals?: boolean
  accountType?: AccountTypeDraft
}

export function resolveGstRegisteredFlag(
  value: boolean | undefined | null
): boolean {
  // Missing field = registered (legacy profiles + SetupWizard default for companies)
  return value !== false
}

/**
 * Build the object written to IndexedDB.
 * Spreading sole_trader after company used to overwrite gstRegistered: false.
 */
export function mergeBusinessProfileForSave(
  drafts: {
    individual?: BusinessProfileDraft
    company?: BusinessProfileDraft
    sole_trader?: BusinessProfileDraft
  },
  current: BusinessProfileDraft
): BusinessProfileDraft {
  const accountType = current.accountType || 'individual'
  return {
    ...drafts.individual,
    ...drafts.company,
    ...drafts.sole_trader,
    ...current,
    accountType,
    // Explicit booleans so IndexedDB never drops false via omit/undefined
    gstRegistered: current.gstRegistered === true,
    fbtRegistered: current.fbtRegistered === true,
  }
}
