import { describe, expect, it } from 'vitest'
import { HANA_ONE_EXPRESS_EXAMPLE } from './poForwarderExample'
import {
  applyForwarderModeToShipTo,
  resolveCartonMarking,
  type PoForwarderRecord,
} from './poForwarderTypes'

const sampleForwarder: PoForwarderRecord = {
  id: 'fwd_hana_one',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...HANA_ONE_EXPRESS_EXAMPLE,
}

describe('PO forwarder Air/Sea mapping (Hana One schema example)', () => {
  it('resolves carton template with PO number', () => {
    expect(
      resolveCartonMarking(
        'SELPIC / 브리즈번해상 / PO No: {PO_NUMBER}',
        '브리즈번해상',
        'PO-2026-10-003'
      )
    ).toBe('SELPIC / 브리즈번해상 / PO No: PO-2026-10-003')
  })

  it('applies approved Sea vs Air waybill fields (recipient without SELPIC in Attn)', () => {
    const sea = applyForwarderModeToShipTo({
      forwarder: sampleForwarder,
      transportMode: 'sea',
      poNumber: 'PO-2026-10-003',
    })
    expect(sea.hubCompanyName).toBe('브리즈번해상')
    expect(sea.hubPhone).toBe('010-2846-3366')
    expect(sea.address).toBe('경기도 김포시 승가로 110-30 (SELPIC / +61 466 894 279)')
    expect(sea.cartonMarking).toBe('SELPIC / 브리즈번해상 / PO No: PO-2026-10-003')
    expect(sea.shipmentMethod).toBe('sea')

    const air = applyForwarderModeToShipTo({
      forwarder: sampleForwarder,
      transportMode: 'air',
      poNumber: 'PO-2026-10-003',
    })
    expect(air.hubCompanyName).toBe('브리즈번항공')
    expect(air.cartonMarking).toBe('SELPIC / 브리즈번항공 / PO No: PO-2026-10-003')
    expect(air.shipmentMethod).toBe('air')
    expect(air.address).toBe(sea.address)
  })
})
