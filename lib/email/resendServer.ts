import { Resend } from 'resend'
import { appendTransactionalEmailBrandingHtml } from '@/lib/transactionalEmailBranding'
import { TrackedEmailTemplate } from '@/lib/emailTrackingService'

const resendFrom = () =>
  process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'SELPIC <info@selpic.com.au>'

export type ResendAttachmentInput = {
  filename: string
  content: string
  contentType?: string
}

/**
 * Send transactional email via Resend (server-only). Applies branding + tracking pixel when requested.
 */
export async function sendEmailViaResendServer(params: {
  to: string | string[]
  subject: string
  html: string
  skipBranding?: boolean
  skipTracking?: boolean
  attachments?: ResendAttachmentInput[]
}): Promise<{ ok: true } | { ok: false; logMessage: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, logMessage: 'RESEND_API_KEY is not set' }
  }

  const recipients = (Array.isArray(params.to) ? params.to : [params.to]).map((e) => String(e).trim()).filter(Boolean)
  if (recipients.length === 0) {
    return { ok: false, logMessage: 'No recipients' }
  }

  let html = params.html
  if (!params.skipBranding) {
    html = appendTransactionalEmailBrandingHtml(html)
  }

  if (!params.skipTracking) {
    const emailId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    html = TrackedEmailTemplate.addTrackingToContent(html, emailId)
  }

  const resend = new Resend(apiKey)
  const payload = {
    from: resendFrom(),
    replyTo: process.env.RESEND_FROM_EMAIL || 'info@selpic.com.au',
    to: recipients,
    subject: params.subject.slice(0, 500),
    html,
    ...(params.attachments && params.attachments.length > 0
      ? {
          attachments: params.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        }
      : {}),
  }

  const result = await resend.emails.send(payload)
  if (result.error) {
    return { ok: false, logMessage: result.error.message || 'Resend error' }
  }
  return { ok: true }
}
