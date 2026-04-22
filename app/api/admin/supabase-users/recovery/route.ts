import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'

function siteBase(req: Request): string {
  const originHeader = req.headers.get('origin')
  const referer = req.headers.get('referer')
  let fromReferer: string | null = null
  if (referer) {
    try {
      const u = new URL(referer)
      fromReferer = `${u.protocol}//${u.host}`
    } catch {
      /* ignore */
    }
  }
  return (
    originHeader ||
    fromReferer ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

export async function POST(req: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as { userId?: string } | null
  const userId = body?.userId?.trim()
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  const { data: got, error: gErr } = await sb.auth.admin.getUserById(userId)
  if (gErr || !got.user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const email = got.user.email
  const base = siteBase(req)
  const { data, error } = await sb.auth.admin.generateLink({
    type: 'recovery',
    email,
    /** Client page only: recovery often returns tokens in the URL hash (implicit), which never reaches a Route Handler. */
    options: { redirectTo: `${base}/auth/reset-password` },
  })

  if (error || !data?.properties?.action_link) {
    console.error('[admin recovery]', error?.message)
    return NextResponse.json({ error: 'Could not generate recovery link' }, { status: 500 })
  }

  const link = data.properties.action_link
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px">
      <p>Hello,</p>
      <p>An administrator requested a password reset for your Selpic account.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset password</a></p>
      <p style="font-size:13px;color:#666">If the button does not work, copy this link:<br/><span style="word-break:break-all">${link}</span></p>
    </div>`

  const r = await sendEmailViaResendServer({
    to: email,
    subject: 'Selpic — Password reset (admin request)',
    html,
    skipTracking: true,
  })

  if (!r.ok) {
    return NextResponse.json({ error: 'Email send failed', detail: r.logMessage }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
