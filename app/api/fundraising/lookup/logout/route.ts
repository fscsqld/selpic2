import { NextResponse } from 'next/server'

import { LOOKUP_SESSION_COOKIE } from '@/lib/fundraising/lookupAuth'

/** End the partner Lookup browser session (clears httpOnly cookie). */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(LOOKUP_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
