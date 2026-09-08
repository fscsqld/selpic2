/**
 * Wave 4.5 S1 — run manual Site Review (storefront smoke + sector health).
 * L0 only — no Hero edits, no open-web scrape, no catalog writes.
 */

import { randomUUID } from 'crypto'

import { listFundraisingOutreachTargetsFromDb } from '@/lib/fundraising/persistence'
import { summarizeOpenOutreachReplies } from '@/lib/fundraising/outreachReplyPersistence'
import { isSupabaseConfigured, getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  countBespokeStickerRequestsByStatus,
  readBespokeStickerRequests,
} from '@/lib/server/bespokeStickerRequests'
import { loadPerformanceOpportunities } from '@/lib/agent/performanceCoach'
import type { FundraisingOutreachTargetStatus } from '@/lib/fundraising/types'

import {
  STOREFRONT_SMOKE_CHECKS,
  storefrontSmokeFingerprint,
} from './storefrontSmokeChecklist'
import {
  mergeFindingByFingerprint,
  selectFindingsForIncrementalDeepRecheck,
} from './findings'
import { sortSiteReviewFindings } from './findingStatus'
import { siteReviewPeriodKey } from './periodKey'
import { resolvePublicSiteOrigin } from './publicOrigin'
import {
  parseSiteReviewRunSectors,
  type SiteReviewRunSector,
} from './runSectors'
import type {
  SiteReviewFinding,
  SiteReviewReport,
  SiteReviewTrigger,
} from './types'

export {
  ALL_RUN_SECTORS,
  parseSiteReviewRunSectors,
  type SiteReviewRunSector,
} from './runSectors'

async function smokeOne(
  origin: string,
  path: string,
  fetchImpl: typeof fetch
): Promise<{ ok: boolean; status: number; error?: string }> {
  const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { Accept: 'text/html,application/json,*/*' },
    })
    // Some routes dislike HEAD; GET is enough for smoke.
    const status = res.status
    const ok = status >= 200 && status < 400
    return { ok, status }
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : 'Request failed',
    }
  } finally {
    clearTimeout(timer)
  }
}

function priorByFingerprint(findings: SiteReviewFinding[]): Map<string, SiteReviewFinding> {
  const m = new Map<string, SiteReviewFinding>()
  for (const f of findings) m.set(f.fingerprint.toLowerCase(), f)
  return m
}

export async function runSiteReview(opts: {
  sectors?: SiteReviewRunSector[]
  /** Default: true when a prior report exists for this period. */
  incremental?: boolean
  priorReports?: SiteReviewReport[]
  trigger?: SiteReviewTrigger
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
  now?: Date
}): Promise<SiteReviewReport> {
  const now = opts.now || new Date()
  const nowIso = now.toISOString()
  const periodKey = siteReviewPeriodKey(now)
  const sectors = parseSiteReviewRunSectors(opts.sectors)
  const trigger = opts.trigger || 'manual'
  const origin = resolvePublicSiteOrigin(opts.env)
  const fetchImpl = opts.fetchImpl ?? fetch

  const priorForPeriod = (opts.priorReports || []).find((r) => r.periodKey === periodKey)
  const incremental =
    opts.incremental !== undefined ? opts.incremental : Boolean(priorForPeriod)
  const priorMap = priorByFingerprint(priorForPeriod?.findings || [])
  const deepFingerprints = new Set(
    selectFindingsForIncrementalDeepRecheck(priorForPeriod?.findings || []).map((f) =>
      f.fingerprint.toLowerCase()
    )
  )

  const drafted: SiteReviewFinding[] = []

  if (sectors.includes('storefront')) {
    for (const check of STOREFRONT_SMOKE_CHECKS) {
      const fp = storefrontSmokeFingerprint(check.id, check.path).toLowerCase()
      const shouldDeep =
        !incremental || check.critical || deepFingerprints.has(fp) || !priorForPeriod
      if (!shouldDeep) {
        // Carry forward non-deep prior finding unchanged into report body appendix? Skip for S1 brevity.
        const prior = priorMap.get(fp)
        if (prior && (prior.status === 'fixed' || prior.status === 'accepted' || prior.status === 'wontfix')) {
          drafted.push({ ...prior, updatedAt: nowIso })
        }
        continue
      }

      const result = await smokeOne(origin, check.path, fetchImpl)
      const stillFailing = !result.ok
      const title = stillFailing
        ? `${check.label} smoke failed`
        : `${check.label} smoke OK`
      const draft = mergeFindingByFingerprint({
        prior: priorMap.get(fp),
        stillFailing,
        nowIso,
        nextDraft: {
          fingerprint: storefrontSmokeFingerprint(check.id, check.path),
          sector: 'storefront',
          kind: 'storefront_smoke',
          severity: stillFailing ? (check.critical ? 'error' : 'warn') : 'info',
          title,
          detail: stillFailing
            ? `GET ${origin}${check.path} → ${result.status || 'error'}${
                result.error ? ` (${result.error})` : ''
              }`
            : `GET ${origin}${check.path} → ${result.status}`,
          evidence: `origin=${origin}; path=${check.path}; status=${result.status}`,
          deepLink: '/admin/agent',
          trigger,
          status: stillFailing ? 'open' : 'fixed',
        },
      })
      // Fresh OK with no prior → don't clutter report with info noise unless full mode
      if (!stillFailing && !priorMap.get(fp) && incremental) {
        continue
      }
      if (!stillFailing && draft.status === 'open') {
        drafted.push({ ...draft, status: 'fixed' })
      } else {
        drafted.push(draft)
      }
    }
  }

  if (sectors.includes('fundraising')) {
    let openReplies = 0
    let failed = 0
    try {
      openReplies = (await summarizeOpenOutreachReplies()).count
    } catch {
      /* ignore */
    }
    try {
      if (isSupabaseConfigured()) {
        const targets = await listFundraisingOutreachTargetsFromDb({ limit: 500 })
        failed = targets.filter((t) => t.status === ('FAILED' as FundraisingOutreachTargetStatus))
          .length
      }
    } catch {
      /* ignore */
    }
    if (openReplies > 0) {
      const fp = 'sector_health|fundraising|open_replies'
      drafted.push(
        mergeFindingByFingerprint({
          prior: priorMap.get(fp),
          nowIso,
          nextDraft: {
            fingerprint: fp,
            sector: 'fundraising',
            kind: 'sector_health',
            severity: 'warn',
            title: `Fundraising Needs reply: ${openReplies}`,
            detail: 'Open outreach replies awaiting HITL follow-up.',
            deepLink: '/admin/fundraising/agent',
            trigger,
            status: 'open',
          },
        })
      )
    }
    if (failed > 0) {
      const fp = 'sector_health|fundraising|failed_targets'
      drafted.push(
        mergeFindingByFingerprint({
          prior: priorMap.get(fp),
          nowIso,
          nextDraft: {
            fingerprint: fp,
            sector: 'fundraising',
            kind: 'sector_health',
            severity: 'warn',
            title: `Fundraising FAILED targets: ${failed}`,
            detail: 'Review Failed rows; Retry to PENDING if appropriate.',
            deepLink: '/admin/fundraising/agent',
            trigger,
            status: 'open',
          },
        })
      )
    }
  }

  if (sectors.includes('inbound')) {
    let newMessages = 0
    let newBespoke = 0
    try {
      if (isSupabaseConfigured()) {
        const admin = getSupabaseAdmin()
        const { count } = await admin
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new')
        newMessages = count ?? 0
      }
      const bespoke = await readBespokeStickerRequests()
      newBespoke = countBespokeStickerRequestsByStatus(bespoke, 'new')
    } catch {
      /* ignore */
    }
    const total = newMessages + newBespoke
    if (total > 0) {
      const fp = 'sector_health|inbound|new_queue'
      drafted.push(
        mergeFindingByFingerprint({
          prior: priorMap.get(fp),
          nowIso,
          nextDraft: {
            fingerprint: fp,
            sector: 'inbound',
            kind: 'sector_health',
            severity: 'warn',
            title: `Customer care queue: ${total} new`,
            detail: `${newMessages} contact · ${newBespoke} bespoke — draft → Send (HITL).`,
            deepLink: '/admin/agent/inbound',
            trigger,
            status: 'open',
          },
        })
      )
    }
  }

  if (sectors.includes('performance')) {
    try {
      const opportunities = await loadPerformanceOpportunities()
      if (opportunities.length > 0) {
        const fp = 'sector_health|performance|opportunities'
        drafted.push(
          mergeFindingByFingerprint({
            prior: priorMap.get(fp),
            nowIso,
            nextDraft: {
              fingerprint: fp,
              sector: 'performance',
              kind: 'sector_health',
              severity: 'info',
              title: `Performance opportunities: ${opportunities.length}`,
              detail: 'Open Performance coach for ranked cards (suggestions only).',
              deepLink: '/admin/agent/performance',
              trigger,
              status: 'open',
            },
          })
        )
      }
    } catch {
      /* ignore */
    }
  }

  if (sectors.includes('community')) {
    const fp = 'sector_health|community|hitl_reminder'
    if (!incremental || deepFingerprints.has(fp) || !priorForPeriod) {
      drafted.push(
        mergeFindingByFingerprint({
          prior: priorMap.get(fp),
          nowIso,
          nextDraft: {
            fingerprint: fp,
            sector: 'community',
            kind: 'sector_health',
            severity: 'info',
            title: 'Community drafts stay Approve-gated',
            detail: 'Review queue; never auto-publish homepage Hero.',
            deepLink: '/admin/agent/community',
            trigger,
            status: 'accepted',
          },
        })
      )
    }
  }

  if (sectors.includes('newsletter') || sectors.includes('products')) {
    // Soft reminders only when full / non-incremental to avoid noise
    if (!incremental) {
      if (sectors.includes('newsletter')) {
        drafted.push(
          mergeFindingByFingerprint({
            nowIso,
            nextDraft: {
              fingerprint: 'sector_health|newsletter|assist',
              sector: 'newsletter',
              kind: 'sector_health',
              severity: 'info',
              title: 'Newsletter assist available',
              detail: 'Generate/Polish drafts then send in Newsletter admin (HITL).',
              deepLink: '/admin/agent/newsletter',
              trigger,
              status: 'accepted',
            },
          })
        )
      }
      if (sectors.includes('products')) {
        drafted.push(
          mergeFindingByFingerprint({
            nowIso,
            nextDraft: {
              fingerprint: 'sector_health|products|imagery_hitl',
              sector: 'products',
              kind: 'sector_health',
              severity: 'info',
              title: 'Product imagery stays Apply → Save',
              detail: 'AI images do not publish until Save product.',
              deepLink: '/admin/products',
              trigger,
              status: 'accepted',
            },
          })
        )
      }
    }
  }

  // Ensure ids + stable display order (regressed/open first)
  const findings = sortSiteReviewFindings(
    drafted.map((f) => ({
      ...f,
      id: f.id || `f-${randomUUID()}`,
    }))
  )

  const openCount = findings.filter((f) => f.status === 'open' || f.status === 'regressed').length
  const summary = incremental
    ? `Incremental review · ${periodKey} · ${openCount} open/regressed · origin ${origin}`
    : `Full review · ${periodKey} · ${findings.length} findings · origin ${origin}`

  return {
    id: `sr-${randomUUID()}`,
    periodKey,
    trigger,
    createdAt: nowIso,
    updatedAt: nowIso,
    incremental,
    findings,
    summary,
  }
}
