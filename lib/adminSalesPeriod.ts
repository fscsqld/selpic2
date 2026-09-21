/**
 * Sales overview period labels must be calendar dates, not relative "Week N".
 * Weeks match the existing Sunday–Saturday window used by the This Week card.
 */

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export const ADMIN_SALES_WEEK_COUNT = 12

export function startOfSundayWeek(ref: Date): Date {
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay())
  start.setHours(0, 0, 0, 0)
  return start
}

export function endOfSundayWeek(weekStart: Date): Date {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function listRecentSundayWeeks(
  count: number = ADMIN_SALES_WEEK_COUNT,
  ref: Date = new Date()
): Array<{ start: Date; endInclusive: Date }> {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const currentStart = startOfSundayWeek(ref)
  const weeks: Array<{ start: Date; endInclusive: Date }> = []
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(currentStart)
    start.setDate(start.getDate() - i * 7)
    weeks.push({ start, endInclusive: endOfSundayWeek(start) })
  }
  return weeks
}

export function formatAdminChartDay(
  date: Date,
  opts: { includeYear?: boolean } = {}
): string {
  const day = date.getDate()
  const month = SHORT_MONTHS[date.getMonth()]
  if (opts.includeYear) return `${day} ${month} ${date.getFullYear()}`
  return `${day} ${month}`
}

/** e.g. "20–26 Sep", "27 Sep – 3 Oct", "28 Dec 2025 – 3 Jan 2026". */
export function formatAdminWeekRangeLabel(weekStart: Date, weekEndInclusive: Date): string {
  if (weekStart.getFullYear() !== weekEndInclusive.getFullYear()) {
    return `${formatAdminChartDay(weekStart, { includeYear: true })} – ${formatAdminChartDay(weekEndInclusive, { includeYear: true })}`
  }
  if (weekStart.getMonth() !== weekEndInclusive.getMonth()) {
    return `${formatAdminChartDay(weekStart)} – ${formatAdminChartDay(weekEndInclusive)}`
  }
  return `${weekStart.getDate()}–${weekEndInclusive.getDate()} ${SHORT_MONTHS[weekStart.getMonth()]}`
}
