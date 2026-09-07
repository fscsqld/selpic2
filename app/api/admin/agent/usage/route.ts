import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import { readAgentRunsSnapshot } from '@/lib/server/agentRunsStore'
import {
  summarizeAgentRunsForMonth,
  utcMonthKey,
} from '@/lib/agent/agentRuns'
import { isAgentOpenAiEnabled } from '@/lib/agent/agentOpenAiChat'
import { isProductImageGenEnabled } from '@/lib/agent/productImageryGenerate'

export const dynamic = 'force-dynamic'

/**
 * GET — Agent OpenAI usage for current UTC month (HITL estimates).
 * Gate: agent:read or agent:run.
 * Not accounting sandbox totals — see OpenAI Billing for invoice truth.
 */
export async function GET(req: Request) {
  const gate = await requireAdminAnyPermission(['agent:read', 'agent:run'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const monthParam = url.searchParams.get('month')?.trim()
  const monthKey =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : utcMonthKey()

  const snapshot = await readAgentRunsSnapshot()
  const summary = summarizeAgentRunsForMonth(snapshot.runs, monthKey)

  return NextResponse.json({
    ok: true,
    monthKey: summary.monthKey,
    totalCostUsd: summary.totalCostUsd,
    callCount: summary.callCount,
    chatCalls: summary.chatCalls,
    imageCalls: summary.imageCalls,
    bySector: summary.bySector,
    byModel: summary.byModel,
    recent: summary.recent,
    updatedAt: snapshot.updatedAt || null,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    draftLlmEnabled: isAgentOpenAiEnabled(),
    imageGenEnabled: isProductImageGenEnabled(),
    billingUrl: 'https://platform.openai.com/account/billing',
    disclaimer:
      'Estimated Agent HITL usage only (this hub). Accounting sandbox OpenAI totals are separate (local IndexedDB). OpenAI Billing is the invoice source of truth.',
  })
}
