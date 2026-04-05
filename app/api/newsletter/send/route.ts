import { NextResponse } from 'next/server'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import { appendTransactionalEmailBrandingHtml } from '@/lib/transactionalEmailBranding'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

/**
 * @deprecated Public browser access removed. Use `sendNewsletterBulkAction` from `app/actions/emails.ts`.
 * Optional: set INTERNAL_EMAIL_API_SECRET and send header x-internal-email-secret for server automation only.
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
    const { to, subject, html, attachments } = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    const recipients = Array.isArray(to) ? to : [to]
    const htmlWithBranding = appendTransactionalEmailBrandingHtml(String(html))

    const attach =
      attachments && Array.isArray(attachments) && attachments.length > 0
        ? attachments.map((file: { filename?: string; content?: string; contentType?: string }) => ({
            filename: file.filename || 'attachment',
            content: file.content || '',
            contentType: file.contentType,
          }))
        : undefined

    const r = await sendEmailViaResendServer({
      to: recipients,
      subject: String(subject),
      html: htmlWithBranding,
      skipBranding: true,
      skipTracking: true,
      attachments: attach,
    })

    if (!r.ok) {
      console.error('[newsletter/send internal]', r.logMessage)
      return NextResponse.json({ success: false, message: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error: unknown) {
    logAndSafeMessage('newsletter/send', error)
    return NextResponse.json({ success: false, message: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
