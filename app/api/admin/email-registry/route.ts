import { NextResponse } from 'next/server'
import {
  normalizeAdminEmail,
  requireSuperAdminForRequest,
  pushRegistryToAuthUserByEmail,
} from '@/lib/supabase/adminEmailRegistryServer'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const actor = await requireSuperAdminForRequest(req)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const sb = getSupabaseAdmin()
  const { data, error } = await sb.from('admin_email_registry').select('*').order('email', { ascending: true })

  if (error) {
    console.error('[email-registry GET]', error.message)
    return NextResponse.json(
      { error: 'Failed to read registry. Apply migration supabase/migrations/002_admin_email_registry.sql if missing.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ entries: data ?? [] })
}

type PostBody = {
  email?: string
  role?: 'admin' | 'super_admin'
  permissions?: string[]
  is_active?: boolean
}

export async function POST(req: Request) {
  const actor = await requireSuperAdminForRequest(req)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as PostBody | null
  const emailRaw = body?.email?.trim()
  if (!emailRaw || !emailRaw.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const role = body?.role === 'super_admin' ? 'super_admin' : 'admin'
  const permissions = Array.isArray(body?.permissions) ? body.permissions.map(String) : []
  const is_active = body?.is_active !== false

  const email = normalizeAdminEmail(emailRaw)
  const sb = getSupabaseAdmin()

  const { error } = await sb.from('admin_email_registry').upsert(
    {
      email,
      role,
      permissions,
      is_active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  )

  if (error) {
    console.error('[email-registry POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await pushRegistryToAuthUserByEmail(email)
  } catch (e) {
    console.error('[email-registry POST] push to auth', e)
  }

  return NextResponse.json({ ok: true, email })
}

type PatchBody = {
  email?: string
  permissions?: string[]
  is_active?: boolean
  role?: 'admin' | 'super_admin'
}

export async function PATCH(req: Request) {
  const actor = await requireSuperAdminForRequest(req)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null
  const emailRaw = body?.email?.trim()
  if (!emailRaw || !emailRaw.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  const email = normalizeAdminEmail(emailRaw)

  const sb = getSupabaseAdmin()
  const { data: existing, error: readErr } = await sb.from('admin_email_registry').select('*').eq('email', email).maybeSingle()
  if (readErr) {
    console.error('[email-registry PATCH] read', readErr.message)
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const ex = existing as {
    email: string
    role: string
    permissions: string[]
    is_active: boolean
  }

  const row = {
    role: body?.role === 'admin' || body?.role === 'super_admin' ? body.role : ex.role,
    permissions: Array.isArray(body?.permissions) ? body.permissions.map(String) : ex.permissions,
    is_active: typeof body?.is_active === 'boolean' ? body.is_active : ex.is_active,
    updated_at: new Date().toISOString(),
  }

  const { error } = await sb.from('admin_email_registry').update(row).eq('email', email)
  if (error) {
    console.error('[email-registry PATCH]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await pushRegistryToAuthUserByEmail(email)
  } catch (e) {
    console.error('[email-registry PATCH] push to auth', e)
  }

  return NextResponse.json({ ok: true, email })
}

export async function DELETE(req: Request) {
  const actor = await requireSuperAdminForRequest(req)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const url = new URL(req.url)
  const emailRaw = url.searchParams.get('email')?.trim()
  if (!emailRaw || !emailRaw.includes('@')) {
    return NextResponse.json({ error: 'email query required' }, { status: 400 })
  }
  const email = normalizeAdminEmail(emailRaw)

  if (normalizeAdminEmail(actor.email ?? '') === email) {
    return NextResponse.json({ error: 'Cannot remove your own registry entry' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  const { error } = await sb.from('admin_email_registry').delete().eq('email', email)
  if (error) {
    console.error('[email-registry DELETE]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await pushRegistryToAuthUserByEmail(email)
  } catch (e) {
    console.error('[email-registry DELETE] sync auth', e)
  }

  return NextResponse.json({ ok: true })
}
