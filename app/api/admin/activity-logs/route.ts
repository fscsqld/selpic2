import { NextResponse } from 'next/server'

import type { ActivityLog, ActivityLogAction } from '@/lib/adminActivityLog'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type AdminActivityLogRow = {
  id: string
  action: string
  performed_by: string
  target: string | null
  occurred_at: string
  ip_address: string | null
  user_agent: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const ALLOWED_ACTIONS = new Set<string>([
  'login',
  'logout',
  'password_changed',
  'permissions_updated',
  'status_toggled',
  'admin_created',
  'admin_deleted',
  'profile_updated',
  'username_changed',
  'product_created',
  'product_updated',
  'product_deleted',
  'product_stock_adjusted',
  'cms_content_created',
  'cms_content_updated',
  'cms_content_deleted',
  'promo_code_created',
  'promo_code_updated',
  'promo_code_deleted',
  'media_uploaded',
  'media_deleted',
])

function rowToClient(row: AdminActivityLogRow): ActivityLog {
  return {
    id: row.id,
    action: row.action as ActivityLogAction,
    performedBy: row.performed_by,
    targetAdmin: row.target || undefined,
    timestamp: row.occurred_at,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    details:
      row.details && typeof row.details === 'object'
        ? (row.details as ActivityLog['details'])
        : undefined,
  }
}

export async function GET() {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('admin_activity_logs')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(1000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const logs = ((data || []) as AdminActivityLogRow[]).map(rowToClient)
    return NextResponse.json({ logs })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load activity logs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> | null = null
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const id = String(body?.id || '').trim()
  const action = String(body?.action || '').trim()
  const performedBy = String(body?.performedBy || '').trim() || user.email || 'Admin'
  const timestamp = String(body?.timestamp || '').trim() || new Date().toISOString()

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const row = {
    id,
    action,
    performed_by: performedBy,
    target: body?.target ? String(body.target).trim() : null,
    occurred_at: timestamp,
    ip_address: body?.ipAddress ? String(body.ipAddress) : null,
    user_agent: body?.userAgent ? String(body.userAgent) : null,
    details:
      body?.details && typeof body.details === 'object' && !Array.isArray(body.details)
        ? body.details
        : null,
  }

  try {
    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('admin_activity_logs')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      log: data ? rowToClient(data as AdminActivityLogRow) : null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to save activity log'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
