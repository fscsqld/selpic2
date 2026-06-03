/**
 * Server-only: send transactional email when bespoke label request status changes.
 */

import { sendEmailViaResendServer } from '@/lib/email/resendServer'

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
  const safeName = escapeHtml(params.customerName || 'Customer')
  const safeId = escapeHtml(params.requestId)

  const subject =
    params.decision === 'approved'
      ? 'Your bespoke label request was approved – Selpic'
      : 'Update on your bespoke label request – Selpic'

  const bodyIntro =
    params.decision === 'approved'
      ? `<p>Hi ${safeName},</p>
<p>Thank you for your bespoke label request. We have <strong>approved</strong> your submission and will proceed with the next steps (pricing / proof / production) as discussed.</p>`
      : `<p>Hi ${safeName},</p>
<p>Thank you for your bespoke label request. After review, we are unable to proceed with this request as submitted. If you have questions or would like to adjust your artwork or specifications, please reply to this email and our team will help.</p>`

  const html = `<div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
${bodyIntro}
<p style="font-size: 13px; color: #555;">Reference ID: <code>${safeId}</code></p>
</div>`

  try {
    const r = await sendEmailViaResendServer({
      to: params.to.trim(),
      subject,
      html,
    })
    if (!r.ok) {
      return { ok: false, error: r.logMessage }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to send email'
    }
  }
}

export { isValidEmail }
