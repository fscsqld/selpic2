/**
 * Australian financial-year quarters for Fundraising Cashback Grant settlements.
 *
 * ATO / Australian convention: financial year starts 1 July.
 * - Q1: 1 Jul – 30 Sep
 * - Q2: 1 Oct – 31 Dec
 * - Q3: 1 Jan – 31 Mar
 * - Q4: 1 Apr – 30 Jun
 *
 * Period id example: FY2025-26-Q1 (Jul–Sep 2025).
 *
 * Payout policy: bank transfer due by the 15th calendar day of the month
 * immediately after quarter end (rolled to the next Monday if that day is Sat/Sun).
 * If the due date is an Australian public holiday, SELPIC may complete payment
 * on the next banking day — still within the same policy window.
 */

export const FUNDRAISING_GRANT_PAYOUT_POLICY = {
  cadence: 'quarterly_au_financial_year' as const,
  /** Calendar day-of-month in the month after quarter end. */
  dueDayOfMonthAfterQuarterEnd: 15,
  /**
   * After quarter end, wait this many calendar days (Australia/Sydney) before
   * locking final settlement figures (cancellations / refunds can settle).
   */
  settlementFreezeCalendarDays: 7,
  summary:
    'Fundraising Cashback Grants are calculated once per Australian financial-year quarter. Figures lock 7 calendar days after the quarter ends (Sydney) so cancellations and refunds can settle, then funds are transferred by the 15th of the month after quarter end (or the next business day if that date falls on a weekend). There is no minimum payout amount.',
} as const

export type AuFyQuarter = 1 | 2 | 3 | 4

/** FY label like 2025-26 (year July starts – short year June ends). */
export function auFyLabelFromStartYear(startYear: number): string {
  const endShort = String((startYear + 1) % 100).padStart(2, '0')
  return `${startYear}-${endShort}`
}

function calendarPartsInSydney(d: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(d)
  const num = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0)
  return { year: num('year'), month: num('month'), day: num('day') }
}

/** Which AU FY quarter contains `d` (Australia/Sydney calendar). */
export function auFyQuarterParts(d = new Date()): {
  fyStartYear: number
  quarter: AuFyQuarter
  fyLabel: string
} {
  const { year: y, month: m } = calendarPartsInSydney(d)
  if (m >= 7 && m <= 9) {
    return { fyStartYear: y, quarter: 1, fyLabel: auFyLabelFromStartYear(y) }
  }
  if (m >= 10 && m <= 12) {
    return { fyStartYear: y, quarter: 2, fyLabel: auFyLabelFromStartYear(y) }
  }
  if (m >= 1 && m <= 3) {
    return { fyStartYear: y - 1, quarter: 3, fyLabel: auFyLabelFromStartYear(y - 1) }
  }
  return { fyStartYear: y - 1, quarter: 4, fyLabel: auFyLabelFromStartYear(y - 1) }
}

export function formatAuFyPeriodId(fyStartYear: number, quarter: AuFyQuarter): string {
  return `FY${auFyLabelFromStartYear(fyStartYear)}-Q${quarter}`
}

/** Current open AU FY quarter period id. */
export function currentAuFyQuarterPeriodId(d = new Date()): string {
  const { fyStartYear, quarter } = auFyQuarterParts(d)
  return formatAuFyPeriodId(fyStartYear, quarter)
}

/**
 * Parse period ids:
 * - FY2025-26-Q1 (preferred)
 * - 2025-26-Q1
 * Legacy monthly YYYY-MM still accepted for historical settlements.
 */
export function parseFundraisingPeriod(
  period: string
):
  | { kind: 'au_fy_quarter'; fyStartYear: number; quarter: AuFyQuarter }
  | { kind: 'month'; year: number; month: number }
  | null {
  const q = period.trim().toUpperCase()
  const fy = q.match(/^FY?(\d{4})-(\d{2})-Q([1-4])$/)
  if (fy) {
    const start = Number(fy[1])
    const endShort = Number(fy[2])
    if ((start + 1) % 100 !== endShort) return null
    return { kind: 'au_fy_quarter', fyStartYear: start, quarter: Number(fy[3]) as AuFyQuarter }
  }
  const m = period.trim().match(/^(\d{4})-(\d{2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    if (month < 1 || month > 12) return null
    return { kind: 'month', year, month }
  }
  return null
}

export function auFyQuarterMonthRange(quarter: AuFyQuarter): { startMonth: number; endMonth: number } {
  switch (quarter) {
    case 1:
      return { startMonth: 7, endMonth: 9 }
    case 2:
      return { startMonth: 10, endMonth: 12 }
    case 3:
      return { startMonth: 1, endMonth: 3 }
    case 4:
      return { startMonth: 4, endMonth: 6 }
  }
}

/** Inclusive UTC bounds for order filtering. */
export function auFyQuarterBounds(fyStartYear: number, quarter: AuFyQuarter): {
  startIso: string
  endIso: string
} {
  const { startMonth, endMonth } = auFyQuarterMonthRange(quarter)
  const startYear = quarter <= 2 ? fyStartYear : fyStartYear + 1
  const endYear = startYear
  const start = new Date(Date.UTC(startYear, startMonth - 1, 1, 0, 0, 0, 0))
  // Day 0 of next month = last day of endMonth
  const end = new Date(Date.UTC(endYear, endMonth, 0, 23, 59, 59, 999))
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

/** Mid-quarter date ISO (for rate schedule resolution). */
export function auFyQuarterMidDateIso(fyStartYear: number, quarter: AuFyQuarter): string {
  const { startMonth } = auFyQuarterMonthRange(quarter)
  const year = quarter <= 2 ? fyStartYear : fyStartYear + 1
  const midMonth = startMonth + 1 // 2nd month of quarter
  return `${year}-${String(midMonth).padStart(2, '0')}-15`
}

/**
 * Payout due date: 15th of the month after quarter end.
 * If that calendar day is Saturday/Sunday, roll forward to Monday.
 */
export function grantPayoutDueDate(fyStartYear: number, quarter: AuFyQuarter): Date {
  const { endMonth } = auFyQuarterMonthRange(quarter)
  const endYear = quarter <= 2 ? fyStartYear : fyStartYear + 1
  // Month after endMonth
  let dueYear = endYear
  let dueMonth = endMonth + 1 // 1–12 style then adjust
  if (dueMonth > 12) {
    dueMonth = 1
    dueYear += 1
  }
  const due = new Date(Date.UTC(dueYear, dueMonth - 1, FUNDRAISING_GRANT_PAYOUT_POLICY.dueDayOfMonthAfterQuarterEnd, 12, 0, 0))
  const dow = due.getUTCDay() // 0 Sun … 6 Sat
  if (dow === 6) due.setUTCDate(due.getUTCDate() + 2)
  else if (dow === 0) due.setUTCDate(due.getUTCDate() + 1)
  return due
}

export function formatGrantPayoutDueDateDisplay(fyStartYear: number, quarter: AuFyQuarter): string {
  const d = grantPayoutDueDate(fyStartYear, quarter)
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatAuFyQuarterLabel(fyStartYear: number, quarter: AuFyQuarter): string {
  const fy = auFyLabelFromStartYear(fyStartYear)
  const { startMonth, endMonth } = auFyQuarterMonthRange(quarter)
  const startYear = quarter <= 2 ? fyStartYear : fyStartYear + 1
  const endYear = startYear
  const monthName = (m: number) =>
    new Date(Date.UTC(2000, m - 1, 1)).toLocaleString('en-AU', { month: 'short', timeZone: 'UTC' })
  // Lead with calendar months so AU FY Q1≠Jan is obvious in admin dropdowns.
  const range = `${monthName(startMonth)}–${monthName(endMonth)} ${startYear}`
  return `Q${quarter} · ${range} (FY${fy})`
}

/** @deprecated Prefer listAdminAuFyQuarterPeriods — kept for call-site compatibility. */
export function listRecentAuFyQuarterPeriods(count = 8, from = new Date()): string[] {
  // Historical behaviour: current + (count-1) past, newest first (no futures).
  return listAdminAuFyQuarterPeriods({
    pastQuarters: Math.max(0, count - 1),
    futureQuarters: 0,
    from,
  })
}

/**
 * Admin AU FY quarter selector options (computed from calendar — not DB rows).
 *
 * Order (top → bottom, matches downward reading of the open list):
 * 1. Current quarter
 * 2. Upcoming quarters (soonest first)
 * 3. Recent past quarters (most recent past first)
 *
 * Defaults: 2 future + 4 past (~1 year history) so the menu stays short.
 */
export function listAdminAuFyQuarterPeriods(
  options: { pastQuarters?: number; futureQuarters?: number; from?: Date } = {}
): string[] {
  const pastQuarters = options.pastQuarters ?? 4
  const futureQuarters = options.futureQuarters ?? 2
  const from = options.from ?? new Date()
  const { fyStartYear, quarter } = auFyQuarterParts(from)

  const out: string[] = [formatAuFyPeriodId(fyStartYear, quarter)]

  let y = fyStartYear
  let q = quarter as number
  for (let i = 0; i < futureQuarters; i++) {
    q += 1
    if (q > 4) {
      q = 1
      y += 1
    }
    out.push(formatAuFyPeriodId(y, q as AuFyQuarter))
  }

  y = fyStartYear
  q = quarter as number
  for (let i = 0; i < pastQuarters; i++) {
    q -= 1
    if (q < 1) {
      q = 4
      y -= 1
    }
    out.push(formatAuFyPeriodId(y, q as AuFyQuarter))
  }

  return out
}

/** Shared class for AU FY quarter native select (pair with a downward chevron overlay). */
export const AU_FY_QUARTER_SELECT_CLASS =
  'border rounded-lg pl-3 pr-9 py-2 text-sm min-w-[16rem] appearance-none bg-white'

export function displayFundraisingPeriod(period: string): string {
  const parsed = parseFundraisingPeriod(period)
  if (!parsed) return period
  if (parsed.kind === 'au_fy_quarter') {
    return formatAuFyQuarterLabel(parsed.fyStartYear, parsed.quarter)
  }
  return period
}

export function payoutDueDisplayForPeriod(period: string): string | null {
  const parsed = parseFundraisingPeriod(period)
  if (!parsed || parsed.kind !== 'au_fy_quarter') return null
  return formatGrantPayoutDueDateDisplay(parsed.fyStartYear, parsed.quarter)
}

function sydneyYmd(d: Date): { y: number; m: number; day: number; key: number } {
  const { year, month, day } = calendarPartsInSydney(d)
  return { y: year, m: month, day, key: year * 10000 + month * 100 + day }
}

function utcYmdKey(d: Date): number {
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

function utcYmdParts(d: Date): { y: number; m: number; day: number } {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/**
 * Whole calendar days between two Y-M-D values (not YYYYMMDD key subtraction —
 * e.g. 20261015 - 20260807 = 208 but real days = 69).
 */
export function calendarDaysBetweenYmd(
  from: { y: number; m: number; day: number },
  to: { y: number; m: number; day: number }
): number {
  const start = Date.UTC(from.y, from.m - 1, from.day)
  const end = Date.UTC(to.y, to.m - 1, to.day)
  return Math.round((end - start) / 86_400_000)
}

/** Calendar days from Australia/Sydney today to a UTC calendar date (payout / quarter end). */
export function calendarDaysFromSydneyToday(to: Date, now = new Date()): number {
  return calendarDaysBetweenYmd(sydneyYmd(now), utcYmdParts(to))
}

function shiftAuFyQuarter(
  fyStartYear: number,
  quarter: AuFyQuarter,
  delta: number
): { fyStartYear: number; quarter: AuFyQuarter } {
  let y = fyStartYear
  let q = (quarter as number) + delta
  while (q < 1) {
    q += 4
    y -= 1
  }
  while (q > 4) {
    q -= 4
    y += 1
  }
  return { fyStartYear: y, quarter: q as AuFyQuarter }
}

export function formatAuFyQuarterEndDisplay(fyStartYear: number, quarter: AuFyQuarter): string {
  const { endIso } = auFyQuarterBounds(fyStartYear, quarter)
  const end = new Date(endIso)
  return end.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Last Sydney calendar day of the settlement freeze (inclusive).
 * Quarter ends day D → freeze covers D+1 … D+N (N = settlementFreezeCalendarDays).
 * Final lock is allowed from the calendar day after that.
 */
export function settlementFreezeEndYmd(
  fyStartYear: number,
  quarter: AuFyQuarter
): { year: number; month: number; day: number; key: number } {
  const { endIso } = auFyQuarterBounds(fyStartYear, quarter)
  const end = new Date(endIso)
  // Advance N calendar days from quarter-end UTC date (bounds use calendar month ends).
  const freezeEnd = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + FUNDRAISING_GRANT_PAYOUT_POLICY.settlementFreezeCalendarDays, 12, 0, 0)
  )
  return {
    year: freezeEnd.getUTCFullYear(),
    month: freezeEnd.getUTCMonth() + 1,
    day: freezeEnd.getUTCDate(),
    key: utcYmdKey(freezeEnd),
  }
}

export function formatSettlementFreezeEndDisplay(fyStartYear: number, quarter: AuFyQuarter): string {
  const f = settlementFreezeEndYmd(fyStartYear, quarter)
  const d = new Date(Date.UTC(f.year, f.month - 1, f.day, 12, 0, 0))
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** True while Sydney "today" is after quarter end and on/before freeze end day. */
export function isSettlementFreezeActive(
  fyStartYear: number,
  quarter: AuFyQuarter,
  now = new Date()
): boolean {
  const todayKey = sydneyYmd(now).key
  const endKey = utcYmdKey(new Date(auFyQuarterBounds(fyStartYear, quarter).endIso))
  const freezeKey = settlementFreezeEndYmd(fyStartYear, quarter).key
  return todayKey > endKey && todayKey <= freezeKey
}

/** Final Generate Settlement / lock allowed after freeze end (Sydney). */
export function isFinalSettlementAllowed(
  fyStartYear: number,
  quarter: AuFyQuarter,
  now = new Date()
): boolean {
  const todayKey = sydneyYmd(now).key
  const endKey = utcYmdKey(new Date(auFyQuarterBounds(fyStartYear, quarter).endIso))
  const freezeKey = settlementFreezeEndYmd(fyStartYear, quarter).key
  if (todayKey <= endKey) return false // still earning
  return todayKey > freezeKey
}

/**
 * Simple admin gate for Generate / Mark Paid (no override UX).
 * Legacy YYYY-MM periods stay allowed.
 */
export function getSettlementActionsGate(
  period: string,
  now = new Date()
): { allowed: boolean; message: string } {
  const parsed = parseFundraisingPeriod(period)
  if (!parsed) return { allowed: true, message: '' }
  if (parsed.kind === 'month') return { allowed: true, message: '' }

  const { fyStartYear, quarter } = parsed
  if (isFinalSettlementAllowed(fyStartYear, quarter, now)) {
    return { allowed: true, message: '' }
  }

  if (isSettlementFreezeActive(fyStartYear, quarter, now)) {
    return {
      allowed: false,
      message: `Cancel window (7 days). Generate / Mark Paid unlock after ${formatSettlementFreezeEndDisplay(fyStartYear, quarter)}.`,
    }
  }

  return {
    allowed: false,
    message: `Quarter still open (ends ${formatAuFyQuarterEndDisplay(fyStartYear, quarter)}). Settlement unlocks 7 days after that.`,
  }
}

export type NextGrantTransferPhase =
  | 'earning'
  | 'settlement_freeze'
  | 'quarter_closed'
  | 'transfer_due_soon'
  | 'transfer_overdue'

/** Partner / admin countdown for the next relevant AU FY grant transfer. */
export type NextGrantTransferInfo = {
  periodId: string
  periodLabel: string
  quarterEndDisplay: string
  freezeEndDisplay: string
  targetPayoutDisplay: string
  targetPayoutIso: string
  daysUntilPayout: number
  daysUntilQuarterEnd: number | null
  daysUntilFreezeEnd: number | null
  phase: NextGrantTransferPhase
  isCurrentEarningQuarter: boolean
  finalSettlementAllowed: boolean
  partnerHeadline: string
  partnerDetail: string
  adminDetail: string
}

/**
 * Next transfer focus: earliest target payout still on/after today (Sydney),
 * else the current open quarter (earning toward its future payout).
 */
export function getNextGrantTransferInfo(now = new Date()): NextGrantTransferInfo {
  const cur = auFyQuarterParts(now)
  const prev = shiftAuFyQuarter(cur.fyStartYear, cur.quarter, -1)
  const candidates = [
    { fyStartYear: prev.fyStartYear, quarter: prev.quarter },
    { fyStartYear: cur.fyStartYear, quarter: cur.quarter },
  ]

  const today = sydneyYmd(now)
  const todayKey = today.key
  const withDue = candidates.map((c) => {
    const due = grantPayoutDueDate(c.fyStartYear, c.quarter)
    return { ...c, due, dueKey: utcYmdKey(due) }
  })

  const upcoming = withDue.filter((c) => c.dueKey >= todayKey).sort((a, b) => a.dueKey - b.dueKey)
  const focus = upcoming[0] || withDue[withDue.length - 1]!

  const periodId = formatAuFyPeriodId(focus.fyStartYear, focus.quarter)
  const periodLabel = formatAuFyQuarterLabel(focus.fyStartYear, focus.quarter)
  const quarterEndDisplay = formatAuFyQuarterEndDisplay(focus.fyStartYear, focus.quarter)
  const freezeEndDisplay = formatSettlementFreezeEndDisplay(focus.fyStartYear, focus.quarter)
  const targetPayoutDisplay = formatGrantPayoutDueDateDisplay(focus.fyStartYear, focus.quarter)
  const targetPayoutIso = focus.due.toISOString().slice(0, 10)
  const daysUntilPayout = calendarDaysFromSydneyToday(focus.due, now)

  const { endIso } = auFyQuarterBounds(focus.fyStartYear, focus.quarter)
  const endDate = new Date(endIso)
  const endKey = utcYmdKey(endDate)
  const freeze = settlementFreezeEndYmd(focus.fyStartYear, focus.quarter)
  const freezeDate = new Date(Date.UTC(freeze.year, freeze.month - 1, freeze.day, 12, 0, 0))
  const daysUntilQuarterEnd = endKey >= todayKey ? calendarDaysFromSydneyToday(endDate, now) : null
  const daysUntilFreezeEnd =
    todayKey <= endKey ? null : freeze.key >= todayKey ? calendarDaysFromSydneyToday(freezeDate, now) : null
  const isCurrentEarningQuarter =
    focus.fyStartYear === cur.fyStartYear && focus.quarter === cur.quarter && daysUntilQuarterEnd != null
  const finalSettlementAllowed = isFinalSettlementAllowed(focus.fyStartYear, focus.quarter, now)

  let phase: NextGrantTransferPhase
  if (daysUntilQuarterEnd != null && daysUntilQuarterEnd > 0) phase = 'earning'
  else if (isSettlementFreezeActive(focus.fyStartYear, focus.quarter, now)) phase = 'settlement_freeze'
  else if (daysUntilPayout < 0) phase = 'transfer_overdue'
  else if (daysUntilPayout <= 14) phase = 'transfer_due_soon'
  else phase = 'quarter_closed'

  const countdown =
    daysUntilPayout > 1
      ? `in ${daysUntilPayout} days`
      : daysUntilPayout === 1
        ? 'tomorrow'
        : daysUntilPayout === 0
          ? 'today'
          : `${Math.abs(daysUntilPayout)} day${Math.abs(daysUntilPayout) === 1 ? '' : 's'} past target`

  let partnerHeadline = 'Next grant transfer'
  let partnerDetail = ''
  let adminDetail = ''

  if (phase === 'earning') {
    partnerDetail = `Support is still being counted for ${periodLabel}. After the quarter ends, figures finalise over ${FUNDRAISING_GRANT_PAYOUT_POLICY.settlementFreezeCalendarDays} days (cancellations/refunds), then transfer is targeted for ${targetPayoutDisplay} (${countdown}).`
    adminDetail = `Earning window open for ${periodId}. Quarter ends ${quarterEndDisplay}. Freeze ends ${freezeEndDisplay}. Target payout ${targetPayoutDisplay} (${countdown}).`
  } else if (phase === 'settlement_freeze') {
    partnerHeadline = 'Finalising this quarter'
    partnerDetail = `${periodLabel} has ended. SELPIC is allowing ${FUNDRAISING_GRANT_PAYOUT_POLICY.settlementFreezeCalendarDays} days for cancellations and refunds before locking the amount (freeze ends ${freezeEndDisplay}). Target transfer: ${targetPayoutDisplay} (${countdown}). New orders now count toward the next quarter.`
    adminDetail = `${periodId} in ${FUNDRAISING_GRANT_PAYOUT_POLICY.settlementFreezeCalendarDays}-day freeze until ${freezeEndDisplay}${daysUntilFreezeEnd != null ? ` (${daysUntilFreezeEnd} day${daysUntilFreezeEnd === 1 ? '' : 's'} left)` : ''}. Prefer Generate Settlement after freeze. Target payout ${targetPayoutDisplay}.`
  } else if (phase === 'quarter_closed') {
    partnerDetail = `This quarter has closed (${periodLabel}). Final figures are locked after the freeze. SELPIC targets transfer by ${targetPayoutDisplay} (${countdown}).`
    adminDetail = `${periodId} freeze ended ${freezeEndDisplay}. Generate / pay by target ${targetPayoutDisplay} (${countdown}).`
  } else if (phase === 'transfer_due_soon') {
    partnerHeadline = 'Transfer window'
    partnerDetail = `Your Fundraising Cashback Grant for ${periodLabel} is targeted for ${targetPayoutDisplay} (${countdown}).`
    adminDetail = `Payout due soon for ${periodId}: ${targetPayoutDisplay} (${countdown}). Ready → Mark Paid → D9/D10.`
  } else {
    partnerHeadline = 'Transfer in progress'
    partnerDetail = `Target payout for ${periodLabel} was ${targetPayoutDisplay} (${countdown}). SELPIC completes bank transfer on the next banking day when needed.`
    adminDetail = `Target payout for ${periodId} was ${targetPayoutDisplay} (${countdown}). Check Ready rows and complete Mark Paid.`
  }

  return {
    periodId,
    periodLabel,
    quarterEndDisplay,
    freezeEndDisplay,
    targetPayoutDisplay,
    targetPayoutIso,
    daysUntilPayout,
    daysUntilQuarterEnd,
    daysUntilFreezeEnd,
    phase,
    isCurrentEarningQuarter,
    finalSettlementAllowed,
    partnerHeadline,
    partnerDetail,
    adminDetail,
  }
}
