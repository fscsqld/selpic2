'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface StaffCollapsibleSectionProps {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function StaffCollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: StaffCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50"
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-500 shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 shrink-0 mt-1" />
        )}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  )
}
