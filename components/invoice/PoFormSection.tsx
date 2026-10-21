'use client'

import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/** Collapsible block for long Admin PO form sections. */
export default function PoFormSection({
  title,
  summary,
  open,
  onToggle,
  children,
  /** Keep children mounted when closed (e.g. PDF preview source). */
  keepMounted = false,
}: {
  title: string
  summary?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  keepMounted?: boolean
}) {
  return (
    <section
      className={`border border-slate-200 rounded-lg bg-white relative ${
        keepMounted ? '' : 'overflow-hidden'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="text-sm font-bold text-slate-800">{title}</span>
          {!open && summary ? (
            <span className="mt-0.5 block text-xs text-slate-500 truncate">{summary}</span>
          ) : null}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </button>
      {keepMounted ? (
        <div
          className={
            open
              ? 'px-4 pb-4 space-y-3 border-t border-slate-100 pt-3'
              : 'absolute -left-[9999px] top-0 w-[210mm] opacity-0 pointer-events-none'
          }
          aria-hidden={!open}
        >
          {children}
        </div>
      ) : open ? (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">{children}</div>
      ) : null}
    </section>
  )
}
