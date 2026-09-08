/**
 * Normalize Site Review snapshots for site_configs / local JSON.
 */

import type {
  SiteReviewFinding,
  SiteReviewFindingKind,
  SiteReviewFindingStatus,
  SiteReviewReport,
  SiteReviewSector,
  SiteReviewSeverity,
  SiteReviewStoreSnapshot,
  SiteReviewTrigger,
} from './types'

const STATUSES = new Set<SiteReviewFindingStatus>([
  'open',
  'fixed',
  'accepted',
  'wontfix',
  'regressed',
])
const TRIGGERS = new Set<SiteReviewTrigger>(['quarterly', 'manual', 'error_recheck'])
const KINDS = new Set<SiteReviewFindingKind>([
  'storefront_smoke',
  'sector_health',
  'catalog_heuristic',
  'other',
])
const SEVERITIES = new Set<SiteReviewSeverity>(['info', 'warn', 'error'])

export const SITE_REVIEW_REPORTS_MAX = 24
export const SITE_REVIEW_FINDINGS_MAX = 200

export function sanitizeSiteReviewFinding(raw: unknown): SiteReviewFinding | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const fingerprint = typeof o.fingerprint === 'string' ? o.fingerprint.trim() : ''
  const title = typeof o.title === 'string' ? o.title.trim().slice(0, 200) : ''
  const createdAt = typeof o.createdAt === 'string' ? o.createdAt : ''
  const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : createdAt
  if (!id || !fingerprint || !title || !createdAt) return null

  const statusRaw = typeof o.status === 'string' ? o.status : 'open'
  const status = (STATUSES.has(statusRaw as SiteReviewFindingStatus)
    ? statusRaw
    : 'open') as SiteReviewFindingStatus
  const triggerRaw = typeof o.trigger === 'string' ? o.trigger : 'manual'
  const trigger = (TRIGGERS.has(triggerRaw as SiteReviewTrigger)
    ? triggerRaw
    : 'manual') as SiteReviewTrigger
  const kindRaw = typeof o.kind === 'string' ? o.kind : 'other'
  const kind = (KINDS.has(kindRaw as SiteReviewFindingKind)
    ? kindRaw
    : 'other') as SiteReviewFindingKind
  const severityRaw = typeof o.severity === 'string' ? o.severity : 'warn'
  const severity = (SEVERITIES.has(severityRaw as SiteReviewSeverity)
    ? severityRaw
    : 'warn') as SiteReviewSeverity
  const sector =
    typeof o.sector === 'string' && o.sector.trim()
      ? (o.sector.trim() as SiteReviewSector)
      : 'other'

  return {
    id,
    fingerprint: fingerprint.slice(0, 240),
    sector,
    kind,
    severity,
    status,
    title,
    detail: typeof o.detail === 'string' ? o.detail.slice(0, 2000) : undefined,
    deepLink: typeof o.deepLink === 'string' ? o.deepLink.slice(0, 500) : undefined,
    evidence: typeof o.evidence === 'string' ? o.evidence.slice(0, 2000) : undefined,
    trigger,
    createdAt,
    updatedAt,
  }
}

export function sanitizeSiteReviewReport(raw: unknown): SiteReviewReport | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const periodKey = typeof o.periodKey === 'string' ? o.periodKey.trim() : ''
  const createdAt = typeof o.createdAt === 'string' ? o.createdAt : ''
  const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : createdAt
  if (!id || !periodKey || !createdAt) return null
  const triggerRaw = typeof o.trigger === 'string' ? o.trigger : 'manual'
  const trigger = (TRIGGERS.has(triggerRaw as SiteReviewTrigger)
    ? triggerRaw
    : 'manual') as SiteReviewTrigger
  const findingsRaw = Array.isArray(o.findings) ? o.findings : []
  const findings = findingsRaw
    .map(sanitizeSiteReviewFinding)
    .filter(Boolean)
    .slice(0, SITE_REVIEW_FINDINGS_MAX) as SiteReviewFinding[]

  return {
    id,
    periodKey,
    trigger,
    createdAt,
    updatedAt,
    incremental: o.incremental === true,
    findings,
    summary: typeof o.summary === 'string' ? o.summary.slice(0, 2000) : undefined,
  }
}

export function parseSiteReviewSnapshot(value: unknown): SiteReviewStoreSnapshot {
  let obj = value
  if (typeof value === 'string') {
    try {
      obj = JSON.parse(value)
    } catch {
      return { updatedAt: '', reports: [] }
    }
  }
  if (!obj || typeof obj !== 'object') return { updatedAt: '', reports: [] }
  const o = obj as Record<string, unknown>
  const reportsRaw = Array.isArray(o.reports) ? o.reports : []
  return {
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : '',
    reports: reportsRaw
      .map(sanitizeSiteReviewReport)
      .filter(Boolean)
      .slice(0, SITE_REVIEW_REPORTS_MAX) as SiteReviewReport[],
  }
}
