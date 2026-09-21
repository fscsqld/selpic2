import { describe, expect, it } from 'vitest'
import { ADMIN_CHART_DEFAULT_HEIGHT, isSafeRechartsBox } from './adminChartLayout'

describe('isSafeRechartsBox', () => {
  it('rejects the Recharts -1/-1 first-paint case', () => {
    expect(isSafeRechartsBox(-1, -1)).toBe(false)
  })

  it('rejects zero width or height (collapsed grid / hidden tab)', () => {
    expect(isSafeRechartsBox(0, ADMIN_CHART_DEFAULT_HEIGHT)).toBe(false)
    expect(isSafeRechartsBox(640, 0)).toBe(false)
  })

  it('rejects non-finite measurements', () => {
    expect(isSafeRechartsBox(Number.NaN, 320)).toBe(false)
    expect(isSafeRechartsBox(640, Number.POSITIVE_INFINITY)).toBe(false)
  })

  it('allows a measured admin chart box', () => {
    expect(isSafeRechartsBox(640, ADMIN_CHART_DEFAULT_HEIGHT)).toBe(true)
  })
})
