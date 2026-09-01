'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import type { PerformanceOpportunity } from '@/lib/agent/performanceCoach'
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, TrendingUp } from 'lucide-react'

type PerformanceResponse = {
  ok?: boolean
  opportunities?: PerformanceOpportunity[]
  autonomyNote?: string
  error?: string
}

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

function PerformanceCoachWorkspace() {
  const [loading, setLoading] = useState(true)
  const [opportunities, setOpportunities] = useState<PerformanceOpportunity[]>([])
  const [autonomyNote, setAutonomyNote] = useState('')
  const [message, setMessage] = useState('')

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
          Ranked opportunity cards from Sales, Traffic, and Fundraising data. Wave 4 — suggestions
          only; every consequential action stays human-approved.
        </p>

        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-medium">No auto Mark Paid or price changes</p>
          <p className="mt-1 text-emerald-900/90">
            {autonomyNote ||
              'Use these cards to decide what to review next. Homepage Hero and accounting sandbox stay out of scope.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {message ? <span className="text-sm text-rose-700">{message}</span> : null}
        </div>

        {loading && opportunities.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading opportunities…
          </div>
        ) : opportunities.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            <p className="font-medium text-gray-900">No opportunities right now</p>
            <p className="mt-2">
              That is good — nothing urgent matched the Wave 4 rules. Check back after more traffic,
              orders, or fundraising activity.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {opportunities.map((card) => (
              <li
                key={card.id}
                className={`rounded-xl border p-5 shadow-sm ${SEVERITY_STYLES[card.severity]}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {card.domain} · {card.severity}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold">{card.title}</h2>
                    <p className="mt-2 text-sm opacity-90">{card.summary}</p>
                    {card.metric ? (
                      <p className="mt-2 text-xs font-medium opacity-80">{card.metric}</p>
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
            ))}
          </ul>
        )}

        <p className="mt-8 text-[11px] text-gray-400" data-agent-ux="performance-wave4-v1">
          Performance coach v1 — on-demand refresh only. Nightly cron optional later.
        </p>
      </div>
    </div>
  )
}
