import { describe, expect, it } from 'vitest'
import {
  formatPoPersonName,
  normalizeHubRecipientForDisplay,
  resolveBillToDisplay,
} from './poDisplayNormalize'

describe('poDisplayNormalize', () => {
  it('strips SELPIC paren from Attn when address already has it', () => {
    expect(
      normalizeHubRecipientForDisplay(
        '브리즈번해상 (SELPIC / +61 466 894 279)',
        '경기도 김포시 승가로 110-30 (SELPIC / +61 466 894 279)'
      )
    ).toBe('브리즈번해상')
  })

  it('keeps Attn suffix when address has no SELPIC paren', () => {
    expect(
      normalizeHubRecipientForDisplay(
        '브리즈번해상 (SELPIC / +61 466 894 279)',
        '경기도 김포시 승가로 110-30'
      )
    ).toBe('브리즈번해상 (SELPIC / +61 466 894 279)')
  })

  it('formats person names with space before parenthesis', () => {
    expect(formatPoPersonName('JLC Export(신기해 차장)')).toBe('JLC Export (신기해 차장)')
    expect(formatPoPersonName('Already (ok)')).toBe('Already (ok)')
  })

  it('unwraps legacy Bill To name with embedded ABN/ACN', () => {
    const d = resolveBillToDisplay({
      name: 'SELPIC PTY LTD (ABN: 79 694 194 011 / ACN: 694 194 011)',
      abn: '',
      acn: '',
    })
    expect(d.name).toBe('SELPIC PTY LTD')
    expect(d.abn).toBe('79 694 194 011')
    expect(d.acn).toBe('694 194 011')
  })

  it('prefers structured abn/acn when name is company only', () => {
    const d = resolveBillToDisplay({
      name: 'SELPIC PTY LTD',
      abn: '79 694 194 011',
      acn: '694 194 011',
    })
    expect(d.name).toBe('SELPIC PTY LTD')
    expect(d.abn).toBe('79 694 194 011')
    expect(d.acn).toBe('694 194 011')
  })
})
