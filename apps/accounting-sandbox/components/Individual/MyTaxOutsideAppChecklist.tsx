'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import {
  buildMyTaxOutsideSections,
  readMyTaxOutsideChecks,
  saveMyTaxOutsideChecks,
} from '@/lib/ato-lodgment/mytax-outside-app-sections'
import type { LodgmentField } from '@/lib/ato-lodgment/types'

interface MyTaxOutsideAppChecklistProps {
  financialYear: string
  fields: LodgmentField[]
  taxableIncome?: number
  compact?: boolean
}

export function MyTaxOutsideAppChecklist({
  financialYear,
  fields,
  taxableIncome,
  compact = false,
}: MyTaxOutsideAppChecklistProps) {
  const sections = useMemo(
    () => buildMyTaxOutsideSections(fields, { taxableIncome }),
    [fields, taxableIncome]
  )

  const [checks, setChecks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setChecks(readMyTaxOutsideChecks(financialYear))
  }, [financialYear, fields])

  const toggle = (id: string) => {
    const next = { ...checks, [id]: !checks[id] }
    setChecks(next)
    saveMyTaxOutsideChecks(financialYear, next)
  }

  const doneCount = sections.filter((s) => checks[s.id]).length
  const allDone = sections.length > 0 && doneCount === sections.length

  if (sections.length === 0) return null

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white ${
        compact ? 'p-3' : 'card p-4'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : ''}`}>
          Complete in myTax (outside SELPIC fields)
        </h3>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            allDone ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {doneCount} / {sections.length} reviewed
        </span>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        These sections are entered directly in myTax. Check each when done before submitting your
        return.
      </p>
      <ul className="space-y-2">
        {sections.map((section) => {
          const checked = !!checks[section.id]
          return (
            <li
              key={section.id}
              className={`flex items-start gap-2 text-sm rounded-md p-2 ${
                checked ? 'bg-green-50' : 'bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className="shrink-0 mt-0.5 text-indigo-600"
                aria-label={checked ? 'Mark not done' : 'Mark done'}
              >
                {checked ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{section.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{section.description}</p>
                <p className="text-xs text-indigo-700 mt-1">{section.myTaxPath}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
        <ExternalLink className="w-3 h-3" />
        <a
          href="https://my.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-indigo-700"
        >
          Open myGov → ATO → myTax
        </a>
      </p>
    </div>
  )
}
