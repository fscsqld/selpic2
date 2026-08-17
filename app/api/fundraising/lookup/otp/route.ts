import { NextResponse } from 'next/server'

import {
  discardUnsentLookupOtp,
  issueLookupOtpWithCode,
} from '@/lib/fundraising/lookupAuth'
import { parseLookupOtpIssueReason } from '@/lib/fundraising/lookupOtpPolicy'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { token?: string; reason?: string } | null
    const token = String(body?.token || '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'Missing access token.' }, { status: 400 })
    const reason = parseLookupOtpIssueReason(body?.reason)

    const issued = await issueLookupOtpWithCode(token, { reason })
    if (!issued.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            issued.error === 'Invalid or inactive access link.'
              ? 'Invalid or inactive access link. Open the latest Lookup URL from your welcome email, or ask SELPIC to use Reset Access Link.'
              : issued.error,
        },
        { status: 400 }
      )
    }

    const masked = issued.email.replace(/(.{2}).+(@.+)/, '$1***$2')

    if (!issued.shouldSendEmail || !issued.otp) {
      return NextResponse.json({
        ok: true,
        emailed: false,
        message:
          reason === 'manual'
            ? `A new code was just requested for ${masked}. Check your inbox (and spam). If nothing arrives, wait a few seconds and click Resend again.`
            : `A verification code was already sent recently to ${masked}. Check your inbox (and spam), or use Resend verification code if you need a new one.`,
        expiresAt: issued.expiresAt,
        organizationName: issued.partner.organizationName,
      })
    }

    const email = await sendEmailViaResendServer({
      to: issued.email,
      subject: 'SELPIC Fundraising — Your verification code',
      html: `
        <p>Your one-time verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;">${issued.otp}</p>
        <p>This code expires in 10 minutes. Previous codes for this link no longer work — use the latest email.</p>
        <p>SELPIC puts trust and transparency with our community partners first.</p>
        <p>If you did not request access, you can ignore this email.</p>
      `,
      skipTracking: true,
    })

    if (!email.ok) {
      await discardUnsentLookupOtp(token)
      return NextResponse.json(
        { ok: false, error: email.logMessage || 'Failed to send verification email.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      emailed: true,
      message:
        reason === 'manual'
          ? `A new verification code was sent to ${masked}. Use this latest code — previous codes no longer work.`
          : `A verification code was sent to ${masked}.`,
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
