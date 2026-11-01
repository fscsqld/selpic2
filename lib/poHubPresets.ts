/**
 * Ship To destination helpers for PO.
 *
 * System presets: SELPIC AU Warehouse + Custom only.
 * Korean forwarders (Air/Sea per company) live in `poForwarderStore` —
 * admin-registered, not hardcoded. Spec examples (Hana One, etc.) are NOT seeds.
 */

import type { PoShipmentMethod, PoShipToMode } from './purchaseOrderTypes'
import { resolveCartonMarking } from './poForwarderTypes'
import { normalizeHubRecipientForDisplay } from './poDisplayNormalize'

/** Built-in destinations that are not KR forwarder profiles. */
export interface PoSystemShipPreset {
  id: 'selpic_au' | 'custom'
  label: string
  mode: PoShipToMode
  recipientName: string
  phone: string
  domesticAddress: string
  destinationIdentifier: string
  shipmentMethod?: PoShipmentMethod
}

export const PO_SYSTEM_SHIP_PRESETS: PoSystemShipPreset[] = [
  {
    id: 'selpic_au',
    label: 'SELPIC AU Warehouse',
    mode: 'selpic',
    recipientName: 'SELPIC PTY LTD',
    phone: '+61 466 894 279',
    domesticAddress: '7 Harvest St, Mansfield QLD 4122, Australia',
    destinationIdentifier: 'AU Warehouse',
    shipmentMethod: 'sea',
  },
  {
    id: 'custom',
    label: 'Custom Address',
    mode: 'custom',
    recipientName: '',
    phone: '',
    domesticAddress: '',
    destinationIdentifier: 'Custom',
  },
]

/** @deprecated Use PO_SYSTEM_SHIP_PRESETS + poForwarderStore. Kept for old imports. */
export const PO_HUB_PRESETS = PO_SYSTEM_SHIP_PRESETS

export function getPoSystemShipPreset(
  id: string | undefined | null
): PoSystemShipPreset | undefined {
  if (!id) return undefined
  return PO_SYSTEM_SHIP_PRESETS.find((p) => p.id === id)
}

/** @deprecated */
export function getPoHubPreset(id: string | undefined | null) {
  return getPoSystemShipPreset(id)
}

export function formatTransportModeLabel(
  mode: 'sea' | 'air' | string | undefined | null
): string {
  if (mode === 'air') return 'Air Freight'
  if (mode === 'sea') return 'Sea Freight'
  const t = (mode || '').trim()
  return t || '—'
}

/**
 * Approved domestic hub instruction block for UI & PDF (KR forwarder Ship To).
 * Fields: FORWARDER_NAME, TRANSPORT_MODE, RECIPIENT_ATTN, HUB_PHONE, DOMESTIC_ADDRESS.
 * (No carton-marking section — removed from supplier-facing copy.)
 */
export function buildDomesticHubInstructionBlock(input: {
  recipientName: string
  phone: string
  address: string
  /** Kept for call-site compatibility; not shown in the block. */
  destinationIdentifier: string
  /** Kept for call-site compatibility; not shown in the block. */
  poNumber: string
  /** Kept for call-site compatibility; not shown in the block. */
  cartonMarking?: string
  /** Registered forwarder display name */
  forwarderName?: string
  /** sea | air (or already-labeled string) */
  transportMode?: 'sea' | 'air' | string
}): string {
  const forwarder = (input.forwarderName || '').trim() || '—'
  const transport = formatTransportModeLabel(input.transportMode)
  const address = (input.address || '').trim() || '—'
  const recipient = normalizeHubRecipientForDisplay(input.recipientName, address)
  const phone = (input.phone || '').trim() || '—'
  // Plain-text twin of PoHubInstructionCard (email / waybillInstructions copy).
  // Carton marking block intentionally omitted (owner: not needed on supplier instructions).
  return (
    'Ship To / Domestic Logistics Hub (공급처 국내 배송지 정보)\n' +
    '* [공급사 필독] 한국 국내 택배/화물 발송 시 아래 수취인 명의 및 주소를 정확히 기재해 주십시오.\n' +
    '\n' +
    `- Forwarder Company : ${forwarder} (${transport})\n` +
    `- Recipient / Attn  : ${recipient}\n` +
    `- Phone Number      : ${phone}\n` +
    `- Domestic Address  : ${address}`
  )
}

export function cartonMarkSample(destinationIdentifier: string, poNumber: string): string {
  return resolveCartonMarking('', destinationIdentifier, poNumber)
}

/**
 * Ensure carton mark text uses the live PO number (Download/Send finalize).
 * Snapshots often bake in `PO-DRAFT-000` when the forwarder was first applied.
 */
export function syncCartonMarkingToPoNumber(
  cartonMarking: string | undefined | null,
  destinationIdentifier: string | undefined | null,
  poNumber: string,
  previousPoNumber?: string | null
): string {
  const po = (poNumber || '').trim() || 'PO-YYYY-MM-###'
  const prev = (previousPoNumber || '').trim()
  let mark = (cartonMarking || '').trim()
  if (!mark) {
    return cartonMarkSample(destinationIdentifier || '', po)
  }
  mark = mark.replace(/\{PO_NUMBER\}/gi, po)
  if (prev && prev !== po) {
    mark = mark.split(prev).join(po)
  }
  mark = mark.replace(/\bPO-DRAFT-000\b/g, po)
  // Last-resort: "PO No: <anything>" → current number (covers stale monthly ids).
  mark = mark.replace(/(PO\s*No:\s*)(PO-[\w.-]+)/i, `$1${po}`)
  return mark
}
