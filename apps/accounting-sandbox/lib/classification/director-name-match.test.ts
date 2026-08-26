import { describe, expect, it } from 'vitest'
import { descriptionMatchesDirector } from '@/lib/classification/director-name-match'

describe('descriptionMatchesDirector', () => {
  it('matches full name and reversed order', () => {
    expect(descriptionMatchesDirector('Mr Jinsoo Kim Loan', 'Jinsoo Kim')).toBe(true)
    expect(descriptionMatchesDirector('KIM JINSOO TRANSFER', 'Jinsoo Kim')).toBe(true)
  })

  it('rejects empty or short director name', () => {
    expect(descriptionMatchesDirector('Jinsoo Kim Loan', '')).toBe(false)
    expect(descriptionMatchesDirector('Jinsoo Kim Loan', 'Jo')).toBe(false)
  })

  it('rejects partial surname-only matches', () => {
    expect(descriptionMatchesDirector('Mrs Hee Kim', 'Jinsoo Kim')).toBe(false)
  })
})
