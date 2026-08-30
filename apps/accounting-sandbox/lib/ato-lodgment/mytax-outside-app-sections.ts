/**
 * myTax sections entered directly in the portal (not in SELPIC field sheet).
 */

import type { LodgmentField } from '@/lib/ato-lodgment/types'

export interface MyTaxOutsideSection {
  id: string
  label: string
  myTaxPath: string
  description: string
  /** When this section should appear in the checklist */
  applicable: boolean
}

const MLS_THRESHOLD = 97_000

export function buildMyTaxOutsideSections(
  fields: LodgmentField[],
  options: { taxableIncome?: number } = {}
): MyTaxOutsideSection[] {
  const taxable =
    options.taxableIncome ??
    fields.find((f) => f.id === 'IND_TAXABLE_INCOME')?.amount ??
    0
  const dividends = fields.find((f) => f.id === 'IND_DIVIDENDS')?.amount ?? 0
  const govt = fields.find((f) => f.id === 'IND_GOVT')?.amount ?? 0
  const business = fields.find((f) => f.id === 'IND_BUSINESS')?.amount ?? 0

  return [
    {
      id: 'medicare_levy',
      label: 'Medicare levy',
      myTaxPath: 'myTax → Medicare levy',
      description:
        'myTax calculates the Medicare levy from your taxable income. Confirm the amount on the summary screen.',
      applicable: true,
    },
    {
      id: 'hecs_help',
      label: 'Study and training loan (HECS-HELP / VSL)',
      myTaxPath: 'myTax → Study and training loan',
      description:
        'If you have a HELP, VSL, SSL or TSL debt, enter or confirm repayment amounts from your ATO notice.',
      applicable: true,
    },
    {
      id: 'foreign_income',
      label: 'Foreign income & assets',
      myTaxPath: 'myTax → Foreign income / Foreign assets',
      description:
        'Report foreign employment, investments, or assets if applicable. Not derived from Australian bank data alone.',
      applicable: true,
    },
    {
      id: 'franking_credits',
      label: 'Franking credits (dividends)',
      myTaxPath: 'myTax → Income → Dividends',
      description:
        'Split franked and unfranked dividends and enter franking credit amounts from your dividend statements.',
      applicable: dividends > 0,
    },
    {
      id: 'govt_offsets',
      label: 'Government payments & offsets',
      myTaxPath: 'myTax → Income → Government payments',
      description:
        'Confirm Centrelink or other government payment details match Services Australia records.',
      applicable: govt > 0,
    },
    {
      id: 'business_schedule_detail',
      label: 'Business schedule detail',
      myTaxPath: 'myTax → Business income or loss',
      description:
        'If you have business income, complete the full business schedule in myTax (ABN, expenses breakdown).',
      applicable: business > 0,
    },
    {
      id: 'spouse_dependants',
      label: 'Spouse & dependants',
      myTaxPath: 'myTax → Personal details',
      description: 'Enter spouse income and dependants if required for offsets or Medicare levy reduction.',
      applicable: true,
    },
    {
      id: 'lito_other_offsets',
      label: 'Tax offsets (LITO etc.)',
      myTaxPath: 'myTax → Tax offsets',
      description:
        'Low income tax offset and other offsets are calculated in myTax — review the offsets summary.',
      applicable: taxable > 0,
    },
    {
      id: 'mls_confirm',
      label: 'Medicare levy surcharge confirmation',
      myTaxPath: 'myTax → Private health insurance / MLS',
      description:
        'If taxable income is above the MLS threshold, confirm private hospital cover or enter MLS.',
      applicable: taxable >= MLS_THRESHOLD,
    },
  ].filter((s) => s.applicable)
}

export const MYTAX_OUTSIDE_CHECKS_STORAGE_PREFIX = 'mytax_outside_checks_'

export function readMyTaxOutsideChecks(financialYear: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(`${MYTAX_OUTSIDE_CHECKS_STORAGE_PREFIX}${financialYear}`)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export function saveMyTaxOutsideChecks(
  financialYear: string,
  checks: Record<string, boolean>
): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    `${MYTAX_OUTSIDE_CHECKS_STORAGE_PREFIX}${financialYear}`,
    JSON.stringify(checks)
  )
}
