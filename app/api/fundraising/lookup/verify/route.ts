import { NextResponse } from 'next/server'

import { LOOKUP_SESSION_HOURS } from '@/lib/fundraising/lookupConstants'
import { LOOKUP_SESSION_COOKIE, verifyLookupOtp } from '@/lib/fundraising/lookupAuth'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { token?: string; otp?: string } | null
    const token = String(body?.token || '').trim()
    const otp = String(body?.otp || '').trim()
    if (!token || !otp) {
      return NextResponse.json({ ok: false, error: 'Token and verification code are required.' }, { status: 400 })
    }

    const verified = await verifyLookupOtp(token, otp)
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: verified.error }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(LOOKUP_SESSION_COOKIE, verified.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: LOOKUP_SESSION_HOURS * 60 * 60,
    })
    return res
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Verification failed' },
      { status: 500 }
    )
  }
}
