import { getCurrentAustralianQuarter } from '@/lib/utils/australian-financial-year'
import { getCurrentFinancialYearRange } from './compute-lodgment'
import type { AccountTypeForLodgment, LodgmentTab } from './types'

export interface LodgmentCalendarItem {
  id: string
  title: string
  portal: 'osb' | 'mytax'
  tab: LodgmentTab
  periodHint: string
  dueHint: string
  steps: string[]
  priority: 'now' | 'upcoming' | 'later'
}

function basDueHint(periodEnd: string, cycle: 'Monthly' | 'Quarterly'): string {
  const end = new Date(periodEnd + 'T12:00:00')
  const due = new Date(end)
  if (cycle === 'Monthly') {
    due.setDate(due.getDate() + 21)
    return `Typically due ~21 days after month end (${due.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })})`
  }
  due.setDate(due.getDate() + 28)
  return `Typically due ~28 days after quarter end (${due.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })})`
}

/**
 * Integrated lodgment calendar — what to lodge, where, and which SELPIC tab to use.
 */
export function buildLodgmentCalendar(
  accountType: AccountTypeForLodgment,
  gstReportingCycle: 'Monthly' | 'Quarterly' = 'Quarterly',
  financialYear?: string,
  _options?: { hasPayroll?: boolean; hasFbt?: boolean }
): LodgmentCalendarItem[] {
  const fy = financialYear ?? getCurrentFinancialYearRange().financialYear
  const q = getCurrentAustralianQuarter()
  const items: LodgmentCalendarItem[] = []

  const basPeriodLabel =
    gstReportingCycle === 'Monthly'
      ? `Current BAS month`
      : `Q${q.quarter} ${q.financialYear}`

  items.push({
    id: 'bas-current',
    title: gstReportingCycle === 'Monthly' ? 'Lodge monthly BAS' : 'Lodge quarterly BAS',
    portal: 'osb',
    tab: 'bas',
    periodHint: basPeriodLabel,
    dueHint: basDueHint(
      gstReportingCycle === 'Monthly' ? q.endDateStr : q.endDateStr,
      gstReportingCycle
    ),
    steps: [
      'Open ATO Lodgment → BAS tab.',
      'Select the matching period.',
      'Switch to "ATO entry order" and copy each field in order.',
      'Sign in to Online services for business and paste into the activity statement.',
    ],
    priority: 'now',
  })

  if (accountType === 'sole_trader') {
    items.push({
      id: 'mytax-annual',
      title: 'Lodge individual return (myTax business income)',
      portal: 'mytax',
      tab: 'annual',
      periodHint: `Financial year ${fy}`,
      dueHint: 'Typically due 31 October (or later with tax agent)',
      steps: [
        'Open ATO Lodgment → Annual income tab.',
        'Copy myTax-labelled fields in screen order.',
        'Sign in to myGov → ATO → myTax and enter under Business/sole trader.',
      ],
      priority: 'upcoming',
    })
  }

  if (accountType === 'company') {
    items.push({
      id: 'ctr-annual',
      title: 'Lodge company tax return (CTR)',
      portal: 'osb',
      tab: 'ctr',
      periodHint: `Financial year ${fy}`,
      dueHint: 'Typically due by lodgment due date shown in OSB',
      steps: [
        'Open ATO Lodgment → Company CTR tab.',
        'Set tax rate (25% or 30%) and any manual adjustments.',
        'Copy fields in ATO entry order into OSB company tax return.',
      ],
      priority: 'upcoming',
    })
  }

  items.push({
    id: 'lock-periods',
    title: 'Lock accounting periods before finalising',
    portal: 'osb',
    tab: 'bas',
    periodHint: 'All months in reporting range',
    dueHint: 'Before saving a final snapshot',
    steps: [
      'In Settings → Period management, lock each month in the BAS/CTR range.',
      'Set data scope to "Locked periods only" on this page.',
      'Save snapshot or Finalize when figures are confirmed.',
    ],
    priority: 'later',
  })

  return items
}
