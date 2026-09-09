/**
 * Optional LLM paragraph for Site Review summary (S4).
 * Heuristic summary always works; LLM is kill-switchable and never required.
 */

import { openAiChatJsonContent } from '@/lib/agent/agentOpenAiChat'
import type { SiteReviewFinding, SiteReviewReport } from './types'
import {
  SITE_REVIEW_SUMMARY_LLM_KILL,
  composeReportSummary,
  isSiteReviewSummaryLlmEnabled,
  parseSummaryParagraphJson,
} from './summaryLlmParse'

export {
  SITE_REVIEW_SUMMARY_LLM_KILL,
  composeReportSummary,
  isSiteReviewSummaryLlmEnabled,
  parseSummaryParagraphJson,
} from './summaryLlmParse'

export function buildHeuristicSummary(
  report: Pick<SiteReviewReport, 'periodKey' | 'incremental' | 'findings'>
): string {
  const open = report.findings.filter((f) => f.status === 'open' || f.status === 'regressed')
  const mode = report.incremental ? 'Incremental' : 'Full'
  return `${mode} review · ${report.periodKey} · ${open.length} open/regressed · ${report.findings.length} findings (HITL report only — no Hero edits)`
}

/**
 * Optionally ask OpenAI for one English paragraph. Returns null on any failure.
 */
export async function maybeSiteReviewSummaryParagraph(
  findings: SiteReviewFinding[],
  opts?: {
    env?: NodeJS.ProcessEnv
    fetchImpl?: typeof fetch
    periodKey?: string
  }
): Promise<string | null> {
  const env = opts?.env ?? process.env
  if (!isSiteReviewSummaryLlmEnabled(env)) return null

  const open = findings.filter((f) => f.status === 'open' || f.status === 'regressed').slice(0, 15)
  const lines = open.map((f) => `- [${f.status}/${f.severity}] ${f.title}`).join('\n')
  const system = [
    'You write a single short admin briefing paragraph for SELPIC Site Review.',
    'Return ONLY JSON: {"summary":"..."}',
    'Australian English. Max ~80 words.',
    'Do not suggest editing the homepage Hero, auto-publishing CMS, or scraping the open web.',
    'Do not invent metrics not in the finding list. HITL only — admins decide next steps.',
  ].join('\n')

  const user = [
    `Period: ${opts?.periodKey || 'unknown'}`,
    'Open/regressed findings:',
    lines || '(none)',
  ].join('\n')

  const raw = await openAiChatJsonContent({
    system,
    user,
    env,
    fetchImpl: opts?.fetchImpl,
    temperature: 0.3,
    sectorKillEnvKey: SITE_REVIEW_SUMMARY_LLM_KILL,
    usage: {
      sector: 'performance',
      action: 'site_review_summary',
    },
  })
  if (!raw) return null
  return parseSummaryParagraphJson(raw)
}
