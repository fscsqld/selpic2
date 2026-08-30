import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import {
  getFundraisingOutreachTargetById,
  listFundraisingOutreachTargetsFromDb,
  upsertFundraisingOutreachTarget,
} from '@/lib/fundraising/persistence'
import { newFundraisingId } from '@/lib/fundraising/ids'
import type {
  FundraisingOutreachTarget,
  FundraisingOutreachTargetStatus,
} from '@/lib/fundraising/types'
import { isSupabaseConfigured } from '@/lib/supabase/admin'

const STATUSES = new Set<FundraisingOutreachTargetStatus>([
  'PENDING',
  'CONTACTED',
  'CONVERTED',
  'FAILED',
  'OPTED_OUT',
])

export async function GET(req: Request) {
  const gate = await requireAdminPermission('fundraising:read')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      targets: [],
      warning: 'Supabase not configured',
    })
  }

  try {
    const url = new URL(req.url)
    const statusRaw = url.searchParams.get('status') || ''
    const status = STATUSES.has(statusRaw as FundraisingOutreachTargetStatus)
      ? (statusRaw as FundraisingOutreachTargetStatus)
      : undefined
    const targets = await listFundraisingOutreachTargetsFromDb({ status, limit: 200 })
    return NextResponse.json({ ok: true, targets })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list targets' },
      { status: 500 }
    )
  }
}

type UpsertBody = {
  id?: string
  organizationName?: string
  contactEmail?: string
  contactName?: string
  orgType?: string
  state?: string
  status?: string
  notes?: string
}

export async function POST(req: Request) {
  const gate = await requireAdminPermission('fundraising:write')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const body = (await req.json().catch(() => null)) as UpsertBody | null
    const organizationName = String(body?.organizationName || '').trim()
    const contactEmail = String(body?.contactEmail || '').trim().toLowerCase()
    if (!organizationName) {
      return NextResponse.json({ error: 'Organization name is required.' }, { status: 400 })
    }
    if (contactEmail && !contactEmail.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid contact email.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const id = String(body?.id || '').trim() || newFundraisingId('fot')
    const existing = await getFundraisingOutreachTargetById(id)
    const statusRaw = String(body?.status || existing?.status || 'PENDING').trim()
    const status = STATUSES.has(statusRaw as FundraisingOutreachTargetStatus)
      ? (statusRaw as FundraisingOutreachTargetStatus)
      : 'PENDING'

    const notes = String(body?.notes || '').trim()
    const payload = {
      ...(existing?.payload || {}),
      ...(notes ? { notes } : {}),
    }

    const target: FundraisingOutreachTarget = {
      id,
      organizationName,
      contactEmail: contactEmail || undefined,
      contactName: String(body?.contactName || existing?.contactName || '').trim() || undefined,
      orgType: String(body?.orgType || existing?.orgType || '').trim() || undefined,
      state: String(body?.state || existing?.state || '').trim() || undefined,
      status,
      lastSentAt: existing?.lastSentAt,
      lastError: existing?.lastError,
      convertedPartnerId: existing?.convertedPartnerId,
      payload,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }

    const saved = await upsertFundraisingOutreachTarget(target)
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, target })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save target' },
      { status: 500 }
    )
  }
}
