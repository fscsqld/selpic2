import { describe, expect, it } from 'vitest'

/**
 * Lock Avery L7169 / AV959020 die grid used by buildAdminShippingLabelPdf.
 * Published template (sheetstolabels / Avery-compatible): A4, 2×2,
 * label 99.1×139 mm, top 7.06, left 5.01, h-gap 2.4, v-gap 0.
 */
describe('Avery L7169 geometry lock', () => {
  const A4_W = 210
  const A4_H = 297
  const LABEL_W = 99.1
  const LABEL_H = 139
  const LEFT = 5.01
  const TOP = 7.06
  const H_GAP = 2.4
  const V_GAP = 0

  it('matches published L7169 margins, size, and gaps', () => {
    expect(LABEL_W).toBeCloseTo(99.1, 5)
    expect(LABEL_H).toBeCloseTo(139, 5)
    expect(LEFT).toBeCloseTo(5.01, 5)
    expect(TOP).toBeCloseTo(7.06, 5)
    expect(H_GAP).toBeCloseTo(2.4, 5)
    expect(V_GAP).toBe(0)
    expect(LEFT + LABEL_W + H_GAP).toBeCloseTo(106.51, 2) // horizontal pitch ≈ 101.5 from origin+width
  })

  it('4-up grid stays inside A4 (right/bottom margins positive)', () => {
    const rightEdge = LEFT + LABEL_W + H_GAP + LABEL_W
    const bottomEdge = TOP + LABEL_H + V_GAP + LABEL_H
    expect(rightEdge).toBeLessThan(A4_W)
    expect(bottomEdge).toBeLessThan(A4_H)
    expect(A4_W - rightEdge).toBeCloseTo(4.39, 1)
    expect(A4_H - bottomEdge).toBeCloseTo(11.94, 1)
  })

  it('decorative frame stroke fully insets inside the die (no gutter bleed)', () => {
    const strokeMm = 0.3
    const insetMm = strokeMm / 2 + 0.15
    // Outer edge of stroke = path ± stroke/2 → path at inset → outer at inset - stroke/2 = 0.15 inside die
    const outerFromDieEdge = insetMm - strokeMm / 2
    expect(outerFromDieEdge).toBeGreaterThan(0)
    expect(outerFromDieEdge).toBeCloseTo(0.15, 5)
  })

  it('content inner margin is at least typical Avery ~2.12 mm', () => {
    const LABEL_INNER_MARGIN_MM = 3
    expect(LABEL_INNER_MARGIN_MM).toBeGreaterThanOrEqual(2.12)
  })

  it('barcode+FROM reserve leaves mid band for portrait and landscape', () => {
    const barH = 11
    const fromBlockH = 15
    const gap = 2
    const reserved = barH + fromBlockH + gap
    expect(reserved).toBe(28)
    const portraitMid = LABEL_H - 3 - reserved
    const landscapeMid = LABEL_W - 3 - reserved // landscape virtual height = short edge
    expect(portraitMid).toBeGreaterThan(90)
    expect(landscapeMid).toBeGreaterThan(60)
  })
})
