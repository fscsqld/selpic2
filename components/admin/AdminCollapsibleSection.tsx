'use client'

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

type AdminCollapsibleSectionProps = {
  title: ReactNode
  /** Short helper under the title (hidden when collapsed). */
  description?: ReactNode
  /** Right side of the header row (links, badges). Always visible. */
  headerRight?: ReactNode
  /** localStorage key — remembers open/closed across visits. */
  storageKey: string
  /** Used when no saved preference exists. */
  defaultOpen?: boolean
  children: ReactNode
  className?: string
  /** Extra classes on the outer card (e.g. border-amber-200). */
  cardClassName?: string
}

function readStoredOpen(storageKey: string, defaultOpen: boolean): boolean {
  if (typeof window === 'undefined') return defaultOpen
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* ignore */
  }
  return defaultOpen
}

/**
 * Shared admin dashboard / products card with collapse toggle.
 * Preference is stored in localStorage so each admin keeps their layout.
 */
export default function AdminCollapsibleSection({
  title,
  description,
  headerRight,
  storageKey,
  defaultOpen = true,
  children,
  className = '',
  cardClassName = 'border-gray-200',
}: AdminCollapsibleSectionProps) {
  const panelId = useId()
  const [open, setOpen] = useState(defaultOpen)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setOpen(readStoredOpen(storageKey, defaultOpen))
    setHydrated(true)
  }, [storageKey, defaultOpen])

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [storageKey])

  return (
    <section
      className={`bg-white rounded-lg shadow-sm border ${cardClassName} ${className}`}
    >
      <div className="flex items-start gap-2 p-4 sm:p-5">
        <button
          type="button"
          onClick={toggle}
          className="flex flex-1 min-w-0 items-start gap-2 text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span className="mt-0.5 shrink-0 text-gray-500" aria-hidden>
            {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-gray-900">{title}</span>
            {description && open ? (
              <span className="mt-1 block text-xs text-gray-500">{description}</span>
            ) : null}
            {!open && hydrated ? (
              <span className="mt-0.5 block text-xs text-gray-400">Collapsed — click to expand</span>
            ) : null}
          </span>
        </button>
        {headerRight ? <div className="shrink-0 pt-0.5">{headerRight}</div> : null}
      </div>
      {open ? (
        <div id={panelId} className="px-4 sm:px-5 pb-5">
          {children}
        </div>
      ) : null}
    </section>
  )
}
