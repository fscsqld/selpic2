import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { listFundraisingOutreachTargetsFromDb } from '@/lib/fundraising/persistence'
import { isSupabaseConfigured, getSupabaseAdmin } from '@/lib/supabase/admin'
import type { FundraisingOutreachTargetStatus } from '@/lib/fundraising/types'
import { AGENT_SECTORS } from '@/lib/agent/sectors'
import {
  countBespokeStickerRequestsByStatus,
  readBespokeStickerRequests,
} from '@/lib/server/bespokeStickerRequests'
import { loadPerformanceOpportunities } from '@/lib/agent/performanceCoach'

export const dynamic = 'force-dynamic'

type StatusCounts = Record<FundraisingOutreachTargetStatus | 'TOTAL', number>

function emptyCounts(): StatusCounts {
  return {
    PENDING: 0,
    CONTACTED: 0,
    CONVERTED: 0,
    FAILED: 0,
    OPTED_OUT: 0,
    TOTAL: 0,
  }
}

/**
 * Agent Core hub summary — Wave 3.
 * Gate: agent:read (legacy aliases: fundraising/messages/bespoke read).
 */
export async function GET() {
  const gate = await requireAdminPermission('agent:read')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const sectors = AGENT_SECTORS.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
    status: s.status,
    href: s.href,
    requiredPermission: s.requiredPermission,
    requiredAnyPermissions: s.requiredAnyPermissions,
    autonomyNote: s.autonomyNote,
  }))

  let inbound = {
    available: false as boolean,
    newMessages: 0,
    newBespoke: 0,
    workspaceHref: '/admin/agent/inbound',
    warning: undefined as string | undefined,
  }

  try {
    let newMessages = 0
    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdmin()
      const { count, error } = await admin
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
      if (!error) newMessages = count ?? 0
    }
    const bespoke = await readBespokeStickerRequests()
    const newBespoke = countBespokeStickerRequestsByStatus(bespoke, 'new')
    inbound = {
      available: true,
      newMessages,
      newBespoke,
      workspaceHref: '/admin/agent/inbound',
      warning: undefined,
    }
  } catch (e) {
    inbound = {
      available: false,
      newMessages: 0,
      newBespoke: 0,
      workspaceHref: '/admin/agent/inbound',
      warning: e instanceof Error ? e.message : 'Failed to load inbound stats',
    }
  }

  let performance = {
    available: false as boolean,
    opportunityCount: 0,
    workspaceHref: '/admin/agent/performance',
    warning: undefined as string | undefined,
  }

  try {
    const opportunities = await loadPerformanceOpportunities()
    performance = {
      available: true,
      opportunityCount: opportunities.length,
      workspaceHref: '/admin/agent/performance',
      warning: undefined,
    }
  } catch (e) {
    performance = {
      available: false,
      opportunityCount: 0,
      workspaceHref: '/admin/agent/performance',
      warning: e instanceof Error ? e.message : 'Failed to load performance stats',
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      sectors,
      inbound,
      performance,
      fundraising: { available: false, counts: emptyCounts(), warning: 'Supabase not configured' },
    })
  }

  try {
    const targets = await listFundraisingOutreachTargetsFromDb({ limit: 500 })
    const counts = emptyCounts()
    for (const t of targets) {
      counts.TOTAL += 1
      if (t.status in counts) {
        counts[t.status as FundraisingOutreachTargetStatus] += 1
      }
    }

    return NextResponse.json({
      ok: true,
      sectors,
      inbound,
      performance,
      fundraising: {
        available: true,
        counts,
        workspaceHref: '/admin/fundraising/agent',
      },
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: true,
        sectors,
        inbound,
        performance,
        fundraising: {
          available: false,
          counts: emptyCounts(),
          warning: e instanceof Error ? e.message : 'Failed to load outreach stats',
        },
      },
      { status: 200 }
    )
  }
}
