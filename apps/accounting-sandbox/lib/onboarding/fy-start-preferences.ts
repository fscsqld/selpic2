/**
 * First-use preferences: which BAS quarter the user starts from in SELPIC A,
 * and how earlier quarters in the same FY should be entered.
 */

import {
  getAustralianFinancialYear,
  getAustralianQuarterDates,
  isValidAustralianFinancialYear,
  type AustralianQuarter,
} from '@/lib/utils/australian-financial-year'

export type AppStartQuarter = 1 | 2 | 3 | 4

export type PriorQuarterHandling =
  /** Starting at Q1 — no earlier quarters in this FY for the app. */
  | 'first_in_fy'
  /** Upload prior-quarter bank PDFs before or after the current quarter. */
  | 'upload_prior_pdfs'
  /** No prior PDFs — use Settings opening balances + accountant totals. */
  | 'opening_balances_only'
  /** Prior BAS already lodged with ATO — snapshot / reconcile only. */
  | 'prior_lodged_snapshot'

export interface FyStartPreferences {
  startingQuarter: AppStartQuarter
  financialYear: string
  priorQuarterHandling: PriorQuarterHandling
  savedAt: string
}

export const FY_START_PREFERENCES_KEY = 'selpic_fy_start_preferences'
export const FY_START_BANNER_DISMISSED_KEY = 'selpic_fy_start_banner_dismissed'
export const FY_START_PREFERENCES_CHANGED = 'fyStartPreferencesChanged'

export function defaultFinancialYearForSetup(asOf: Date = new Date()): string {
  return getAustralianFinancialYear(asOf)
}

export function quarterOptionsForFinancialYear(
  financialYear: string
): Array<AustralianQuarter & { label: string }> {
  const fy = isValidAustralianFinancialYear(financialYear)
    ? financialYear.trim()
    : defaultFinancialYearForSetup()
  return ([1, 2, 3, 4] as const).map((quarter) => {
    const q = getAustralianQuarterDates(quarter, fy)
    return {
      ...q,
      label: `Q${quarter} (${formatQuarterRange(q.startDateStr, q.endDateStr)})`,
    }
  })
}

function formatQuarterRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  return `${fmt(start)} – ${fmt(end)}`
}

export function needsPriorQuarterSetup(
  startingQuarter: AppStartQuarter,
  handling: PriorQuarterHandling
): boolean {
  if (startingQuarter === 1) return false
  return handling !== 'first_in_fy'
}

export function resolvePriorQuarterHandling(
  startingQuarter: AppStartQuarter,
  handling: PriorQuarterHandling
): PriorQuarterHandling {
  if (startingQuarter === 1) return 'first_in_fy'
  return handling
}

export function buildFyStartPreferences(input: {
  startingQuarter: AppStartQuarter
  financialYear: string
  priorQuarterHandling: PriorQuarterHandling
}): FyStartPreferences {
  return {
    startingQuarter: input.startingQuarter,
    financialYear: isValidAustralianFinancialYear(input.financialYear)
      ? input.financialYear.trim()
      : defaultFinancialYearForSetup(),
    priorQuarterHandling: resolvePriorQuarterHandling(
      input.startingQuarter,
      input.priorQuarterHandling
    ),
    savedAt: new Date().toISOString(),
  }
}

export function saveFyStartPreferences(prefs: FyStartPreferences): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(FY_START_PREFERENCES_KEY, JSON.stringify(prefs))
  localStorage.removeItem(FY_START_BANNER_DISMISSED_KEY)
  window.dispatchEvent(new CustomEvent(FY_START_PREFERENCES_CHANGED, { detail: prefs }))
}

export function loadFyStartPreferences(): FyStartPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(FY_START_PREFERENCES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FyStartPreferences
    if (!parsed.startingQuarter || !parsed.financialYear) return null
    return parsed
  } catch {
    return null
  }
}

export function dismissFyStartBanner(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(FY_START_BANNER_DISMISSED_KEY, 'true')
}

export function isFyStartBannerDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(FY_START_BANNER_DISMISSED_KEY) === 'true'
}

export interface FyStartGuidance {
  headline: string
  summary: string
  nextSteps: string[]
}

export function getFyStartGuidance(prefs: FyStartPreferences): FyStartGuidance {
  const q = getAustralianQuarterDates(prefs.startingQuarter, prefs.financialYear)
  const headline = `Starting with BAS Q${prefs.startingQuarter} · FY ${prefs.financialYear}`

  if (prefs.startingQuarter === 1 || prefs.priorQuarterHandling === 'first_in_fy') {
    return {
      headline,
      summary:
        'This is your first BAS quarter in the app for this financial year. Upload this quarter’s bank statement, categorise transactions, then prepare BAS.',
      nextSteps: [
        'Upload your Q1 bank PDF or CSV (Biz Intel → Smart Data Integration).',
        'Set Director Name and any opening balances in Settings → Business Profile.',
        'Review and categorise all transactions.',
        'Reports → BAS vs ATO Lodgment, then lodge via OSB and save a finalized snapshot.',
      ],
    }
  }

  const priorCount = prefs.startingQuarter - 1

  if (prefs.priorQuarterHandling === 'upload_prior_pdfs') {
    return {
      headline,
      summary: `You have ${priorCount} earlier quarter(s) in FY ${prefs.financialYear}. Upload those bank statements first (or together with Q${prefs.startingQuarter}) so the ledger and year-end reports stay complete.`,
      nextSteps: [
        `Upload bank PDFs for Q1–Q${prefs.startingQuarter - 1} (oldest first is easiest).`,
        'Settings → Director\'s Loan: set Opening balance at the start of your earliest uploaded quarter — do not duplicate the same loan in Opening and on the statement.',
        `Upload Q${prefs.startingQuarter} (${formatQuarterRange(q.startDateStr, q.endDateStr)}) when ready.`,
        'Categorise every line, then prepare this quarter’s BAS.',
      ],
    }
  }

  if (prefs.priorQuarterHandling === 'prior_lodged_snapshot') {
    return {
      headline,
      summary: `Earlier quarter(s) were already lodged with the ATO. Add prior bank PDFs for year-end CTR / Balance Sheet, or save lodged BAS figures as snapshots — do not lodge again.`,
      nextSteps: [
        'Upload prior-quarter bank PDFs if you have them (recommended for Balance Sheet).',
        'ATO Lodgment → select each prior BAS quarter → compare → save a finalized snapshot (record only).',
        'Settings → Opening Cash / Director\'s Loan from your accountant if PDFs are missing.',
        `Prepare Q${prefs.startingQuarter} BAS in the app as usual, then use Reports for full FY CTR.`,
      ],
    }
  }

  // opening_balances_only
  return {
    headline,
    summary: `No prior bank PDFs — enter opening balances from your accountant at the start of Q${prefs.startingQuarter}. Good for BAS-only; year-end Balance Sheet may need prior statements later.`,
    nextSteps: [
      'Settings → Business Profile: Opening Cash, Capital, Retained Earnings (from accountant).',
      'Settings → Director\'s Loan: Opening balance and Prior Period Advances if applicable.',
      `Upload Q${prefs.startingQuarter} bank statement and categorise transactions.`,
      'Optional: Settings → Financial year onboarding for the full mid-year checklist.',
    ],
  }
}
