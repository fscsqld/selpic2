'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, CheckCircle2, AlertTriangle, Circle } from 'lucide-react'
import { buildMonthEndChecklist, resolveMonthEndPeriodId, type MonthEndTask } from '@/lib/subledger/month-end-checklist'
import type { FinancialPeriod } from '@/lib/storage/period-types'

interface TransactionLike {
  id?: string
  date: string
  category?: string
  description?: string
}

interface MonthEndChecklistProps {
  transactions: TransactionLike[]
  financialPeriods: FinancialPeriod[]
  /** Dashboard/FY first month — only used when that month has activity */
  periodId?: string
}

function StatusIcon({ status }: { status: MonthEndTask['status'] }) {
  if (status === 'done') return <CheckCircle2 className="w-5 h-5 text-emerald-600" />
  if (status === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-500" />
  return <Circle className="w-5 h-5 text-gray-400" />
}

export function MonthEndChecklist({
  transactions,
  financialPeriods,
  periodId: preferredPeriodId,
}: MonthEndChecklistProps) {
  const [periodId, setPeriodId] = useState(() =>
    resolveMonthEndPeriodId(transactions, preferredPeriodId)
  )
  const [tasks, setTasks] = useState<MonthEndTask[]>([])
  const [readyToClose, setReadyToClose] = useState(false)
  const [blockingCount, setBlockingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Prefer a month that has bank/cash rows — not empty FY start (2025-07) from the Reports banner.
  useEffect(() => {
    setPeriodId((prev) => {
      const keepIfActive = resolveMonthEndPeriodId(transactions, prev)
      if (keepIfActive === prev) return prev
      return resolveMonthEndPeriodId(transactions, preferredPeriodId)
    })
  }, [transactions, preferredPeriodId])

  const loadChecklist = async () => {
    setIsLoading(true)
    try {
      const result = await buildMonthEndChecklist(transactions, financialPeriods, periodId)
      setTasks(result.tasks)
      setReadyToClose(result.readyToClose)
      setBlockingCount(result.blockingCount)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadChecklist()
  }, [transactions, financialPeriods, periodId])

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            Month-End Closing Checklist
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Review blocking items before locking the accounting period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Period</label>
          <input
            type="month"
            className="input w-auto"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
        </div>
      </div>

      <div
        className={`rounded-lg border px-4 py-3 ${
          readyToClose ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {readyToClose
          ? `Period ${periodId} has no blocking checklist items. You can lock the period in Settings → Period Management.`
          : `${blockingCount} blocking item(s) remain for period ${periodId}.`}
      </div>

      <ul className="space-y-3">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3"
          >
            <StatusIcon status={task.status} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{task.label}</div>
              {task.detail && <div className="text-sm text-gray-500 mt-0.5">{task.detail}</div>}
            </div>
            {typeof task.count === 'number' && task.count > 0 && (
              <span className="text-sm font-semibold text-gray-600 tabular-nums">{task.count}</span>
            )}
          </li>
        ))}
        {!isLoading && tasks.length === 0 && (
          <li className="text-center text-gray-500 py-6">No checklist items.</li>
        )}
      </ul>
    </div>
  )
}
