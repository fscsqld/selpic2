'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface LodgmentCollapsibleSectionProps {
  title: string
  summary: string
  /** When true, section starts expanded */
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

/**
 * Compact show/hide wrapper for long lodgment helper panels
 * (calendar, period lock, checklist details).
 */
export function LodgmentCollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
  className = '',
}: LodgmentCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`card print:hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-2 text-left"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <span className="text-[10px] uppercase tracking-wide text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
              {open ? 'Hide' : 'Show'}
            </span>
          </div>
          {!open && <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>}
        </div>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
