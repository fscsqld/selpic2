/**
 * Persist Site Review reports in site_configs (shared). Local JSON fallback.
 */

import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { AGENT_SITE_REVIEW_CONFIG_KEY } from '@/lib/siteConfigConstants'
import type { SiteReviewReport, SiteReviewStoreSnapshot, SiteReviewFinding } from '@/lib/agent/siteReview/types'
import {
  SITE_REVIEW_REPORTS_MAX,
  parseSiteReviewSnapshot,
  sanitizeSiteReviewReport,
} from '@/lib/agent/siteReview/normalize'
import { sortSiteReviewFindings } from '@/lib/agent/siteReview/findingStatus'

const DATA_DIR = path.join(process.cwd(), 'data', 'agent')
const DATA_FILE = path.join(DATA_DIR, 'site-review-reports.json')

async function readLocal(): Promise<SiteReviewStoreSnapshot> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    return parseSiteReviewSnapshot(JSON.parse(raw))
  } catch {
    return { updatedAt: '', reports: [] }
  }
}

async function writeLocal(snapshot: SiteReviewStoreSnapshot): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), 'utf-8')
}

async function readRemote(): Promise<SiteReviewStoreSnapshot | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('site_configs')
      .select('value')
      .eq('config_key', AGENT_SITE_REVIEW_CONFIG_KEY)
      .maybeSingle()
    if (error) return null
    if (!data) return { updatedAt: '', reports: [] }
    return parseSiteReviewSnapshot(data.value)
  } catch {
    return null
  }
}

async function writeRemote(snapshot: SiteReviewStoreSnapshot): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const admin = getSupabaseAdmin()
    const now = new Date().toISOString()
    const { error } = await admin.from('site_configs').upsert(
      {
        config_key: AGENT_SITE_REVIEW_CONFIG_KEY,
        value: { updatedAt: snapshot.updatedAt || now, reports: snapshot.reports },
        updated_at: now,
      },
      { onConflict: 'config_key' }
    )
    return !error
  } catch {
    return false
  }
}

export async function readSiteReviewSnapshot(): Promise<SiteReviewStoreSnapshot> {
  const remote = await readRemote()
  if (remote) {
    return {
      updatedAt: remote.updatedAt,
      reports: remote.reports
        .map(sanitizeSiteReviewReport)
        .filter(Boolean) as SiteReviewReport[],
    }
  }
  return readLocal()
}

async function persistSnapshot(reports: SiteReviewReport[]): Promise<SiteReviewStoreSnapshot> {
  const snapshot: SiteReviewStoreSnapshot = {
    updatedAt: new Date().toISOString(),
    reports: reports.slice(0, SITE_REVIEW_REPORTS_MAX),
  }
  const remoteOk = await writeRemote(snapshot)
  try {
    await writeLocal(snapshot)
  } catch {
    if (!remoteOk) {
      console.warn('[siteReviewStore] Failed to persist (remote + local)')
    }
  }
  return snapshot
}

export async function prependSiteReviewReport(
  report: SiteReviewReport
): Promise<SiteReviewStoreSnapshot> {
  const sanitized = sanitizeSiteReviewReport(report)
  if (!sanitized) {
    return readSiteReviewSnapshot()
  }
  const current = await readSiteReviewSnapshot()
  const next = [sanitized, ...current.reports.filter((r) => r.id !== sanitized.id)]
  return persistSnapshot(next)
}

export type UpdateSiteReviewFindingResult =
  | { ok: true; snapshot: SiteReviewStoreSnapshot; report: SiteReviewReport; finding: SiteReviewFinding }
  | { ok: false; error: string; status: number }

/**
 * Replace one finding inside a report (default: newest report). Persists sorted findings.
 */
export async function updateSiteReviewFindingInStore(opts: {
  reportId?: string
  findingId: string
  mutate: (finding: SiteReviewFinding) => SiteReviewFinding | null
}): Promise<UpdateSiteReviewFindingResult> {
  const findingId = String(opts.findingId || '').trim()
  if (!findingId) {
    return { ok: false, error: 'findingId required', status: 400 }
  }

  const current = await readSiteReviewSnapshot()
  if (!current.reports.length) {
    return { ok: false, error: 'No Site Review report yet', status: 404 }
  }

  const reportIdx = opts.reportId
    ? current.reports.findIndex((r) => r.id === opts.reportId)
    : 0
  if (reportIdx < 0) {
    return { ok: false, error: 'Report not found', status: 404 }
  }

  const report = current.reports[reportIdx]
  const findingIdx = report.findings.findIndex(
    (f) => f.id === findingId || f.fingerprint.toLowerCase() === findingId.toLowerCase()
  )
  if (findingIdx < 0) {
    return { ok: false, error: 'Finding not found', status: 404 }
  }

  const nextFinding = opts.mutate(report.findings[findingIdx])
  if (!nextFinding) {
    return { ok: false, error: 'Invalid finding update', status: 400 }
  }

  const nowIso = new Date().toISOString()
  const findings = sortSiteReviewFindings(
    report.findings.map((f, i) => (i === findingIdx ? nextFinding : f))
  )
  const nextReport: SiteReviewReport = {
    ...report,
    findings,
    updatedAt: nowIso,
  }
  const sanitized = sanitizeSiteReviewReport(nextReport)
  if (!sanitized) {
    return { ok: false, error: 'Failed to sanitize report', status: 400 }
  }

  const reports = current.reports.map((r, i) => (i === reportIdx ? sanitized : r))
  const snapshot = await persistSnapshot(reports)
  const saved = snapshot.reports.find((r) => r.id === sanitized.id) || sanitized
  const savedFinding =
    saved.findings.find((f) => f.id === nextFinding.id) || nextFinding

  return { ok: true, snapshot, report: saved, finding: savedFinding }
}

export function newSiteReviewReportId(): string {
  return `sr-${randomUUID()}`
}
