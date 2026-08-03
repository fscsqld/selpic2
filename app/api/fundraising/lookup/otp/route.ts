import { NextResponse } from 'next/server'

import { issueLookupOtpWithCode } from '@/lib/fundraising/lookupAuth'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { token?: string } | null
    const token = String(body?.token || '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'Missing access token.' }, { status: 400 })

    const issued = await issueLookupOtpWithCode(token)
    if (!issued.ok) return NextResponse.json({ ok: false, error: issued.error }, { status: 400 })

    const email = await sendEmailViaResendServer({
      to: issued.email,
      subject: 'SELPIC Fundraising — Your verification code',
      html: `
        <p>Your one-time verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;">${issued.otp}</p>
        <p>This code expires in 10 minutes. If you did not request access, you can ignore this email.</p>
      `,
      skipTracking: true,
    })

    if (!email.ok) {
      return NextResponse.json(
        { ok: false, error: email.logMessage || 'Failed to send verification email.' },
        { status: 500 }
      )
    }

    const masked = issued.email.replace(/(.{2}).+(@.+)/, '$1***$2')
    return NextResponse.json({
      ok: true,
      message: `A verification code was sent to ${masked}.`,
      expiresAt: issued.expiresAt,
      organizationName: issued.partner.organizationName,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'OTP request failed' },
      { status: 500 }
    )
  }
}
