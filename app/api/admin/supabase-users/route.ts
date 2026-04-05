import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { deletePublicDataForAuthUser } from '@/lib/supabase/cascadeDeleteUserData'

export async function GET() {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const sb = getSupabaseAdmin()
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })

  if (error) {
    console.error('[admin/supabase-users GET]', error.message)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }

  const users =
    data.users?.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: u.banned_until,
      user_metadata: u.user_metadata ?? {},
      app_metadata: u.app_metadata ?? {},
    })) ?? []

  return NextResponse.json({ users })
}

type Body = {
  userId?: string
  action?: 'grantAdmin' | 'revokeAdmin' | 'ban' | 'unban' | 'setPassword'
  newPassword?: string
}

export async function PATCH(req: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as Body | null
  const userId = body?.userId?.trim()
  const action = body?.action
  if (!userId || !action) {
    return NextResponse.json({ error: 'userId and action required' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  if (action === 'setPassword') {
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }
    const { data: existing, error: getErr } = await sb.auth.admin.getUserById(userId)
    if (getErr || !existing.user) {
      return NextResponse.json(
        { error: 'No user with this id exists in Supabase Auth. Check the user list or email spelling.' },
        { status: 404 }
      )
    }
    const { error } = await sb.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) {
      console.error('[admin/supabase-users setPassword]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'ban') {
    const { error } = await sb.auth.admin.updateUserById(userId, {
      ban_duration: '876600h',
    })
    if (error) {
      console.error('[admin/supabase-users ban]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'unban') {
    const { error } = await sb.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    })
    if (error) {
      console.error('[admin/supabase-users unban]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  const { data: existing, error: getErr } = await sb.auth.admin.getUserById(userId)
  if (getErr || !existing.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const um = { ...(existing.user.user_metadata as Record<string, unknown>) }

  if (action === 'grantAdmin') {
    um.admin = true
  } else if (action === 'revokeAdmin') {
    delete um.admin
    if (um.role === 'admin') delete um.role
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { error } = await sb.auth.admin.updateUserById(userId, {
    user_metadata: um,
  })
  if (error) {
    console.error('[admin/supabase-users metadata]', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

type DeleteBody = { userId?: string }

/**
 * Deletes auth user after removing dependent public rows (orders by email, profiles, optional cart tables, registry).
 */
export async function DELETE(req: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as DeleteBody | null
  const userId = body?.userId?.trim()
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  if (userId === admin.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account while signed in. Use another admin or sign out first.' },
      { status: 400 }
    )
  }

  const sb = getSupabaseAdmin()

  const { data: authRow, error: getErr } = await sb.auth.admin.getUserById(userId)
  if (getErr || !authRow.user) {
    return NextResponse.json({ error: 'User not found in Auth.' }, { status: 404 })
  }

  const cascade = await deletePublicDataForAuthUser(sb, userId, authRow.user.email)
  if (!cascade.ok) {
    return NextResponse.json({ error: cascade.error }, { status: 409 })
  }

  const { error } = await sb.auth.admin.deleteUser(userId)
  if (error) {
    console.error('[admin/supabase-users DELETE auth]', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
