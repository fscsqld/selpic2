import { describe, expect, it } from 'vitest'
import { isStickerSheetSpecDescription } from './stickerSheetSpecDescription'

describe('isStickerSheetSpecDescription', () => {
  it('detects Combo Pack dual-size lines', () => {
    expect(
      isStickerSheetSpecDescription(
        '30×15mm | 24 Labels per Sheet + 46×15mm | 16 Labels per Sheet'
      )
    ).toBe(true)
  })

  it('detects single-size sheet lines', () => {
    expect(isStickerSheetSpecDescription('46×15mm | 16 Labels per Sheet')).toBe(true)
  })

  it('rejects normal marketing descriptions', () => {
    expect(
      isStickerSheetSpecDescription('Premium waterproof name stickers for school.')
    ).toBe(false)
  })
})
