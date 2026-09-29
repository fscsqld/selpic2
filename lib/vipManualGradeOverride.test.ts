import { describe, expect, it } from 'vitest'
import {
  clampVipGradeCode,
  normalizeVipOverrideEmail,
  parseVipManualGradeOverridesValue,
  resolveEffectiveVipGradeCode,
} from './vipManualGradeOverride'

describe('vipManualGradeOverride', () => {
  it('normalizes email and clamps grade', () => {
    expect(normalizeVipOverrideEmail('  Test@Selpic.com.au ')).toBe('test@selpic.com.au')
    expect(clampVipGradeCode(3)).toBe(3)
    expect(clampVipGradeCode(9)).toBeNull()
    expect(clampVipGradeCode(-1)).toBeNull()
  })

  it('parses snapshot by email', () => {
    const snap = parseVipManualGradeOverridesValue({
      updatedAt: '2026-09-29',
      byEmail: {
        'test@selpic.com.au': {
          email: 'Test@Selpic.com.au',
          gradeCode: 2,
          reason: 'local QA',
          updatedAt: '2026-09-29',
        },
      },
    })
    expect(snap.byEmail['test@selpic.com.au']?.gradeCode).toBe(2)
  })

  it('prefers manual override over sales grade; otherwise sales grade', () => {
    expect(
      resolveEffectiveVipGradeCode(0, {
        email: 'a@b.com',
        gradeCode: 3,
        updatedAt: '',
      })
    ).toEqual({ gradeCode: 3, fromManualOverride: true })
    expect(resolveEffectiveVipGradeCode(1, null)).toEqual({
      gradeCode: 1,
      fromManualOverride: false,
    })
  })
})
