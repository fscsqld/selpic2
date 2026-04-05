import { NextResponse } from 'next/server'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

type SendOrderEmailBody = {
  to: string | string[]
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: string
    contentType?: string
  }>
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * @deprecated Public browser access removed. Use `sendAdminComposeEmailAction` from `app/actions/emails.ts`.
 * Optional: INTERNAL_EMAIL_API_SECRET + header x-internal-email-secret for trusted server callers only.
 */
export async function POST(req: Request) {
  const secret = process.env.INTERNAL_EMAIL_API_SECRET?.trim()
  const hdr = req.headers.get('x-internal-email-secret')?.trim()
  if (!secret || hdr !== secret) {
    return NextResponse.json(
      { success: false, message: 'Forbidden. Use authenticated server actions to send email.' },
      { status: 403 }
    )
  }

  try {
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

    const attach =
      Array.isArray(body.attachments) && body.attachments.length > 0
        ? body.attachments
            .filter((a) => isNonEmptyString(a?.filename) && isNonEmptyString(a?.content))
            .map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: isNonEmptyString(a.contentType) ? a.contentType : undefined,
            }))
        : undefined

    const r = await sendEmailViaResendServer({
      to: safeRecipients,
      subject: body.subject,
      html: body.html,
      skipBranding: true,
      skipTracking: true,
      attachments: attach,
    })

    if (!r.ok) {
      console.error('[orders/email/send internal]', r.logMessage)
      return NextResponse.json({ success: false, message: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logAndSafeMessage('orders/email/send', error)
    return NextResponse.json({ success: false, message: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
