/**
 * Fetch full body for a Resend `email.received` event (webhook is metadata-only).
 * GET https://api.resend.com/emails/receiving/{email_id}
 */

export type ResendReceivedEmailPayload = {
  id?: string
  from?: string
  subject?: string
  text?: string | null
  html?: string | null
  message_id?: string
}

/** Prefer plain text; fall back to lightly stripped HTML. */
export function textFromResendReceivedEmail(
  email: ResendReceivedEmailPayload | null | undefined
): string {
  if (!email) return ''
  const plain = String(email.text || '').trim()
  if (plain) return plain
  const html = String(email.html || '')
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export async function fetchResendReceivedEmail(
  emailId: string
): Promise<
  { ok: true; email: ResendReceivedEmailPayload } | { ok: false; error: string }
> {
  const id = String(emailId || '').trim()
  if (!id) return { ok: false, error: 'email_id is empty' }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not set' }

  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    const json = (await res.json().catch(() => null)) as ResendReceivedEmailPayload & {
      message?: string
      name?: string
    } | null
    if (!res.ok) {
      return {
        ok: false,
        error: json?.message || json?.name || `Resend receiving HTTP ${res.status}`,
      }
    }
    return { ok: true, email: json || { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Resend receiving fetch failed' }
  }
}

/**
 * Reply-To for fundraising outreach.
 * Set FUNDRAISING_OUTREACH_REPLY_TO (or RESEND_INBOUND_REPLY_TO) to a Resend Receiving address
 * so replies hit email.received → Needs reply. Falls back to RESEND_FROM_EMAIL.
 */
export function fundraisingOutreachReplyTo(): string {
  return (
    process.env.FUNDRAISING_OUTREACH_REPLY_TO?.trim() ||
    process.env.RESEND_INBOUND_REPLY_TO?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'info@selpic.com.au'
  )
}
