'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { AGENT_SECTORS, adminCanAccessAgentSector, type AgentSectorDef } from '@/lib/agent/sectors'
import { useAdminAuth } from '@/lib/adminAuth'
import {
  Bot,
  HeartHandshake,
  Loader2,
  MessageSquare,
  Newspaper,
  RefreshCw,
  Sparkles,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

type SummaryResponse = {
  ok?: boolean
  sectors?: AgentSectorDef[]
  fundraising?: {
    available: boolean
    counts: {
      PENDING: number
      CONTACTED: number
      CONVERTED: number
      FAILED: number
      OPTED_OUT: number
      TOTAL: number
    }
    workspaceHref?: string
    warning?: string
  }
  inbound?: {
    available: boolean
    newMessages: number
    newBespoke: number
    workspaceHref?: string
    warning?: string
  }
  error?: string
}

const SECTOR_ICONS: Record<string, typeof Bot> = {
  fundraising: HeartHandshake,
  inbound: MessageSquare,
  performance: TrendingUp,
  community: Sparkles,
  newsletter: Newspaper,
}

export default function AdminAgentHubPage() {
  return (
    <AdminRoute requiredAnyPermissions={['agent:read', 'fundraising:read']}>
      <AgentHubContent />
    </AdminRoute>
  )
}

function AgentHubContent() {
  const { adminUser } = useAdminAuth()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/agent/summary', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => null)) as SummaryResponse | null
      if (!res.ok) throw new Error(json?.error || 'Failed to load agent summary')
      setSummary(json)
      if (json?.fundraising?.warning) setMessage(json.fundraising.warning)
      else if (json?.inbound?.warning) setMessage(json.inbound.warning)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sectors = summary?.sectors?.length ? summary.sectors : AGENT_SECTORS
  const visibleSectors = sectors.filter((sector) => adminCanAccessAgentSector(adminUser, sector))
  const counts = summary?.fundraising?.counts
  const inboundAttention =
    (summary?.inbound?.newMessages ?? 0) + (summary?.inbound?.newBespoke ?? 0)
  const showFundraising = adminCanAccessAgentSector(
    adminUser,
    sectors.find((s) => s.id === 'fundraising') || AGENT_SECTORS[0]
  )
  const showInbound = adminCanAccessAgentSector(
    adminUser,
    sectors.find((s) => s.id === 'inbound') || AGENT_SECTORS[1]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader title="AI Agent" icon={<Bot className="w-7 h-7 text-indigo-600" />} />
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-sm text-gray-600 mb-6 -mt-2">
          Governed hub for SELPIC admin sectors — Fundraising outreach and Customer care drafts are live.
        </p>

      <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
        <p className="font-medium">Human-in-the-loop by default</p>
        <p className="mt-1 text-indigo-900/90">
          Consequential actions stay behind permissions and explicit Send/Approve. Money moves, homepage Hero, and
          accounting sandbox are out of scope. Wave 1 fundraising send is capped and respects OPTED_OUT.
        </p>
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
        {message ? <span className="text-sm text-amber-800">{message}</span> : null}
      </div>

      {inboundAttention > 0 && showInbound ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Customer care queue needs attention</p>
          <p className="mt-1">
            {summary?.inbound?.newMessages ?? 0} new message
            {(summary?.inbound?.newMessages ?? 0) === 1 ? '' : 's'},{' '}
            {summary?.inbound?.newBespoke ?? 0} new bespoke request
            {(summary?.inbound?.newBespoke ?? 0) === 1 ? '' : 's'}.
          </p>
          <Link
            href="/admin/agent/inbound"
            className="mt-2 inline-flex items-center gap-1.5 font-medium text-amber-900 hover:text-amber-950"
          >
            Open draft workspace <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {/* Fundraising observability (live sector) */}
      {showFundraising ? (
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Fundraising outreach — live</h2>
        {loading && !counts ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading stats…
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(
              [
                ['TOTAL', 'Total'],
                ['PENDING', 'Pending'],
                ['CONTACTED', 'Contacted'],
                ['CONVERTED', 'Converted'],
                ['FAILED', 'Failed'],
                ['OPTED_OUT', 'Opted out'],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm"
              >
                <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{counts?.[key] ?? '—'}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Link
            href="/admin/fundraising/agent"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Open Fundraising Agent workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      ) : null}

      {showInbound ? (
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Customer care drafts — live</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-gray-500">New messages</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {summary?.inbound?.available ? summary.inbound.newMessages : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-gray-500">New bespoke</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {summary?.inbound?.available ? summary.inbound.newBespoke : '—'}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/admin/agent/inbound"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Open draft workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-xs text-gray-500">
            Needs attention = new/read messages and new/reviewed bespoke. Already replied items are under
            Recently handled inside the workspace.
          </p>
        </div>
      </section>
      ) : null}

      {/* Sector cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Sectors</h2>
        {visibleSectors.length === 0 ? (
          <p className="text-sm text-gray-500">No agent sectors available for your permissions.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleSectors.map((sector) => {
            const Icon = SECTOR_ICONS[sector.id] || Bot
            const live = sector.status === 'live'
            const canOpen = live && !!sector.href && adminCanAccessAgentSector(adminUser, sector)
            return (
              <div
                key={sector.id}
                className={`rounded-xl border p-4 shadow-sm ${
                  live ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        live ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{sector.label}</h3>
                      <p className="mt-1 text-sm text-gray-600">{sector.description}</p>
                      <p className="mt-2 text-xs text-gray-500">{sector.autonomyNote}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      live ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {live ? 'Live' : 'Soon'}
                  </span>
                </div>
                {canOpen && sector.href ? (
                  <Link
                    href={sector.href}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900"
                  >
                    Open workspace <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : live && sector.href ? (
                  <p className="mt-4 text-xs text-amber-700">
                    Requires {sector.requiredAnyPermissions?.join(' or ') || sector.requiredPermission}.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-gray-400">Not enabled yet — reserved for a later wave.</p>
                )}
              </div>
            )
          })}
        </div>
        )}
      </section>
      </div>
    </div>
  )
}
