'use client'

import { formatTransportModeLabel } from '@/lib/poHubPresets'
import { normalizeHubRecipientForDisplay } from '@/lib/poDisplayNormalize'

export type PoHubInstructionCardProps = {
  forwarderName?: string
  transportMode?: 'sea' | 'air' | string
  recipientName: string
  phone: string
  address: string
  cartonMarking: string
  /** Compact for admin form preview */
  compact?: boolean
}

/**
 * Structured Ship To / Domestic Logistics Hub block for PDF + admin preview.
 * Type scale tuned for A4 trade docs (labels ~11px, values ~12px, carton mark emphasized).
 */
export default function PoHubInstructionCard({
  forwarderName,
  transportMode,
  recipientName,
  phone,
  address,
  cartonMarking,
  compact = false,
}: PoHubInstructionCardProps) {
  const forwarder = (forwarderName || '').trim() || '—'
  const transport = formatTransportModeLabel(transportMode)
  const recipient = normalizeHubRecipientForDisplay(recipientName, address)
  const phoneLine = (phone || '').trim() || '—'
  const addressLine = (address || '').trim() || '—'
  const carton = (cartonMarking || '').trim() || '—'

  const rows: { label: string; value: string }[] = [
    {
      label: 'Forwarder Company',
      value: `${forwarder} (${transport})`,
    },
    { label: 'Recipient / Attn', value: recipient },
    { label: 'Phone Number', value: phoneLine },
    { label: 'Domestic Address', value: addressLine },
  ]

  return (
    <div
      className={
        compact
          ? 'border border-amber-200 bg-white rounded-md px-3 py-2 text-[11px] text-slate-800 leading-[1.4]'
          : 'border border-amber-200 bg-white rounded-md px-3 py-2.5 text-slate-800 leading-[1.4]'
      }
    >
      <p className="font-bold text-slate-900 text-[12px] tracking-wide leading-tight">
        Ship To / Domestic Logistics Hub
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
        공급처 국내 배송지 정보
      </p>
      <p className="mt-1.5 text-[10px] text-amber-900 leading-snug">
        [공급사 필독] 한국 국내 택배/화물 발송 시 아래 수취인 명의 및 주소를 정확히 기재해
        주십시오.
      </p>
      <dl className="mt-2 space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[8.75rem_1fr] gap-x-2 gap-y-0.5 items-baseline"
          >
            <dt className="text-[11px] text-slate-500 font-medium shrink-0">{row.label}</dt>
            <dd className="text-[12px] text-slate-900 font-semibold min-w-0 break-words">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2.5 pt-2 border-t border-amber-100">
        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
          Carton Marking
        </p>
        <p className="mt-0.5 text-[10px] text-slate-600 leading-snug">
          물류센터 입고 및 호주 운송 분류를 위해 모든 박스 외관에 아래 문구를 명확히 표기해
          주십시오:
        </p>
        <p className="mt-1 text-[12px] font-bold text-slate-900 break-words leading-snug">
          “{carton}”
        </p>
      </div>
    </div>
  )
}
