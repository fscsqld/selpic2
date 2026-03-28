/**
 * Server-only: send transactional email when bespoke label request status changes.
 * Uses Resend REST API (no `resend` npm package required).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export type BespokeDecision = 'approved' | 'rejected'

export async function sendBespokeDecisionEmail(params: {
  to: string
  customerName: string
  requestId: string
  decision: BespokeDecision
}): Promise<{ ok: true; providerId?: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    return { ok: false, error: 'RESEND_API_KEY is not set (email not sent)' }
  }

  const from =
    process.env.RESEND_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    'SELPIC <onboarding@resend.dev>'

  const safeName = escapeHtml(params.customerName || 'Customer')
  const safeId = escapeHtml(params.requestId)

  const subject =
    params.decision === 'approved'
      ? 'Your bespoke label request was approved – SELPIC'
      : 'Update on your bespoke label request – SELPIC'

  const bodyIntro =
    params.decision === 'approved'
      ? `<p>Hi ${safeName},</p>
<p>Thank you for your bespoke label request. We have <strong>approved</strong> your submission and will proceed with the next steps (pricing / proof / production) as discussed.</p>`
      : `<p>Hi ${safeName},</p>
<p>Thank you for your bespoke label request. After review, we are unable to proceed with this request as submitted. If you have questions or would like to adjust your artwork or specifications, please reply to this email and our team will help.</p>`

  const html = `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
${bodyIntro}
<p style="font-size: 13px; color: #555;">Reference ID: <code>${safeId}</code></p>
<p style="margin-top: 24px;">Best regards,<br/>SELPIC Team</p>
</body></html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [params.to.trim()],
        subject,
        html
      })
    })

    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) {
      return {
        ok: false,
        error: data?.message || `Resend error (${res.status})`
      }
    }
    return { ok: true, providerId: data?.id }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to send email'
    }
  }
}

export { isValidEmail }
