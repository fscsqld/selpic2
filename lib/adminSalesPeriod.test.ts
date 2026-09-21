import { describe, expect, it } from 'vitest'
import {
  formatAdminWeekRangeLabel,
  listRecentSundayWeeks,
  startOfSundayWeek,
} from './adminSalesPeriod'

describe('formatAdminWeekRangeLabel', () => {
  it('uses a date range instead of relative Week N', () => {
    const start = new Date(2026, 8, 20)
    const end = new Date(2026, 8, 26, 23, 59, 59, 999)
    const label = formatAdminWeekRangeLabel(start, end)
    expect(label).toBe('20–26 Sep')
    expect(label).not.toMatch(/^Week \d+$/)
  })

  it('keeps both month names when a week crosses months', () => {
    const start = new Date(2026, 8, 27)
    const end = new Date(2026, 9, 3, 23, 59, 59, 999)
    expect(formatAdminWeekRangeLabel(start, end)).toBe('27 Sep – 3 Oct')
  })

  it('includes years when a week crosses New Year', () => {
    const start = new Date(2025, 11, 28)
    const end = new Date(2026, 0, 3, 23, 59, 59, 999)
    expect(formatAdminWeekRangeLabel(start, end)).toBe('28 Dec 2025 – 3 Jan 2026')
  })
})

describe('listRecentSundayWeeks', () => {
  it('returns 12 Sunday-start weeks ending at the current week', () => {
    const ref = new Date(2026, 8, 21, 10, 0, 0) // Monday 21 Sep 2026
    const weeks = listRecentSundayWeeks(12, ref)
    expect(weeks).toHaveLength(12)
    expect(weeks.every((w) => w.start.getDay() === 0)).toBe(true)
    expect(weeks[11].start.getTime()).toBe(startOfSundayWeek(ref).getTime())
    expect(weeks[11].start.getDate()).toBe(20)
    expect(weeks[0].start.getDate()).toBe(5)
    expect(weeks[0].start.getMonth()).toBe(6) // 5 Jul 2026
  })

  it('does not drop a week when building 12 labels', () => {
    const weeks = listRecentSundayWeeks(12, new Date(2026, 8, 21))
    const labels = weeks.map((w) => formatAdminWeekRangeLabel(w.start, w.endInclusive))
    expect(new Set(labels).size).toBe(12)
  })
})
