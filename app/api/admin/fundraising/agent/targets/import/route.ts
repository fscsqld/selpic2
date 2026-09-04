import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  listFundraisingOutreachTargetsFromDb,
  upsertFundraisingOutreachTarget,
} from '@/lib/fundraising/persistence'
import {
  assignInsertIds,
  buildTargetFromImportRow,
  parseOutreachTargetImportText,
  planOutreachTargetImport,
} from '@/lib/fundraising/outreachTargetImport'
import type { FundraisingOutreachTarget } from '@/lib/fundraising/types'

type ImportBody = {
  text?: string
}

export async function POST(req: Request) {
  const gate = await requireAdminPermission('fundraising:write')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const body = (await req.json().catch(() => null)) as ImportBody | null
    const text = String(body?.text || '')
    const parsed = parseOutreachTargetImportText(text)
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          error: parsed.parseErrors[0] || 'No importable rows.',
          parseErrors: parsed.parseErrors,
        },
        { status: 400 }
      )
    }

    // Load a wide slice so email dedupe / OT id sequences stay stable for typical lists.
    const existingTargets = await listFundraisingOutreachTargetsFromDb({ limit: 2000 })
    const existingByEmail = new Map<string, FundraisingOutreachTarget>()
    for (const t of existingTargets) {
      const email = String(t.contactEmail || '')
        .trim()
        .toLowerCase()
      if (!email) continue
      if (!existingByEmail.has(email)) existingByEmail.set(email, t)
    }

    const plan = planOutreachTargetImport(parsed.rows, existingByEmail)
    plan.truncated = parsed.truncated
    plan.parseErrors = parsed.parseErrors

    const insertIds = assignInsertIds(
      plan,
      existingTargets.map((t) => t.id)
    )
    const now = new Date().toISOString()
    const savedIds: string[] = []
    const errors: string[] = []

    for (let i = 0; i < plan.decisions.length; i++) {
      const d = plan.decisions[i]
      if (d.action === 'skip') continue

      try {
        if (d.action === 'insert') {
          const id = insertIds.get(i)
          if (!id) {
            errors.push(`Missing id for ${d.row.organizationName}`)
            continue
          }
          const target = buildTargetFromImportRow({ row: d.row, id, nowIso: now })
          const saved = await upsertFundraisingOutreachTarget(target)
          if (!saved.ok) {
            errors.push(`${d.row.organizationName}: ${saved.error}`)
            continue
          }
          savedIds.push(id)
          existingByEmail.set(d.normalizedEmail, target)
        } else if (d.action === 'update') {
          const target = buildTargetFromImportRow({
            row: d.row,
            id: d.existingId,
            existing: d.existing,
            nowIso: now,
          })
          const saved = await upsertFundraisingOutreachTarget(target)
          if (!saved.ok) {
            errors.push(`${d.row.organizationName}: ${saved.error}`)
            continue
          }
          savedIds.push(d.existingId)
          existingByEmail.set(d.normalizedEmail, target)
        }
      } catch (e) {
        errors.push(
          `${d.row.organizationName}: ${e instanceof Error ? e.message : 'save failed'}`
        )
      }
    }

    const skipReasons: Record<string, number> = {}
    for (const d of plan.decisions) {
      if (d.action !== 'skip') continue
      skipReasons[d.reason] = (skipReasons[d.reason] || 0) + 1
    }

    return NextResponse.json({
      ok: errors.length === 0,
      summary: {
        parsed: parsed.rows.length,
        inserted: plan.inserted,
        updated: plan.updated,
        skipped: plan.skipped,
        saved: savedIds.length,
        truncated: parsed.truncated,
        skipReasons,
      },
      savedIds,
      parseErrors: parsed.parseErrors,
      errors,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import failed' },
      { status: 500 }
    )
  }
}
