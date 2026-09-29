import { NextResponse } from 'next/server'
import { requireAdminAnyPermission } from '@/lib/supabase/requireAdminPermission'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { clampVipGradeCode, normalizeVipOverrideEmail } from '@/lib/vipManualGradeOverride'
import {
  clearVipManualGradeOverride,
  getVipManualGradeOverrideForEmail,
  upsertVipManualGradeOverride,
} from '@/lib/server/vipManualGradeOverridesStore'

/**
 * Admin-only: persist manual VIP grade by customer email for checkout server validation.
 * GET ?email= — read one override
 * PUT { email, gradeCode, reason? } — set override
 * DELETE { email } — clear override (sales grade resumes)
 */
export async function GET(req: Request) {
  const gate = await requireAdminAnyPermission(['admin:manage', 'users:write', 'users:read'])
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }
  try {
    const email = normalizeVipOverrideEmail(new URL(req.url).searchParams.get('email') || '')
    if (!email) {
      return NextResponse.json({ error: 'email query required' }, { status: 400 })
    }
    const override = await getVipManualGradeOverrideForEmail(email)
    return NextResponse.json({ override })
  } catch (e) {
    logAndSafeMessage('admin/vip-grade-override GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const gate = await requireAdminAnyPermission(['admin:manage', 'users:write'])
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeVipOverrideEmail(String(body?.email || ''))
    const gradeCode = clampVipGradeCode(body?.gradeCode)
    if (!email || gradeCode === null) {
      return NextResponse.json({ error: 'email and gradeCode (0–4) are required.' }, { status: 400 })
    }
    const result = await upsertVipManualGradeOverride({
      email,
      gradeCode,
      reason: typeof body?.reason === 'string' ? body.reason : undefined,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 })
    }
    return NextResponse.json({ ok: true, override: result.override })
  } catch (e) {
    logAndSafeMessage('admin/vip-grade-override PUT', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const gate = await requireAdminAnyPermission(['admin:manage', 'users:write'])
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeVipOverrideEmail(String(body?.email || ''))
    if (!email) {
      return NextResponse.json({ error: 'email is required.' }, { status: 400 })
    }
    const result = await clearVipManualGradeOverride(email)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    logAndSafeMessage('admin/vip-grade-override DELETE', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
