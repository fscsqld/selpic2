import { NextResponse } from 'next/server'

import { loadPerformanceOpportunities } from '@/lib/agent/performanceCoach'
import { requireAdminAnyPermission } from '@/lib/supabase/requireAdminPermission'

export const dynamic = 'force-dynamic'

/**
 * Wave 4 — Performance coach opportunity cards (read-only suggestions).
 * Gate: analytics:read (legacy aliases) or agent:read.
 */
export async function GET() {
  const gate = await requireAdminAnyPermission(['analytics:read', 'agent:read'])
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status })
  }

  try {
    const opportunities = await loadPerformanceOpportunities()
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      opportunities,
      autonomyNote:
        'Suggestions only — no auto Mark Paid, price changes, or outbound sends. Human decides every action.',
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to load performance opportunities',
      },
      { status: 500 }
    )
  }
}
