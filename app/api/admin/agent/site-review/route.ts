import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import {
  newSiteReviewReportId,
  prependSiteReviewReport,
  readSiteReviewSnapshot,
  updateSiteReviewFindingInStore,
} from '@/lib/server/siteReviewStore'
import {
  ALL_RUN_SECTORS,
  parseSiteReviewRunSectors,
  runSiteReview,
} from '@/lib/agent/siteReview/runSiteReview'
import { resolvePublicSiteOrigin } from '@/lib/agent/siteReview/publicOrigin'
import { siteReviewPeriodKey } from '@/lib/agent/siteReview/periodKey'
import {
  applyFindingStatus,
  isMarkableFindingStatus,
  sortSiteReviewFindings,
} from '@/lib/agent/siteReview/findingStatus'
import { recheckSiteReviewFinding } from '@/lib/agent/siteReview/recheckFinding'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET — latest Site Review snapshot (reports newest first).
 * Gate: agent:read | agent:run
 */
export async function GET() {
  const gate = await requireAdminAnyPermission(['agent:read', 'agent:run'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const snapshot = await readSiteReviewSnapshot()
  const latestRaw = snapshot.reports[0] || null
  const latest = latestRaw
    ? { ...latestRaw, findings: sortSiteReviewFindings(latestRaw.findings) }
    : null

  return NextResponse.json({
    ok: true,
    periodKey: siteReviewPeriodKey(),
    origin: resolvePublicSiteOrigin(),
    sectors: ALL_RUN_SECTORS,
    updatedAt: snapshot.updatedAt || null,
    latest,
    reports: snapshot.reports.slice(0, 8).map((r) => ({
      ...r,
      findings: sortSiteReviewFindings(r.findings),
    })),
  })
}

type PostBody = {
  sectors?: unknown
  incremental?: boolean
}

/**
 * POST — run manual Site Review (full or selected sectors). HITL L0 report only.
 * Client calls logAdminActivity after success (browser-only helper).
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission(['agent:read', 'agent:run'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PostBody = {}
  try {
    body = (await req.json()) as PostBody
  } catch {
    body = {}
  }

  const sectors = parseSiteReviewRunSectors(body.sectors)
  const snapshot = await readSiteReviewSnapshot()
  const report = await runSiteReview({
    sectors,
    incremental: body.incremental,
    priorReports: snapshot.reports,
    trigger: 'manual',
  })
  report.id = newSiteReviewReportId()

  await prependSiteReviewReport(report)

  const openCount = report.findings.filter(
    (f) => f.status === 'open' || f.status === 'regressed'
  ).length

  return NextResponse.json({
    ok: true,
    report: { ...report, findings: sortSiteReviewFindings(report.findings) },
    openCount,
    origin: resolvePublicSiteOrigin(),
  })
}

type PatchBody = {
  action?: string
  reportId?: string
  findingId?: string
  status?: string
}

/**
 * PATCH — mark finding status or re-check one finding (HITL).
 * Client logs activity after success.
 */
export async function PATCH(req: Request) {
  const gate = await requireAdminAnyPermission(['agent:read', 'agent:run'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PatchBody = {}
  try {
    body = (await req.json()) as PatchBody
  } catch {
    body = {}
  }

  const action = String(body.action || '').trim()
  const findingId = String(body.findingId || '').trim()
  const reportId = body.reportId ? String(body.reportId).trim() : undefined

  if (!findingId) {
    return NextResponse.json({ error: 'findingId required' }, { status: 400 })
  }

  if (action === 'set_status') {
    const status = String(body.status || '').trim()
    if (!isMarkableFindingStatus(status)) {
      return NextResponse.json(
        { error: 'status must be fixed, accepted, or wontfix' },
        { status: 400 }
      )
    }

    const result = await updateSiteReviewFindingInStore({
      reportId,
      findingId,
      mutate: (finding) => applyFindingStatus(finding, status),
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      ok: true,
      action: 'set_status',
      report: result.report,
      finding: result.finding,
    })
  }

  if (action === 'recheck') {
    const snapshot = await readSiteReviewSnapshot()
    if (!snapshot.reports.length) {
      return NextResponse.json({ error: 'No Site Review report yet' }, { status: 404 })
    }
    const reportIdx = reportId
      ? snapshot.reports.findIndex((r) => r.id === reportId)
      : 0
    if (reportIdx < 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    const report = snapshot.reports[reportIdx]
    const prior = report.findings.find(
      (f) => f.id === findingId || f.fingerprint.toLowerCase() === findingId.toLowerCase()
    )
    if (!prior) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 })
    }

    const nextFinding = await recheckSiteReviewFinding(prior)
    const write = await updateSiteReviewFindingInStore({
      reportId: report.id,
      findingId: prior.id,
      mutate: () => nextFinding,
    })
    if (!write.ok) {
      return NextResponse.json({ error: write.error }, { status: write.status })
    }

    return NextResponse.json({
      ok: true,
      action: 'recheck',
      report: write.report,
      finding: write.finding,
      priorStatus: prior.status,
      nextStatus: write.finding.status,
    })
  }

  return NextResponse.json(
    { error: 'action must be set_status or recheck' },
    { status: 400 }
  )
}
