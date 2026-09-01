import { describe, expect, it } from 'vitest'
import { buildPerformanceOpportunities, type PerformanceCoachInputs } from './performanceCoach'

const emptyInputs: PerformanceCoachInputs = {
  stalePendingApps: [],
  bankPendingCount: 0,
  bankPendingTotalAud: 0,
  trafficRecent7: { pageviews: 0, uniqueVisitors: 0, orders: 0 },
  trafficPrior7: { pageviews: 0, uniqueVisitors: 0, orders: 0 },
  revenueThisWeekAud: 0,
  revenuePriorWeekAud: 0,
}

describe('buildPerformanceOpportunities', () => {
  it('returns empty when no signals fire', () => {
    expect(buildPerformanceOpportunities(emptyInputs)).toEqual([])
  })

  it('surfaces stale fundraising applications', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      stalePendingApps: [{ organizationName: 'Test School', daysPending: 10 }],
    })
    expect(cards.some((c) => c.id === 'fundraising_stale_pending')).toBe(true)
  })

  it('surfaces bank transfer pending orders', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      bankPendingCount: 2,
      bankPendingTotalAud: 120.5,
    })
    const card = cards.find((c) => c.id === 'bank_transfer_pending')
    expect(card?.metric).toContain('120.50')
  })

  it('surfaces traffic up with flat conversion', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      trafficRecent7: { pageviews: 200, uniqueVisitors: 80, orders: 2 },
      trafficPrior7: { pageviews: 100, uniqueVisitors: 50, orders: 2 },
    })
    expect(cards.some((c) => c.id === 'traffic_up_conversion_flat')).toBe(true)
  })

  it('surfaces revenue week down', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      revenueThisWeekAud: 400,
      revenuePriorWeekAud: 600,
    })
    expect(cards.some((c) => c.id === 'revenue_week_down')).toBe(true)
  })
})
