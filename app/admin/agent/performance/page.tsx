'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import type { PerformanceOpportunity } from '@/lib/agent/performanceCoach'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'

type PerformanceResponse = {
  ok?: boolean
  opportunities?: PerformanceOpportunity[]
  autonomyNote?: string
  error?: string
}

type FilterTab = 'all' | 'site_upgrade' | 'ops'

const SEVERITY_STYLES = {
  high: 'border-rose-200 bg-rose-50 text-rose-950',
  medium: 'border-amber-200 bg-amber-50 text-amber-950',
  low: 'border-sky-200 bg-sky-50 text-sky-950',
} as const

export default function AdminAgentPerformancePage() {
  return (
    <AdminRoute requiredAnyPermissions={['analytics:read', 'agent:read']}>
      <PerformanceCoachWorkspace />
    </AdminRoute>
  )
}

function OpportunityCard({
  card,
  expanded,
  onToggle,
}: {
  card: PerformanceOpportunity
  expanded: boolean
  onToggle: () => void
}) {
  const hasDetails =
    (card.items && card.items.length > 0) || (card.nextSteps && card.nextSteps.length > 0)

  return (
    <li className={`rounded-xl border p-5 shadow-sm ${SEVERITY_STYLES[card.severity]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
              {card.kind === 'site_upgrade' ? 'site upgrade' : 'ops'} · {card.domain} ·{' '}
              {card.severity}
            </span>
          </div>
          <h2 className="text-base font-semibold">{card.title}</h2>
          <p className="mt-2 text-sm opacity-90">{card.summary}</p>
          {card.metric ? (
            <p className="mt-2 text-xs font-medium opacity-80">{card.metric}</p>
          ) : null}

          {hasDetails ? (
            <button
              type="button"
              onClick={onToggle}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide opacity-80 hover:opacity-100"
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {expanded ? 'Hide details' : 'Show items & next steps'}
            </button>
          ) : null}

          {expanded && card.items && card.items.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                Items to review
              </p>
              <ul className="mt-1.5 space-y-1 text-sm opacity-90">
                {card.items.map((item) => (
                  <li key={`${item.label}-${item.href || ''}`} className="flex flex-wrap gap-x-2">
                    <span>· </span>
                    {item.href ? (
                      <Link href={item.href} className="underline underline-offset-2 hover:opacity-100">
                        {item.label}
                      </Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                    {item.detail ? (
                      <span className="text-xs opacity-70">({item.detail})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {expanded && card.nextSteps && card.nextSteps.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                Next steps
              </p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-sm opacity-90">
                {card.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
        <Link
          href={card.href}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white"
        >
          {card.actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  )
}

function PerformanceCoachWorkspace() {
  const [loading, setLoading] = useState(true)
  const [opportunities, setOpportunities] = useState<PerformanceOpportunity[]>([])
  const [autonomyNote, setAutonomyNote] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/agent/performance', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => null)) as PerformanceResponse | null
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Failed to load opportunities')
      }
      setOpportunities(json.opportunities || [])
      setAutonomyNote(json.autonomyNote || '')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load')
      setOpportunities([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (filter === 'all') return opportunities
    return opportunities.filter((c) => c.kind === filter)
  }, [filter, opportunities])

  const siteCount = opportunities.filter((c) => c.kind === 'site_upgrade').length
  const opsCount = opportunities.filter((c) => c.kind === 'ops').length

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    for (const c of filtered) next[c.id] = true
    setExpandedIds(next)
  }
  const collapseAll = () => setExpandedIds({})

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Performance coach"
        icon={<TrendingUp className="w-7 h-7 text-emerald-600" />}
      />
      <div className="max-w-4xl mx-auto p-6">
        <Link
          href="/admin/agent"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to AI Agent hub
        </Link>

        <p className="text-sm text-gray-600 mb-4">
          Ranked opportunity cards with deep-links into Products, Inbound, Community, Fundraising,
          and Newsletter assist. Suggestions only — every consequential action stays human-approved.
        </p>

        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-medium">No auto Mark Paid, price changes, or auto-publish</p>
          <p className="mt-1 text-emerald-900/90">
            {autonomyNote ||
              'Use these cards to decide what to review next. Homepage Hero and accounting sandbox stay out of scope.'}
          </p>
        </div>

        {/* Cousin: healthy catalogs show zero weak-image cards — admins thought Imagery was missing. */}
        <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-medium">Product imagery — where to test</p>
          <p className="mt-1 text-sky-900/90">
            Performance only shows a <span className="font-medium">weak imagery</span> opportunity
            when in-stock products are missing a usable primary image (empty,{' '}
            <code className="text-xs">indexeddb://</code>, <code className="text-xs">data:</code>, or
            placeholder). If every listing already has an https image, that card stays hidden — that
            is expected.
          </p>
          <p className="mt-2 text-sky-900/90">
            Photo brief (free) → <span className="font-medium">Generate / Edit with AI</span> → Apply
            → Save lives on{' '}
            <Link href="/admin/products" className="font-semibold underline underline-offset-2">
              Products → Edit product
            </Link>{' '}
            under the main image upload.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-sky-900/90">
            <li>
              To force the Performance card: Edit a product → clear primary image → Save → return
              here → Refresh → Site upgrade.
            </li>
            <li>
              To replace a primary image with AI: open the product → Photo brief → Generate / Edit
              with AI → compare Before/After → Apply → Save.
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={expandAll}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Collapse all
          </button>
          {message ? <span className="text-sm text-rose-700">{message}</span> : null}
        </div>

        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Opportunity filter">
          {(
            [
              { id: 'all' as const, label: `All (${opportunities.length})` },
              { id: 'site_upgrade' as const, label: `Site upgrade (${siteCount})` },
              { id: 'ops' as const, label: `Ops (${opsCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${
                filter === tab.id
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && opportunities.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading opportunities…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            <p className="font-medium text-gray-900">No opportunities in this view</p>
            <p className="mt-2">
              {filter === 'all'
                ? 'Nothing matched the current rules. A healthy catalog (images + copy) and quiet queues produce an empty list — that can be correct.'
                : filter === 'site_upgrade'
                  ? 'No site-upgrade signals right now (weak imagery, thin copy, inbound, community, newsletter idle, etc.). Use Products imagery assist anytime, or clear a test product image and Refresh.'
                  : 'Try All, or refresh after catalog / inbound / community activity.'}
            </p>
            <p className="mt-3">
              <Link
                href="/admin/products"
                className="font-semibold text-emerald-800 underline underline-offset-2"
              >
                Open Products (imagery + copy assist)
              </Link>
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((card) => (
              <OpportunityCard
                key={card.id}
                card={card}
                expanded={Boolean(expandedIds[card.id])}
                onToggle={() =>
                  setExpandedIds((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
                }
              />
            ))}
          </ul>
        )}

        <p className="mt-8 text-[11px] text-gray-400" data-agent-ux="performance-wave4-v5">
          Performance coach v5 — imagery discoverability + weak-image site-upgrade when catalog
          signals fire. No separate CRO sector; no auto image replace.
        </p>
      </div>
    </div>
  )
}
