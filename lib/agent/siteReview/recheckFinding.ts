/**
 * Re-check a single Site Review finding (S2) — read-only evidence refresh.
 * Pass → fixed; fail after fixed/accepted → regressed; else open.
 */

import { summarizeOpenOutreachReplies } from '@/lib/fundraising/outreachReplyPersistence'
import { listFundraisingOutreachTargetsFromDb } from '@/lib/fundraising/persistence'
import { isSupabaseConfigured, getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  countBespokeStickerRequestsByStatus,
  readBespokeStickerRequests,
} from '@/lib/server/bespokeStickerRequests'
import { loadPerformanceOpportunities } from '@/lib/agent/performanceCoach'
import type { FundraisingOutreachTargetStatus } from '@/lib/fundraising/types'

import { markFindingRegressed, mergeFindingByFingerprint } from './findings'
import { resolveRecheckStatus } from './findingStatus'
import { evaluateStorefrontSmoke } from './recheckStorefrontSmoke'
import type { SiteReviewFinding } from './types'

export { resolveRecheckStatus } from './findingStatus'

async function evaluateStillFailing(
  finding: SiteReviewFinding,
  opts: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch }
): Promise<{ stillFailing: boolean; detail: string; evidence: string }> {
  const fp = finding.fingerprint.toLowerCase()

  if (finding.kind === 'storefront_smoke') {
    return evaluateStorefrontSmoke(finding, opts)
  }

  if (fp === 'sector_health|fundraising|open_replies') {
    let count = 0
    try {
      count = (await summarizeOpenOutreachReplies()).count
    } catch {
      return {
        stillFailing: true,
        detail: 'Could not load open outreach replies.',
        evidence: 'open_replies=error',
      }
    }
    return {
      stillFailing: count > 0,
      detail:
        count > 0
          ? `Fundraising Needs reply still ${count}`
          : 'Fundraising Needs reply cleared',
      evidence: `open_replies=${count}`,
    }
  }

  if (fp === 'sector_health|fundraising|failed_targets') {
    let failed = 0
    try {
      if (isSupabaseConfigured()) {
        const targets = await listFundraisingOutreachTargetsFromDb({ limit: 500 })
        failed = targets.filter((t) => t.status === ('FAILED' as FundraisingOutreachTargetStatus))
          .length
      }
    } catch {
      return {
        stillFailing: true,
        detail: 'Could not load FAILED targets.',
        evidence: 'failed_targets=error',
      }
    }
    return {
      stillFailing: failed > 0,
      detail: failed > 0 ? `FAILED targets still ${failed}` : 'No FAILED targets',
      evidence: `failed_targets=${failed}`,
    }
  }

  if (fp === 'sector_health|inbound|new_queue') {
    let total = 0
    try {
      let newMessages = 0
      if (isSupabaseConfigured()) {
        const admin = getSupabaseAdmin()
        const { count } = await admin
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new')
        newMessages = count ?? 0
      }
      const bespoke = await readBespokeStickerRequests()
      const newBespoke = countBespokeStickerRequestsByStatus(bespoke, 'new')
      total = newMessages + newBespoke
    } catch {
      return {
        stillFailing: true,
        detail: 'Could not load inbound queue.',
        evidence: 'inbound=error',
      }
    }
    return {
      stillFailing: total > 0,
      detail: total > 0 ? `Customer care queue still ${total} new` : 'Inbound queue cleared',
      evidence: `inbound_new=${total}`,
    }
  }

  if (fp === 'sector_health|performance|opportunities') {
    let n = 0
    try {
      n = (await loadPerformanceOpportunities()).length
    } catch {
      return {
        stillFailing: true,
        detail: 'Could not load performance opportunities.',
        evidence: 'performance=error',
      }
    }
    return {
      stillFailing: n > 0,
      detail: n > 0 ? `Performance opportunities still ${n}` : 'No open performance opportunities',
      evidence: `opportunities=${n}`,
    }
  }

  if (
    fp.startsWith('sector_health|community|') ||
    fp.startsWith('sector_health|newsletter|') ||
    fp.startsWith('sector_health|products|')
  ) {
    return {
      stillFailing: false,
      detail: 'Soft reminder re-check — leave as accepted/fixed (no auto edits).',
      evidence: `soft=${fp}`,
    }
  }

  return {
    stillFailing: true,
    detail: 'No re-check handler for this finding kind.',
    evidence: `unsupported=${finding.kind}|${finding.fingerprint}`,
  }
}

export async function recheckSiteReviewFinding(
  finding: SiteReviewFinding,
  opts?: {
    env?: NodeJS.ProcessEnv
    fetchImpl?: typeof fetch
    nowIso?: string
  }
): Promise<SiteReviewFinding> {
  const nowIso = opts?.nowIso || new Date().toISOString()
  const evalResult = await evaluateStillFailing(finding, {
    env: opts?.env,
    fetchImpl: opts?.fetchImpl,
  })
  const nextStatus = resolveRecheckStatus(finding.status, evalResult.stillFailing)

  if (nextStatus === 'regressed' && finding.status !== 'regressed') {
    return {
      ...markFindingRegressed(finding, nowIso),
      detail: evalResult.detail,
      evidence: evalResult.evidence,
    }
  }

  const merged = mergeFindingByFingerprint({
    prior: finding,
    stillFailing: evalResult.stillFailing,
    nowIso,
    nextDraft: {
      fingerprint: finding.fingerprint,
      sector: finding.sector,
      kind: finding.kind,
      severity: evalResult.stillFailing
        ? finding.severity === 'info'
          ? 'warn'
          : finding.severity
        : 'info',
      title: finding.title,
      detail: evalResult.detail,
      evidence: evalResult.evidence,
      deepLink: finding.deepLink,
      trigger: 'error_recheck',
      status: nextStatus,
    },
  })

  return { ...merged, status: nextStatus, trigger: 'error_recheck', updatedAt: nowIso }
}
