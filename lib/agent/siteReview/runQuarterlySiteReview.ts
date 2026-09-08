/**
 * Orchestrate quarterly Site Review cron: gate → incremental run → optional email.
 */

import {
  newSiteReviewReportId,
  prependSiteReviewReport,
  readSiteReviewSnapshot,
} from '@/lib/server/siteReviewStore'
import { resolveAdminNotificationRecipients } from '@/lib/server/adminNotificationRecipients'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import { runSiteReview } from './runSiteReview'
import { sortSiteReviewFindings } from './findingStatus'
import { resolvePublicSiteOrigin } from './publicOrigin'
import {
  getSiteReviewQuarterWindow,
  hasQuarterlyReportForPeriod,
  isSiteReviewCronEmailEnabled,
  isSiteReviewCronEnabled,
} from './quarterlyCron'
import type { SiteReviewReport } from './types'

export type QuarterlySiteReviewResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  periodKey?: string
  sydneyDate?: string
  reportId?: string
  openCount?: number
  emailSent?: boolean
  emailError?: string
}

function buildSummaryEmail(report: SiteReviewReport, origin: string): { subject: string; html: string; text: string } {
  const findings = sortSiteReviewFindings(report.findings)
  const open = findings.filter((f) => f.status === 'open' || f.status === 'regressed')
  const subject = `SELPIC Site Review ${report.periodKey} · ${open.length} open/regressed`
  const lines = open.slice(0, 25).map((f) => `• [${f.status}] ${f.title}`)
  const text = [
    subject,
    `Origin: ${origin}`,
    `Mode: ${report.incremental ? 'incremental' : 'full'}`,
    `Findings: ${findings.length} total · ${open.length} open/regressed`,
    '',
    ...lines,
    '',
    'Open Admin → Agent → Site Review (HITL only — no Hero auto-edits).',
    'https://www.selpic.com.au/admin/agent',
  ].join('\n')

  const html = `
    <p><strong>${subject}</strong></p>
    <p>Origin: <code>${origin}</code><br/>
    Mode: ${report.incremental ? 'incremental' : 'full'}<br/>
    Findings: ${findings.length} total · ${open.length} open/regressed</p>
    <ul>${open
      .slice(0, 25)
      .map(
        (f) =>
          `<li><strong>${f.status}</strong> — ${escapeHtml(f.title)}${
            f.deepLink ? ` · <a href="https://www.selpic.com.au${f.deepLink}">Open</a>` : ''
          }</li>`
      )
      .join('')}</ul>
    <p><a href="https://www.selpic.com.au/admin/agent">Open Agent hub → Site Review</a></p>
    <p style="color:#666;font-size:12px">Report only — never edits the homepage Hero.</p>
  `

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function runQuarterlySiteReviewCron(opts?: {
  now?: Date
  force?: boolean
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}): Promise<QuarterlySiteReviewResult> {
  const env = opts?.env || process.env
  const now = opts?.now || new Date()

  if (!isSiteReviewCronEnabled(env)) {
    return { ok: true, skipped: true, reason: 'SITE_REVIEW_CRON_ENABLED is off' }
  }

  const window = getSiteReviewQuarterWindow(now)
  if (!opts?.force && !window.inWindow) {
    return {
      ok: true,
      skipped: true,
      reason: 'Outside AU FY quarter-start window (Sydney day 1–2 of Jul/Oct/Jan/Apr)',
      periodKey: window.periodKey,
      sydneyDate: window.sydneyDate,
    }
  }

  const snapshot = await readSiteReviewSnapshot()
  if (
    !opts?.force &&
    hasQuarterlyReportForPeriod(snapshot.reports, window.periodKey)
  ) {
    return {
      ok: true,
      skipped: true,
      reason: `Quarterly report already exists for ${window.periodKey}`,
      periodKey: window.periodKey,
      sydneyDate: window.sydneyDate,
    }
  }

  const priorForPeriod = snapshot.reports.find((r) => r.periodKey === window.periodKey)
  const incremental = Boolean(
    priorForPeriod ||
      snapshot.reports.some((r) => r.periodKey !== window.periodKey && r.findings.length > 0)
  )

  const report = await runSiteReview({
    incremental,
    priorReports: snapshot.reports,
    trigger: 'quarterly',
    env,
    fetchImpl: opts?.fetchImpl,
    now,
  })
  report.id = newSiteReviewReportId()
  report.findings = sortSiteReviewFindings(report.findings)

  await prependSiteReviewReport(report)

  const openCount = report.findings.filter(
    (f) => f.status === 'open' || f.status === 'regressed'
  ).length

  let emailSent = false
  let emailError: string | undefined
  if (isSiteReviewCronEmailEnabled(env)) {
    const recipients = resolveAdminNotificationRecipients()
    const origin = resolvePublicSiteOrigin(env)
    const mail = buildSummaryEmail(report, origin)
    const sent = await sendEmailViaResendServer({
      to: recipients,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      skipTracking: true,
    })
    if (sent.ok) emailSent = true
    else emailError = sent.logMessage
  } else {
    emailError = 'SITE_REVIEW_CRON_EMAIL is off'
  }

  return {
    ok: true,
    skipped: false,
    periodKey: report.periodKey,
    sydneyDate: window.sydneyDate,
    reportId: report.id,
    openCount,
    emailSent,
    emailError: emailSent ? undefined : emailError,
  }
}
