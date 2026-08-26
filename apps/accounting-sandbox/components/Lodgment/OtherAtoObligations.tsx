'use client'

import { AlertTriangle, FileText } from 'lucide-react'
import { hasFbtActivity, hasPayrollActivity } from '@/lib/ato-lodgment/other-obligations'

type TxLike = {
  category?: string | null
  description?: string | null
  isFBTRelevant?: boolean
  isFBTReportable?: boolean
}

interface OtherAtoObligationsProps {
  transactions: TxLike[]
  /** When nested in a collapsible, omit outer card + title */
  embedded?: boolean
}

/**
 * Surface non-BAS / non-CTR obligations that may still be due (payroll, FBT).
 */
export function OtherAtoObligations({
  transactions,
  embedded = false,
}: OtherAtoObligationsProps) {
  const payroll = hasPayrollActivity(transactions)
  const fbt = hasFbtActivity(transactions)

  const body = !payroll && !fbt ? (
    <p className="text-sm text-slate-600">
      No payroll or FBT activity detected in this period. If you pay staff or provide fringe
      benefits outside this ledger, check ATO Online Services separately.
    </p>
  ) : (
    <div className="space-y-3">
      {!embedded && (
        <p className="text-sm text-slate-600">
          Activity in this period may trigger lodgments beyond BAS / CTR.
        </p>
      )}
      <ul className="space-y-2 text-sm text-slate-700">
        {payroll && (
          <li className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2">
            <strong>Payroll / PAYG withholding:</strong> confirm STP lodgments and any BAS W1/W2
            labels match your pay runs.
          </li>
        )}
        {fbt && (
          <li className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2">
            <strong>Fringe benefits tax (FBT):</strong> review the FBT year (1 Apr–31 Mar) and
            lodge an FBT return if benefits were provided.
          </li>
        )}
      </ul>
    </div>
  )

  if (embedded) {
    return <div className="print:hidden">{body}</div>
  }

  if (!payroll && !fbt) {
    return (
      <div className="card border-slate-100 print:hidden">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Other ATO obligations</h3>
            <div className="mt-1">{body}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card border-amber-100 print:hidden">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-800">Other ATO obligations</h3>
          <div className="mt-1">{body}</div>
        </div>
      </div>
    </div>
  )
}
