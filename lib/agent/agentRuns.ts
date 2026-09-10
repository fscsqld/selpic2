/**
 * Agent Core Phase B2 — shared run / OpenAI usage records (HITL).
 * Stored server-side (site_configs); never browser IndexedDB.
 *
 * Cousins: empty month, multi-admin, chat vs image, failed calls (not logged),
 * cap length, calendar month in UTC, accounting sandbox totals differ.
 */

import {
  estimateChatCostUsd,
  estimateImageCostUsd,
  type ChatUsageTokens,
} from './agentOpenAiPricing'

export type AgentRunKind = 'chat' | 'image'

/** Image (and future) vendor — optional; legacy rows without it treat as openai. */
export type AgentRunProvider = 'openai' | 'google' | 'other'

export type AgentRunSector =
  | 'inbound'
  | 'community'
  | 'newsletter'
  | 'fundraising'
  | 'products'
  | 'performance'
  | 'other'

export type AgentRunRecord = {
  id: string
  createdAt: string
  sector: AgentRunSector
  action: string
  kind: AgentRunKind
  model: string
  adminLabel: string
  /** Present on newer image runs; omitted on legacy chat/image rows. */
  provider?: AgentRunProvider
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  /** Image units (usually 1 per successful Images API call). */
  imageUnits?: number
  estimatedCostUsd: number
  ok: boolean
}

export type AgentRunsSnapshot = {
  updatedAt: string
  /** Newest first; capped on write. */
  runs: AgentRunRecord[]
}

export type AgentUsageMonthSummary = {
  monthKey: string
  totalCostUsd: number
  callCount: number
  chatCalls: number
  imageCalls: number
  bySector: Record<string, { costUsd: number; calls: number }>
  byModel: Record<string, { costUsd: number; calls: number }>
  recent: AgentRunRecord[]
}

export const AGENT_RUNS_MAX = 400

const SECTORS = new Set<string>([
  'inbound',
  'community',
  'newsletter',
  'fundraising',
  'products',
  'performance',
  'other',
])

export function utcMonthKey(d = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function monthRangeUtc(monthKey: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  const start = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(y, mo, 1, 0, 0, 0))
  return { start: start.toISOString(), end: end.toISOString() }
}

export function sanitizeAgentRun(raw: unknown): AgentRunRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const createdAt = typeof o.createdAt === 'string' ? o.createdAt : ''
  const sectorRaw = typeof o.sector === 'string' ? o.sector : 'other'
  const sector = (SECTORS.has(sectorRaw) ? sectorRaw : 'other') as AgentRunSector
  const action = typeof o.action === 'string' ? o.action.slice(0, 80) : 'unknown'
  const kind: AgentRunKind = o.kind === 'image' ? 'image' : 'chat'
  const model = typeof o.model === 'string' ? o.model.slice(0, 64) : 'unknown'
  const adminLabel =
    typeof o.adminLabel === 'string' ? o.adminLabel.slice(0, 120) : 'unknown'
  if (!id || !createdAt) return null
  const estimatedCostUsd = Math.max(0, Number(o.estimatedCostUsd) || 0)
  const providerRaw = typeof o.provider === 'string' ? o.provider.trim().toLowerCase() : ''
  let provider: AgentRunProvider | undefined
  if (providerRaw === 'openai' || providerRaw === 'google' || providerRaw === 'other') {
    provider = providerRaw
  } else if (kind === 'image') {
    // Legacy image rows pre-W1 — treat as openai for hub display.
    provider = 'openai'
  }
  return {
    id,
    createdAt,
    sector,
    action,
    kind,
    model,
    adminLabel,
    provider,
    promptTokens: Number(o.promptTokens) || undefined,
    completionTokens: Number(o.completionTokens) || undefined,
    totalTokens: Number(o.totalTokens) || undefined,
    imageUnits: Number(o.imageUnits) || undefined,
    estimatedCostUsd,
    ok: o.ok !== false,
  }
}

export function parseAgentRunsSnapshot(value: unknown): AgentRunsSnapshot {
  let obj = value
  if (typeof value === 'string') {
    try {
      obj = JSON.parse(value)
    } catch {
      return { updatedAt: '', runs: [] }
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    if (Array.isArray(obj)) {
      return {
        updatedAt: '',
        runs: obj.map(sanitizeAgentRun).filter(Boolean) as AgentRunRecord[],
      }
    }
    return { updatedAt: '', runs: [] }
  }
  const o = obj as Record<string, unknown>
  const runsRaw = Array.isArray(o.runs) ? o.runs : []
  return {
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : '',
    runs: runsRaw.map(sanitizeAgentRun).filter(Boolean) as AgentRunRecord[],
  }
}

export function summarizeAgentRunsForMonth(
  runs: AgentRunRecord[],
  monthKey: string,
  recentLimit = 12
): AgentUsageMonthSummary {
  const range = monthRangeUtc(monthKey)
  const inMonth = range
    ? runs.filter((r) => r.createdAt >= range.start && r.createdAt < range.end)
    : []

  const bySector: AgentUsageMonthSummary['bySector'] = {}
  const byModel: AgentUsageMonthSummary['byModel'] = {}
  let totalCostUsd = 0
  let chatCalls = 0
  let imageCalls = 0

  for (const r of inMonth) {
    totalCostUsd += r.estimatedCostUsd
    if (r.kind === 'image') imageCalls += 1
    else chatCalls += 1
    if (!bySector[r.sector]) bySector[r.sector] = { costUsd: 0, calls: 0 }
    bySector[r.sector].costUsd += r.estimatedCostUsd
    bySector[r.sector].calls += 1
    if (!byModel[r.model]) byModel[r.model] = { costUsd: 0, calls: 0 }
    byModel[r.model].costUsd += r.estimatedCostUsd
    byModel[r.model].calls += 1
  }

  const round = (n: number) => Math.round(n * 1_000_000) / 1_000_000
  for (const k of Object.keys(bySector)) {
    bySector[k].costUsd = round(bySector[k].costUsd)
  }
  for (const k of Object.keys(byModel)) {
    byModel[k].costUsd = round(byModel[k].costUsd)
  }

  return {
    monthKey,
    totalCostUsd: round(totalCostUsd),
    callCount: inMonth.length,
    chatCalls,
    imageCalls,
    bySector,
    byModel,
    recent: inMonth.slice(0, recentLimit),
  }
}

export function buildChatRunRecord(opts: {
  id: string
  sector: AgentRunSector
  action: string
  model: string
  adminLabel: string
  usage: ChatUsageTokens
  createdAt?: string
}): AgentRunRecord {
  return {
    id: opts.id,
    createdAt: opts.createdAt || new Date().toISOString(),
    sector: opts.sector,
    action: opts.action,
    kind: 'chat',
    model: opts.model,
    adminLabel: opts.adminLabel.slice(0, 120) || 'unknown',
    promptTokens: opts.usage.promptTokens,
    completionTokens: opts.usage.completionTokens,
    totalTokens: opts.usage.totalTokens,
    estimatedCostUsd: estimateChatCostUsd(opts.model, opts.usage),
    ok: true,
  }
}

export function buildImageRunRecord(opts: {
  id: string
  sector?: AgentRunSector
  action: string
  model: string
  adminLabel: string
  imageUnits?: number
  provider?: AgentRunProvider
  createdAt?: string
}): AgentRunRecord {
  const units = Math.max(1, opts.imageUnits ?? 1)
  return {
    id: opts.id,
    createdAt: opts.createdAt || new Date().toISOString(),
    sector: opts.sector || 'products',
    action: opts.action,
    kind: 'image',
    model: opts.model,
    adminLabel: opts.adminLabel.slice(0, 120) || 'unknown',
    provider: opts.provider || 'openai',
    imageUnits: units,
    estimatedCostUsd: estimateImageCostUsd(opts.model, opts.provider || 'openai') * units,
    ok: true,
  }
}
