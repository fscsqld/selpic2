import { describe, expect, it } from 'vitest'
import {
  bespokeInboundSubject,
  bespokePayloadDetailLines,
  formatBespokeStickerPayloadSummary,
} from './bespokeRequestSummary'

const JINSOO_PAYLOAD = {
  roll: { preset: 'Type A (Hologram)', variant: 'Hologram Medium (30mm×13mm)', notes: 'Need rush order' },
  text: {
    line1: 'EMMA',
    line2: '0466894279',
    layout: 'two',
    notes: '로고하나 넣고 싶어요 ( LOGO INCLUED)',
  },
  logo: { placementNotes: 'CENTRE' },
  font: {
    presets: { mode: 'two', line1PresetLabel: 'Font 1', line2PresetLabel: 'Font 1' },
    name: 'Custom script',
    source: 'https://example.com/font',
    notes: 'Match school branding',
    sizes: { layout: 'two', line1Pt: 16, line2Pt: 11 },
  },
  contact: {
    name: 'JINSOO KIM',
    email: 'fscsqld@gmail.com',
    phone: '0466894279',
    extra: 'Please send the sample asap by email.',
  },
}

describe('bespokePayloadDetailLines', () => {
  it('includes all customer free-text and optional fields (not JSON)', () => {
    const lines = bespokePayloadDetailLines(JINSOO_PAYLOAD)
    const labels = lines.map((l) => l.label)
    const text = formatBespokeStickerPayloadSummary(JINSOO_PAYLOAD)

    expect(labels).toContain('Roll notes')
    expect(labels).toContain('Text layout notes')
    expect(labels).toContain('Additional customer notes')
    expect(labels).toContain('Phone')
    expect(labels).toContain('Custom font name')
    expect(labels).toContain('Font notes')
    expect(labels).toContain('Font sizes')

    expect(text).toContain('로고하나 넣고 싶어요')
    expect(text).toContain('Please send the sample asap')
    expect(text).toContain('Need rush order')
    expect(text).not.toContain('"font"')
  })

  it('includes Type F character product name', () => {
    const lines = bespokePayloadDetailLines({
      roll: {
        preset: 'Type F (Additional Character Rolls)',
        characterProductName: 'Pikachu roll',
      },
    })
    expect(lines.some((l) => l.label === 'Character product name' && l.value === 'Pikachu roll')).toBe(true)
  })

  it('builds reply subject from roll variant', () => {
    expect(bespokeInboundSubject(JINSOO_PAYLOAD)).toBe(
      'Re: Your Hologram Medium (30mm×13mm) request'
    )
  })
})
