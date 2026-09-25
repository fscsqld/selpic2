import { describe, expect, it } from 'vitest'
import {
  formatOrderItemPersonalizationPlain,
  getMixedLabelsAdminProductionLines,
  getMixedLabelsCartDisplayLines,
  getOrderItemCustomizationDisplayLines,
  shouldSuppressOrderMerchColorChip,
  shouldSuppressOrderMerchSizeChip,
} from './mixedLabelsCartDisplay'

const mixedSample: Record<string, string> = {
  font: 'andika',
  name: 'Emma K',
  text: 'Emma K',
  color: 'Black',
  productType: 'mixed-labels',
  customizationMode: 'fixed-mixed-sheet',
  limitedEditionNote:
    'Limited edition — artwork and layout are fixed. Only the name is customized.',
  mixedSheetBundleId: '1',
  mixedSheetTemplateId: 'default',
  mixedSheetBundleLabel: '1 sheet',
  mixedSheetBundlePrice: '2.99',
  mixedSheetBundleSheets: '1',
}

describe('getMixedLabelsCartDisplayLines', () => {
  it('shows Name, Font, Colour, Sheet bundle only', () => {
    expect(getMixedLabelsCartDisplayLines(mixedSample)).toEqual([
      { label: 'Name', value: 'Emma K' },
      { label: 'Font', value: 'Andika' },
      { label: 'Colour', value: 'Black' },
      { label: 'Sheet bundle', value: '1 sheet' },
    ])
  })

  it('hides internal keys and limited-edition note', () => {
    const labels = getMixedLabelsCartDisplayLines(mixedSample).map((l) => l.label)
    expect(labels).not.toContain('productType')
    expect(labels).not.toContain('Note')
    expect(labels.join(' ')).not.toMatch(/mixedSheet|customizationMode|limited/i)
  })
})

describe('getMixedLabelsAdminProductionLines', () => {
  it('shows print-ready fields with original font casing', () => {
    expect(getMixedLabelsAdminProductionLines(mixedSample)).toEqual([
      { label: 'Print name', value: 'Emma K' },
      { label: 'Font', value: 'andika' },
      { label: 'Colour', value: 'Black' },
      { label: 'Sheets', value: '1' },
    ])
  })

  it('includes non-default template only', () => {
    const lines = getMixedLabelsAdminProductionLines({
      ...mixedSample,
      mixedSheetTemplateId: 'animals-v2',
    })
    expect(lines).toContainEqual({ label: 'Template', value: 'animals-v2' })
  })
})

describe('getOrderItemCustomizationDisplayLines audience', () => {
  it('routes mixed labels by audience', () => {
    expect(getOrderItemCustomizationDisplayLines(mixedSample, 'customer')[0].label).toBe('Name')
    expect(getOrderItemCustomizationDisplayLines(mixedSample, 'admin')[0].label).toBe('Print name')
  })
})

describe('formatOrderItemPersonalizationPlain', () => {
  it('formats indented email lines', () => {
    const plain = formatOrderItemPersonalizationPlain(mixedSample, 'customer', '   ')
    expect(plain).toBe(
      '   Name: Emma K\n   Font: Andika\n   Colour: Black\n   Sheet bundle: 1 sheet'
    )
  })
})

describe('merch chip suppressors', () => {
  it('hides mixed size/colour chips when personalization covers them', () => {
    expect(shouldSuppressOrderMerchSizeChip(mixedSample)).toBe(true)
    expect(shouldSuppressOrderMerchColorChip(mixedSample)).toBe(true)
    expect(shouldSuppressOrderMerchSizeChip({ text: 'Hi' })).toBe(false)
  })
})
