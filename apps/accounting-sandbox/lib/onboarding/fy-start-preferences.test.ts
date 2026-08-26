import { describe, expect, it } from 'vitest'
import {
  buildFyStartPreferences,
  getFyStartGuidance,
  needsPriorQuarterSetup,
  resolvePriorQuarterHandling,
} from '@/lib/onboarding/fy-start-preferences'

describe('fy-start-preferences', () => {
  it('forces first_in_fy when starting at Q1', () => {
    const prefs = buildFyStartPreferences({
      startingQuarter: 1,
      financialYear: '2025-2026',
      priorQuarterHandling: 'upload_prior_pdfs',
    })
    expect(prefs.priorQuarterHandling).toBe('first_in_fy')
    expect(needsPriorQuarterSetup(1, 'first_in_fy')).toBe(false)
  })

  it('keeps prior handling for Q3 start', () => {
    const handling = resolvePriorQuarterHandling(3, 'prior_lodged_snapshot')
    expect(handling).toBe('prior_lodged_snapshot')
    expect(needsPriorQuarterSetup(3, handling)).toBe(true)
  })

  it('returns upload guidance for mid-FY with PDFs', () => {
    const prefs = buildFyStartPreferences({
      startingQuarter: 3,
      financialYear: '2025-2026',
      priorQuarterHandling: 'upload_prior_pdfs',
    })
    const g = getFyStartGuidance(prefs)
    expect(g.headline).toContain('Q3')
    expect(g.nextSteps.length).toBeGreaterThan(2)
    expect(g.nextSteps[0]).toMatch(/Upload bank PDFs/i)
  })

  it('returns lodged snapshot guidance', () => {
    const prefs = buildFyStartPreferences({
      startingQuarter: 4,
      financialYear: '2025-2026',
      priorQuarterHandling: 'prior_lodged_snapshot',
    })
    const g = getFyStartGuidance(prefs)
    expect(g.summary).toMatch(/do not lodge again/i)
  })
})
