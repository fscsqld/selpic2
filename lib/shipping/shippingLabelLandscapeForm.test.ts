import { describe, expect, it } from 'vitest'
import {
  landscapeFormBBoxPoints,
  landscapeFormStampMatrix,
  mmToPdfPoints,
} from './shippingLabelLandscapeForm'

/** jsPDF default for unit: 'mm' */
const SF = 72 / 25.4

describe('shippingLabelLandscapeForm', () => {
  it('scales mm to PDF points', () => {
    expect(mmToPdfPoints(25.4, SF)).toBeCloseTo(72, 5)
    expect(mmToPdfPoints(139, SF)).toBeCloseTo(394.0157, 3)
    expect(mmToPdfPoints(99.1, SF)).toBeCloseTo(280.9134, 3)
  })

  it('Form BBox is point-sized (not raw mm) so content is not clipped', () => {
    const { widthPt, heightPt } = landscapeFormBBoxPoints(139, 99.1, SF)
    expect(widthPt).toBeGreaterThan(350)
    expect(heightPt).toBeGreaterThan(250)
    expect(widthPt).not.toBeCloseTo(139, 0)
    expect(heightPt).not.toBeCloseTo(99.1, 0)
  })

  it('stamp matrix is a proper 90° CCW rotation (det = +1), not a mirror', () => {
    const m = landscapeFormStampMatrix({
      cellXMm: 5.01,
      cellYMm: 7.06,
      cellWidthMm: 99.1,
      cellHeightMm: 139,
      formWidthMm: 139,
      formHeightMm: 99.1,
      pageHeightMm: 297,
      scaleFactor: SF,
    })
    expect(m.a).toBe(0)
    expect(m.b).toBe(1)
    expect(m.c).toBe(-1)
    expect(m.d).toBe(0)
    // det = a*d - b*c = 0 - 1*(-1) = +1
    expect(m.a * m.d - m.b * m.c).toBe(1)
    // Must not be the old mirror Matrix(0,1,1,0,…)
    expect(m.c).not.toBe(1)

    const pdfX = 5.01 * SF
    const pdfY = (297 - 7.06 - 139) * SF
    const vhPt = 99.1 * SF
    expect(m.e).toBeCloseTo(pdfX + vhPt, 3)
    expect(m.f).toBeCloseTo(pdfY, 3)
  })

  it('maps form corners into the Avery top-left cell', () => {
    const m = landscapeFormStampMatrix({
      cellXMm: 5.01,
      cellYMm: 7.06,
      cellWidthMm: 99.1,
      cellHeightMm: 139,
      formWidthMm: 139,
      formHeightMm: 99.1,
      pageHeightMm: 297,
      scaleFactor: SF,
    })
    const vw = 139 * SF
    const vh = 99.1 * SF
    const map = (x: number, y: number) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
    const cell = {
      x0: 5.01 * SF,
      y0: (297 - 7.06 - 139) * SF,
      x1: (5.01 + 99.1) * SF,
      y1: (297 - 7.06) * SF,
    }
    for (const [x, y] of [
      [0, 0],
      [vw, 0],
      [0, vh],
      [vw, vh],
    ] as const) {
      const [px, py] = map(x, y)
      expect(px).toBeGreaterThanOrEqual(cell.x0 - 0.5)
      expect(px).toBeLessThanOrEqual(cell.x1 + 0.5)
      expect(py).toBeGreaterThanOrEqual(cell.y0 - 0.5)
      expect(py).toBeLessThanOrEqual(cell.y1 + 0.5)
    }
  })

  it('bottom-right cell stamp stays in that cell', () => {
    const cellX = 5.01 + 99.1 + 2.4
    const cellY = 7.06 + 139
    const m = landscapeFormStampMatrix({
      cellXMm: cellX,
      cellYMm: cellY,
      cellWidthMm: 99.1,
      cellHeightMm: 139,
      formWidthMm: 139,
      formHeightMm: 99.1,
      pageHeightMm: 297,
      scaleFactor: SF,
    })
    const vw = 139 * SF
    const vh = 99.1 * SF
    const map = (x: number, y: number) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
    const [px, py] = map(0, 0)
    expect(px).toBeGreaterThan(280)
    expect(py).toBeLessThan(50)
    const [px2, py2] = map(vw, vh)
    expect(px2).toBeGreaterThan(280)
    expect(py2).toBeGreaterThan(20)
  })
})
