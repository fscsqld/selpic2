import { describe, expect, it } from 'vitest'
import {
  PO_SYSTEM_SHIP_PRESETS,
  buildDomesticHubInstructionBlock,
  cartonMarkSample,
  getPoSystemShipPreset,
  syncCartonMarkingToPoNumber,
} from './poHubPresets'
import { applyFinalizedPoNumber, getDefaultPurchaseOrderDoc } from './purchaseOrderDefaults'

describe('PO system ship presets (no seeded KR forwarders)', () => {
  it('only ships SELPIC AU + Custom as built-ins', () => {
    expect(PO_SYSTEM_SHIP_PRESETS.map((p) => p.id)).toEqual(['selpic_au', 'custom'])
    expect(getPoSystemShipPreset('selpic_au')?.mode).toBe('selpic')
    // Fake Forwarder A/B placeholders must not ship as defaults.
    expect(PO_SYSTEM_SHIP_PRESETS.some((p) => p.label.includes('Forwarder A'))).toBe(false)
  })

  it('builds approved domestic hub block with forwarder + Air/Sea + carton', () => {
    const block = buildDomesticHubInstructionBlock({
      forwarderName: 'Sample Forwarder Co',
      transportMode: 'sea',
      recipientName: '브리즈번해상',
      phone: '010-2846-3366',
      address: '경기도 김포시 승가로 110-30 (SELPIC / +61 466 894 279)',
      destinationIdentifier: '브리즈번해상',
      poNumber: 'PO-2026-10-003',
      cartonMarking: 'SELPIC / 브리즈번해상 / PO No: PO-2026-10-003',
    })
    expect(block).toContain('공급사 필독')
    expect(block).not.toContain('====')
    expect(block).toContain('Forwarder Company : Sample Forwarder Co (Sea Freight)')
    expect(block).toContain('Recipient / Attn  : 브리즈번해상')
    expect(block).toContain('Phone Number      : 010-2846-3366')
    expect(block).toContain(
      'Domestic Address  : 경기도 김포시 승가로 110-30 (SELPIC / +61 466 894 279)'
    )
    expect(block).toContain('"SELPIC / 브리즈번해상 / PO No: PO-2026-10-003"')
    expect(cartonMarkSample('브리즈번항공', 'PO-1')).toContain('브리즈번항공')
  })

  it('dedupes SELPIC paren on Attn in plain-text hub block', () => {
    const block = buildDomesticHubInstructionBlock({
      forwarderName: 'Hana One Express',
      transportMode: 'sea',
      recipientName: '브리즈번해상 (SELPIC / +61 466 894 279)',
      phone: '010-2846-3366',
      address: '경기도 김포시 승가로 110-30 (SELPIC / +61 466 894 279)',
      destinationIdentifier: '브리즈번해상',
      poNumber: 'PO-2026-10-005',
      cartonMarking: 'SELPIC / 브리즈번해상 / PO No: PO-2026-10-005',
    })
    expect(block).toContain('Recipient / Attn  : 브리즈번해상')
    expect(block).not.toMatch(/Recipient \/ Attn\s+:\s+브리즈번해상 \(SELPIC/)
  })

  it('replaces PO-DRAFT-000 in carton mark when PO number is finalized', () => {
    expect(
      syncCartonMarkingToPoNumber(
        'SELPIC / 브리즈번해상 / PO No: PO-DRAFT-000',
        '브리즈번해상',
        'PO-2026-10-003',
        'PO-DRAFT-000'
      )
    ).toBe('SELPIC / 브리즈번해상 / PO No: PO-2026-10-003')
  })

  it('applyFinalizedPoNumber refreshes hub carton + instruction text', () => {
    const base = getDefaultPurchaseOrderDoc()
    const draft = {
      ...base,
      shipTo: {
        ...base.shipTo,
        mode: 'forwarder_kr' as const,
        forwarderName: 'Hana One Express',
        transportMode: 'sea' as const,
        hubCompanyName: '브리즈번해상',
        hubPhone: '010-2846-3366',
        address: '경기도 김포시 승가로 110-30',
        destinationIdentifier: '브리즈번해상',
        cartonMarking: 'SELPIC / 브리즈번해상 / PO No: PO-DRAFT-000',
      },
    }
    const next = applyFinalizedPoNumber(draft, 'PO-2026-10-003', 'sent')
    expect(next.poMeta.poNumber).toBe('PO-2026-10-003')
    expect(next.shipTo.cartonMarking).toBe('SELPIC / 브리즈번해상 / PO No: PO-2026-10-003')
    expect(next.waybillInstructions?.instructionText || '').toContain('PO-2026-10-003')
    expect(next.waybillInstructions?.instructionText || '').not.toContain('PO-DRAFT-000')
  })
})
