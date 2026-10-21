/**
 * Canonical schema example: Hana One Express waybill rules.
 * For tests / admin placeholders ONLY — never auto-seed into poForwarderStore.
 */
import type { PoForwarderRecord } from './poForwarderTypes'

export const HANA_ONE_EXPRESS_EXAMPLE: Omit<
  PoForwarderRecord,
  'id' | 'createdAt' | 'updatedAt'
> = {
  name: 'Hana One Express (하나원택배)',
  isActive: true,
  modes: {
    sea: {
      recipientAttn: '브리즈번해상',
      hubPhone: '010-2846-3366',
      domesticAddress: '경기도 김포시 승가로 110-30 (SELPIC / +61 466 894 279)',
      cartonMarkingTemplate: 'SELPIC / 브리즈번해상 / PO No: {PO_NUMBER}',
      destinationLabel: '브리즈번해상',
    },
    air: {
      recipientAttn: '브리즈번항공',
      hubPhone: '010-2846-3366',
      domesticAddress: '경기도 김포시 승가로 110-30 (SELPIC / +61 466 894 279)',
      cartonMarkingTemplate: 'SELPIC / 브리즈번항공 / PO No: {PO_NUMBER}',
      destinationLabel: '브리즈번항공',
    },
  },
}
