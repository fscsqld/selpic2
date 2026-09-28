import { describe, expect, it } from 'vitest'
import {
  labelBottomReservedMm,
  maxLinesThatFit,
  takeLinesWithEllipsis,
} from './shippingLabelContentFit'

describe('shippingLabelContentFit', () => {
  it('reserves barcode + FROM band', () => {
    // barH 11 + fromBlockH 15 + gap 2 (shared portrait/landscape)
    expect(labelBottomReservedMm(11, 15, 2)).toBe(28)
  })

  it('landscape-short mid band often cannot fit 3 item lines', () => {
    // Virtual landscape height 99.1; bottom reserve 28 → midMaxY ≈ 68.1
    const midMaxY = 99.1 - 3 - 28
    // After address + service, Items often start near ~58–62
    expect(maxLinesThatFit({ startY: 58, maxY: midMaxY, lineHeight: 3.5, maxCap: 3 })).toBe(2)
    expect(maxLinesThatFit({ startY: 62, maxY: midMaxY, lineHeight: 3.5, maxCap: 3 })).toBe(1)
    expect(maxLinesThatFit({ startY: 70, maxY: midMaxY, lineHeight: 3.5, maxCap: 3 })).toBe(0)
  })

  it('portrait tall mid band still allows up to maxCap', () => {
    const midMaxY = 139 - 3 - 28
    expect(maxLinesThatFit({ startY: 70, maxY: midMaxY, lineHeight: 3.5, maxCap: 3 })).toBe(3)
  })

  it('ellipsis when truncating wrapped lines', () => {
    expect(takeLinesWithEllipsis(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b…'])
    expect(takeLinesWithEllipsis(['only'], 3)).toEqual(['only'])
    expect(takeLinesWithEllipsis(['a', 'b'], 0)).toEqual([])
  })
})
