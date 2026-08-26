import type { FieldEntryKind } from '@/lib/ato-lodgment/types'
import { entryKindLabel } from '@/lib/ato-lodgment/field-metadata'

const KIND_STYLES: Record<FieldEntryKind, string> = {
  auto: 'bg-green-100 text-green-800 border-green-200',
  review: 'bg-amber-100 text-amber-900 border-amber-200',
  manual: 'bg-slate-100 text-slate-700 border-slate-200',
}

interface EntryKindBadgeProps {
  kind: FieldEntryKind
  className?: string
}

export function EntryKindBadge({ kind, className = '' }: EntryKindBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${KIND_STYLES[kind]} ${className}`}
      title={
        kind === 'auto'
          ? 'Derived from ledger — verify before lodging'
          : kind === 'review'
            ? 'Review against source records before entering in ATO'
            : 'Enter manually in ATO — default may be zero'
      }
    >
      {entryKindLabel(kind)}
    </span>
  )
}
