import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { listFundraisingOutreachTargetsFromDb } from '@/lib/fundraising/persistence'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import type { FundraisingOutreachTargetStatus } from '@/lib/fundraising/types'
import { AGENT_SECTORS } from '@/lib/agent/sectors'

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
 * Agent Core hub summary — Wave 2.
 * Fundraising stats when caller has fundraising:read; sectors list is always returned.
 *
 * PERMISSION: temporary `fundraising:read`. Before a second live sector, switch to
 * `agent:read` — see `.cursor/rules/selpic-agent-permissions.mdc` / Phase B4.
 */
export async function GET() {
  const gate = await requireAdminPermission('fundraising:read')
  if (!gate.ok) {
    // Soft: allow hub metadata for other future perms — for now fundraising:read is the Wave 2 gate
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const sectors = AGENT_SECTORS.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
    status: s.status,
    href: s.href,
    requiredPermission: s.requiredPermission,
    autonomyNote: s.autonomyNote,
  }))

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      sectors,
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
