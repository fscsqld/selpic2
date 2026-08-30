'use client'

import { Calendar, ChevronRight } from 'lucide-react'
import type { LodgmentCalendarItem } from '@/lib/ato-lodgment/lodgment-calendar'
import type { LodgmentTab } from '@/lib/ato-lodgment/types'

interface LodgmentCalendarProps {
  items: LodgmentCalendarItem[]
  activeTab: LodgmentTab
  onSelectTab: (tab: LodgmentTab) => void
  /** When nested in a collapsible, omit outer card + duplicate title */
  embedded?: boolean
}

function priorityStyle(priority: LodgmentCalendarItem['priority']): string {
  switch (priority) {
    case 'now':
      return 'border-indigo-300 bg-indigo-50'
    case 'upcoming':
      return 'border-blue-200 bg-blue-50/50'
    default:
      return 'border-gray-200 bg-white'
  }
}

export function LodgmentCalendar({
  items,
  activeTab,
  onSelectTab,
  embedded = false,
}: LodgmentCalendarProps) {
  const list = (
    <ul className="space-y-2">
      {items.map((item) => {
        const isActive = item.tab === activeTab
        return (
          <li
            key={item.id}
            className={`rounded-lg border p-3 ${priorityStyle(item.priority)} ${
              isActive ? 'ring-2 ring-indigo-400 ring-offset-1' : ''
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{item.title}</span>
                  <span className="text-[10px] uppercase font-semibold text-gray-500">
                    {item.portal === 'osb' ? 'OSB' : 'myTax'}
                  </span>
                  {item.priority === 'now' && (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">{item.periodHint}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.dueHint}</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab(item.tab)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 shrink-0"
              >
                Open tab
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <ol className="mt-2 ml-4 list-decimal text-xs text-gray-600 space-y-0.5">
              {item.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </li>
        )
      })}
    </ul>
  )

  if (embedded) {
    return <div className="print:hidden">{list}</div>
  }

  return (
    <div className="card print:hidden">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-800">Lodgment calendar</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        What to lodge, where in ATO, and which tab to use in SELPIC A.
      </p>
      {list}
    </div>
  )
}
