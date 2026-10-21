/**
 * Korean logistics forwarder profiles for PO Ship To.
 *
 * Invariant: Real forwarder names/phones/addresses are NOT code defaults.
 * Admins register them in the browser (localStorage). Spec JSON examples
 * (e.g. Hana One Express) are schema illustrations only — never seed data.
 */

import type { PoShipmentMethod, PoShipToMode } from './purchaseOrderTypes'

export type PoForwarderTransportMode = 'sea' | 'air'

/** Per-mode warehouse / waybill parameters for one forwarder. */
export interface PoForwarderModeParams {
  /** Recipient / Attn (수취인 명의) */
  recipientAttn: string
  hubPhone: string
  domesticAddress: string
  /**
   * Carton mark template. Use `{PO_NUMBER}` placeholder.
   * Example: `SELPIC / 브리즈번해상 / PO No: {PO_NUMBER}`
   * If empty, falls back to `SELPIC / {destinationLabel} / PO No: {PO_NUMBER}`.
   */
  cartonMarkingTemplate: string
  /** Short label used in default carton mark / destinationIdentifier */
  destinationLabel: string
}

export interface PoForwarderRecord {
  id: string
  name: string
  modes: {
    sea: PoForwarderModeParams
    air: PoForwarderModeParams
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Empty mode shell for admin create form — no fake company data. */
export function emptyForwarderModeParams(
  destinationLabel = ''
): PoForwarderModeParams {
  return {
    recipientAttn: '',
    hubPhone: '',
    domesticAddress: '',
    cartonMarkingTemplate: destinationLabel
      ? `SELPIC / ${destinationLabel} / PO No: {PO_NUMBER}`
      : '',
    destinationLabel,
  }
}

export function createEmptyForwarderDraft(): Omit<
  PoForwarderRecord,
  'id' | 'createdAt' | 'updatedAt'
> {
  return {
    name: '',
    modes: {
      sea: emptyForwarderModeParams(''),
      air: emptyForwarderModeParams(''),
    },
    isActive: true,
  }
}

export function resolveCartonMarking(
  template: string,
  destinationLabel: string,
  poNumber: string
): string {
  const po = (poNumber || '').trim() || 'PO-YYYY-MM-###'
  const tmpl = (template || '').trim()
  if (tmpl) {
    return tmpl.replace(/\{PO_NUMBER\}/gi, po)
  }
  const dest = (destinationLabel || '').trim() || 'DEST'
  return `SELPIC / ${dest} / PO No: ${po}`
}

export function destinationIdentifierFromMode(mode: PoForwarderModeParams): string {
  const fromTemplate = (mode.cartonMarkingTemplate || '')
    .replace(/\/\s*PO No:.*/i, '')
    .replace(/^SELPIC\s*\/\s*/i, '')
    .trim()
  return (mode.destinationLabel || fromTemplate || '').trim()
}

/** Apply a registered forwarder + Air/Sea onto PO shipTo / trade fields. */
export function applyForwarderModeToShipTo(input: {
  forwarder: PoForwarderRecord
  transportMode: PoForwarderTransportMode
  poNumber: string
}): {
  mode: PoShipToMode
  forwarderId: string
  transportMode: PoForwarderTransportMode
  address: string
  hubCompanyName: string
  hubPhone: string
  destinationIdentifier: string
  cartonMarking: string
  shipmentMethod: PoShipmentMethod
  presetId: string
} {
  const params = input.forwarder.modes[input.transportMode]
  const destinationIdentifier = destinationIdentifierFromMode(params)
  const cartonMarking = resolveCartonMarking(
    params.cartonMarkingTemplate,
    params.destinationLabel,
    input.poNumber
  )
  return {
    mode: 'forwarder_kr',
    forwarderId: input.forwarder.id,
    transportMode: input.transportMode,
    address: params.domesticAddress,
    hubCompanyName: params.recipientAttn,
    hubPhone: params.hubPhone,
    destinationIdentifier,
    cartonMarking,
    shipmentMethod: input.transportMode === 'air' ? 'air' : 'sea',
    /** Stable synthetic id for UI select: forwarderId::sea|air */
    presetId: `${input.forwarder.id}::${input.transportMode}`,
  }
}
