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
  ChevronDown,
  ChevronRight,
  DollarSign,
  ExternalLink,
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
    openReplies?: number
    warning?: string
  }
  inbound?: {
    available: boolean
    newMessages: number
    newBespoke: number
    warning?: string
  }
  performance?: {
    available: boolean
    opportunityCount: number
    warning?: string
  }
  error?: string
}

type UsageResponse = {
  ok?: boolean
  monthKey?: string
  totalCostUsd?: number
  callCount?: number
  chatCalls?: number
  imageCalls?: number
  bySector?: Record<string, { costUsd: number; calls: number }>
  billingUrl?: string
  error?: string
}

const SECTOR_ICONS: Record<string, typeof Bot> = {
  fundraising: HeartHandshake,
  inbound: MessageSquare,
  performance: TrendingUp,
  community: Sparkles,
  newsletter: Newspaper,
}

const USAGE_EXPANDED_KEY = 'selpic-agent-usage-expanded'

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
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [usageOpen, setUsageOpen] = useState(false)
  const [expandedSectorId, setExpandedSectorId] = useState<string | null>(null)

  useEffect(() => {
    try {
      setUsageOpen(localStorage.getItem(USAGE_EXPANDED_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/agent/summary', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => null)) as SummaryResponse | null
      if (!res.ok) throw new Error(json?.error || 'Failed to load')
      setSummary(json)
      if (json?.fundraising?.warning) setMessage(json.fundraising.warning)
      else if (json?.inbound?.warning) setMessage(json.inbound.warning)
      else if (json?.performance?.warning) setMessage(json.performance.warning)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadUsage = useCallback(async () => {
    setUsageLoading(true)
    try {
      const usageRes = await fetch('/api/admin/agent/usage', {
        cache: 'no-store',
        credentials: 'include',
      })
      const usageJson = (await usageRes.json().catch(() => null)) as UsageResponse | null
      if (usageRes.ok && usageJson?.ok) setUsage(usageJson)
      else setUsage(null)
    } catch {
      setUsage(null)
    } finally {
      setUsageLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (!usageOpen) return
    void loadUsage()
  }, [usageOpen, loadUsage])

  const toggleUsage = () => {
    setUsageOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(USAGE_EXPANDED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

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
  const showPerformance = adminCanAccessAgentSector(
    adminUser,
    sectors.find((s) => s.id === 'performance') || AGENT_SECTORS[2]
  )
  const performanceCount = summary?.performance?.opportunityCount ?? 0
  const openOutreachReplies = summary?.fundraising?.openReplies ?? 0

  const sectorBadge = (id: string): string | null => {
    if (id === 'fundraising' && showFundraising && counts) {
      return `${counts.PENDING} pending`
    }
    if (id === 'inbound' && showInbound && summary?.inbound?.available) {
      return `${inboundAttention} new`
    }
    if (id === 'performance' && showPerformance && summary?.performance?.available) {
      return `${performanceCount} open`
    }
    return null
  }

  const liveVisible = visibleSectors.filter((s) => s.status === 'live')
  const liveCount = liveVisible.length
  const totalVisible = visibleSectors.length
  const attentionTotal =
    (showFundraising ? openOutreachReplies : 0) +
    (showInbound ? inboundAttention : 0) +
    (showPerformance ? performanceCount : 0)

  const liveOverviewChips: Array<{ id: string; label: string; value: string; href?: string }> = []
  if (showFundraising) {
    liveOverviewChips.push({
      id: 'fundraising',
      label: 'Fundraising',
      value: counts
        ? `${counts.PENDING} pending${openOutreachReplies > 0 ? ` · ${openOutreachReplies} reply` : ''}`
        : 'Live',
      href: '/admin/fundraising/agent',
    })
  }
  if (showInbound) {
    liveOverviewChips.push({
      id: 'inbound',
      label: 'Customer care',
      value: summary?.inbound?.available ? `${inboundAttention} new` : 'Live',
      href: '/admin/agent/inbound',
    })
  }
  if (showPerformance) {
    liveOverviewChips.push({
      id: 'performance',
      label: 'Performance',
      value: summary?.performance?.available ? `${performanceCount} open` : 'Live',
      href: '/admin/agent/performance',
    })
  }
  for (const id of ['community', 'newsletter'] as const) {
    const sector = visibleSectors.find((s) => s.id === id)
    if (!sector || sector.status !== 'live') continue
    liveOverviewChips.push({
      id,
      label: sector.label,
      value: 'Live',
      href: sector.href,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader title="AI Agent" icon={<Bot className="w-7 h-7 text-indigo-600" />} />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void loadSummary()
              if (usageOpen) void loadUsage()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || usageLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="text-sm text-gray-500">You approve before anything sends or publishes.</span>
          {message ? <span className="text-sm text-amber-800">{message}</span> : null}
        </div>

        {/* Comprehensive Live strip — registry status + key counts in one glance */}
        {totalVisible > 0 ? (
          <section className="mb-6 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Live
                </span>
                <p className="text-sm font-semibold text-gray-900">
                  {liveCount}/{totalVisible} sectors
                  {attentionTotal > 0 ? (
                    <span className="ml-2 font-normal text-amber-800">
                      · {attentionTotal} need attention
                    </span>
                  ) : (
                    <span className="ml-2 font-normal text-gray-500">· no urgent queues</span>
                  )}
                </p>
              </div>
              {loading && !summary ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : null}
            </div>
            {liveOverviewChips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {liveOverviewChips.map((chip) => {
                  const className =
                    'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 hover:border-emerald-300 hover:bg-emerald-50'
                  const inner = (
                    <>
                      <span className="font-medium">{chip.label}</span>
                      <span className="text-gray-500">{chip.value}</span>
                    </>
                  )
                  return chip.href ? (
                    <Link key={chip.id} href={chip.href} className={className}>
                      {inner}
                    </Link>
                  ) : (
                    <span key={chip.id} className={className}>
                      {inner}
                    </span>
                  )
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {(openOutreachReplies > 0 && showFundraising) || (inboundAttention > 0 && showInbound) ? (
          <div className="mb-6 space-y-2">
            {openOutreachReplies > 0 && showFundraising ? (
              <Link
                href="/admin/fundraising/agent"
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 hover:bg-amber-100"
              >
                <span>
                  <span className="font-medium">Fundraising</span> — {openOutreachReplies} needs reply
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            ) : null}
            {inboundAttention > 0 && showInbound ? (
              <Link
                href="/admin/agent/inbound"
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 hover:bg-amber-100"
              >
                <span>
                  <span className="font-medium">Customer care</span> — {summary?.inbound?.newMessages ?? 0}{' '}
                  messages, {summary?.inbound?.newBespoke ?? 0} bespoke
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            ) : null}
          </div>
        ) : null}

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Sectors</h2>
          {loading && !summary ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : visibleSectors.length === 0 ? (
            <p className="text-sm text-gray-500">No sectors available for your permissions.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleSectors.map((sector) => {
                const Icon = SECTOR_ICONS[sector.id] || Bot
                const live = sector.status === 'live'
                const canOpen = live && !!sector.href && adminCanAccessAgentSector(adminUser, sector)
                const detailOpen = expandedSectorId === sector.id
                const badge = sectorBadge(sector.id)
                return (
                  <div
                    key={sector.id}
                    className={`rounded-xl border p-4 shadow-sm ${
                      live ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`rounded-lg p-2 shrink-0 ${
                            live ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{sector.label}</h3>
                            {badge ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                                {badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{sector.description}</p>
                          {detailOpen && sector.autonomyNote ? (
                            <p className="mt-2 text-xs text-gray-500">{sector.autonomyNote}</p>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSectorId((id) => (id === sector.id ? null : sector.id))
                            }
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
                          >
                            {detailOpen ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {detailOpen ? 'Less' : 'Details'}
                          </button>
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
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900"
                      >
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : live && sector.href ? (
                      <p className="mt-3 text-xs text-amber-700">Missing permission for this sector.</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={toggleUsage}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
              <DollarSign className="h-4 w-4 text-emerald-700" />
              OpenAI usage
              {usageOpen && usage ? (
                <span className="font-normal text-gray-500">
                  · ${(usage.totalCostUsd ?? 0).toFixed(4)}
                  {usage.monthKey ? ` (${usage.monthKey})` : ''}
                </span>
              ) : null}
            </span>
            {usageOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {usageOpen ? (
            <div className="border-t border-gray-100 px-4 py-3">
              {usageLoading && !usage ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-md bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">Est. total</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${(usage?.totalCostUsd ?? 0).toFixed(4)}
                      </p>
                    </div>
                    <div className="rounded-md bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">Calls</p>
                      <p className="text-lg font-semibold text-gray-900">{usage?.callCount ?? 0}</p>
                      <p className="text-[11px] text-gray-500">
                        {usage?.chatCalls ?? 0} chat · {usage?.imageCalls ?? 0} image
                      </p>
                    </div>
                    <div className="rounded-md bg-gray-50 px-3 py-2 col-span-2 sm:col-span-1">
                      <p className="text-xs text-gray-500 mb-1">By sector</p>
                      {usage?.bySector && Object.keys(usage.bySector).length > 0 ? (
                        <ul className="text-xs text-gray-700 space-y-0.5">
                          {Object.entries(usage.bySector)
                            .sort((a, b) => b[1].costUsd - a[1].costUsd)
                            .map(([sector, row]) => (
                              <li key={sector} className="flex justify-between gap-2">
                                <span className="capitalize">{sector}</span>
                                <span>
                                  ${row.costUsd.toFixed(4)} · {row.calls}
                                </span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500">No calls this month.</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>Agent estimates only — not accounting app totals.</span>
                    {usage?.billingUrl ? (
                      <a
                        href={usage.billingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:text-emerald-950"
                      >
                        OpenAI Billing <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
