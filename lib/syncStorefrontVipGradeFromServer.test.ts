import { describe, expect, it } from 'vitest'
import { buildVipGradeUserPatch } from './syncStorefrontVipGradeFromServer'

describe('buildVipGradeUserPatch', () => {
  it('maps manual override so local sales recompute will not clobber grade', () => {
    const patch = buildVipGradeUserPatch({
      gradeCode: 3,
      totalSales: 50,
      fromManualOverride: true,
    })
    expect(patch.currentGrade).toBe(3)
    expect(patch.manualGradeOverride).toBe(true)
    expect(patch.totalSalesAmount).toBe(50)
  })

  it('clears override flag when server says sales-derived', () => {
    const patch = buildVipGradeUserPatch({
      gradeCode: 1,
      totalSales: 150,
      fromManualOverride: false,
    })
    expect(patch.currentGrade).toBe(1)
    expect(patch.manualGradeOverride).toBe(false)
  })

  it('clamps invalid grade codes into 0–4', () => {
    expect(buildVipGradeUserPatch({ gradeCode: 99, totalSales: 0, fromManualOverride: false }).currentGrade).toBe(4)
    expect(buildVipGradeUserPatch({ gradeCode: -2, totalSales: 0, fromManualOverride: false }).currentGrade).toBe(0)
  })
})
