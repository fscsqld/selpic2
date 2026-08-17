'use client'

import { ChevronDown } from 'lucide-react'
import {
  AU_FY_QUARTER_SELECT_CLASS,
  displayFundraisingPeriod,
  listAdminAuFyQuarterPeriods,
} from '@/lib/fundraising/auFinancialQuarter'

type Props = {
  value: string
  onChange: (periodId: string) => void
  /** Past quarters to list (default 4 ≈ one year). */
  pastQuarters?: number
  /** Upcoming quarters to list (default 2). */
  futureQuarters?: number
  className?: string
  label?: string
}

/**
 * AU FY quarter picker: current → future → recent past.
 * Quarters are computed from today's Australian FY calendar (not auto-inserted DB rows).
 */
export function AuFyQuarterSelect({
  value,
  onChange,
  pastQuarters = 4,
  futureQuarters = 2,
  className = '',
  label = 'AU FY quarter',
}: Props) {
  const options = listAdminAuFyQuarterPeriods({ pastQuarters, futureQuarters })

  return (
    <label className={`text-sm ${className}`}>
      <span className="block font-medium text-gray-700 mb-1">{label}</span>
      <span className="relative inline-block min-w-[16rem]">
        <select
          className={AU_FY_QUARTER_SELECT_CLASS}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((id) => (
            <option key={id} value={id}>
              {displayFundraisingPeriod(id)}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
      </span>
    </label>
  )
}
