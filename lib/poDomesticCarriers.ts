/** Korean domestic carriers for PO dashboard logistics tracking. */

export const PO_DOMESTIC_CARRIERS = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'post', label: '우체국택배' },
  { value: 'logen', label: '로젠택배' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'kyungdong', label: '경동화물' },
  { value: 'other', label: '기타' },
] as const

export type PoDomesticCarrierCode = (typeof PO_DOMESTIC_CARRIERS)[number]['value']

export const PO_OPS_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'in_transit', label: 'In-Transit' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
] as const

export type PoOpsStatus = (typeof PO_OPS_STATUSES)[number]['value']

export function carrierLabel(code: string | undefined | null): string {
  const row = PO_DOMESTIC_CARRIERS.find((c) => c.value === code)
  return row?.label || (code || '').trim() || '—'
}

export function opsStatusLabel(status: string | undefined | null): string {
  const row = PO_OPS_STATUSES.find((s) => s.value === status)
  return row?.label || (status || '').trim() || 'Draft'
}
