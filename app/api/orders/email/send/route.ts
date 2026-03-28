import { NextResponse } from 'next/server'

type SendOrderEmailBody = {
  to: string | string[]
  subject: string
  html: string
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY
    const resendFrom =
      process.env.RESEND_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      'SELPIC <info@selpic.com.au>'

    if (!resendApiKey) {
      return NextResponse.json(
        { success: false, message: 'RESEND_API_KEY is not set' },
        { status: 500 }
      )
    }

    const body = (await req.json().catch(() => null)) as SendOrderEmailBody | null
    if (!body) {
      return NextResponse.json({ success: false, message: 'Missing body' }, { status: 400 })
    }

    if (!isNonEmptyString(body.subject) || !isNonEmptyString(body.html)) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: subject, html' },
        { status: 400 }
      )
    }

    const recipients = Array.isArray(body.to) ? body.to : [body.to]
    const safeRecipients = recipients.filter((r) => isNonEmptyString(r) && String(r).trim().length > 3)

    if (safeRecipients.length === 0) {
      return NextResponse.json({ success: false, message: 'Missing required field: to' }, { status: 400 })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: resendFrom,
        reply_to: process.env.RESEND_FROM_EMAIL || 'info@selpic.com.au',
        to: safeRecipients,
        subject: body.subject,
        html: body.html
      })
    })

    const data = (await resendRes.json().catch(() => ({}))) as any
    if (!resendRes.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || 'Failed to send email', data },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

