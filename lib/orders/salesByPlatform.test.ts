import { describe, expect, it } from 'vitest'
import { aggregateSalesByPlatform } from './salesByPlatform'

describe('aggregateSalesByPlatform', () => {
  it('splits revenue by platform and ignores cancelled', () => {
    const rows = aggregateSalesByPlatform([
      { platformSource: 'website', total: 100, status: 'paid' },
      { platformSource: 'ebay', total: 50, status: 'processing' },
      { platformSource: 'amazon', total: 25, status: 'shipped' },
      { platformSource: 'ebay', total: 999, status: 'cancelled' },
      { total: 10, status: 'pending' },
    ])
    const byId = Object.fromEntries(rows.map((r) => [r.platform, r]))
    expect(byId.website.revenue).toBe(110)
    expect(byId.website.orders).toBe(2)
    expect(byId.ebay.revenue).toBe(50)
    expect(byId.ebay.orders).toBe(1)
    expect(byId.amazon.revenue).toBe(25)
    expect(byId.etsy.orders).toBe(0)
    expect(byId.website.sharePct + byId.ebay.sharePct + byId.amazon.sharePct).toBeCloseTo(100, 5)
  })
})
