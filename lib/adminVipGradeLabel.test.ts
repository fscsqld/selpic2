import { describe, expect, it } from 'vitest'
import {
  adminVipGradeLabel,
  adminVipGradeLabelFromCode,
  stripBilingualVipGradeLabel,
} from './adminVipGradeLabel'

describe('adminVipGradeLabel', () => {
  it('uses English by code even when CMS name is Hangul', () => {
    expect(adminVipGradeLabel({ code: 1, nameEn: 'Silver', name: '실버' })).toBe('Silver')
    expect(adminVipGradeLabel({ code: 4, nameEn: 'VVIP', name: 'VVIP' })).toBe('VVIP')
  })

  it('ignores polluted nameEn like Silver (실버)', () => {
    expect(adminVipGradeLabel({ code: 1, nameEn: 'Silver (실버)', name: '실버' })).toBe('Silver')
  })

  it('stripBilingualVipGradeLabel removes Hangul parenthetical', () => {
    expect(stripBilingualVipGradeLabel('Silver (실버)')).toBe('Silver')
    expect(stripBilingualVipGradeLabel('Gold (골드)')).toBe('Gold')
  })

  it('adminVipGradeLabelFromCode maps 0–4', () => {
    expect(adminVipGradeLabelFromCode(0)).toBe('Basic')
    expect(adminVipGradeLabelFromCode(3)).toBe('Black')
  })
})
