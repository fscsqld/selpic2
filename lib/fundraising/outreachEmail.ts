import { getPartnerFacingSiteUrl } from '@/lib/publicSiteUrl'
import type { FundraisingOutreachTarget } from '@/lib/fundraising/types'

/** Public apply URL with agent attribution (production host). */
export function buildFundraisingOutreachApplyUrl(targetId: string): string {
  const id = String(targetId || '').trim()
  const u = new URL(`${getPartnerFacingSiteUrl()}/fundraising`)
  u.searchParams.set('ref', 'ai_agent')
  u.searchParams.set('target_id', id)
  u.searchParams.set('utm_source', 'email')
  u.searchParams.set('utm_medium', 'outreach')
  u.searchParams.set('utm_campaign', 'fundraising_agent')
  return u.toString()
}

export function buildFundraisingOutreachEmail(opts: {
  target: FundraisingOutreachTarget
  applyUrl: string
}): { subject: string; html: string } {
  const org = opts.target.organizationName || 'your organisation'
  const contact = opts.target.contactName?.trim() || 'there'
  const subject = `Community fundraising partnership for ${org} — SELPIC`

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
    <p style="margin:0 0 12px;font-size:14px;color:#047857;font-weight:700;">SELPIC Community Fundraising</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Hello ${escapeHtml(contact)},</h1>
    <p style="margin:0 0 12px;font-size:15px;">
      We would love to invite <strong>${escapeHtml(org)}</strong> to join SELPIC&apos;s community fundraising partnership.
    </p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;color:#334155;">
      <li>Zero cost for your organisation — no forced sales quota</li>
      <li>Families enjoy ~5% community discount at checkout</li>
      <li>Your organisation receives ~15% Fundraising Cashback Grant (AU FY quarterly)</li>
      <li>SELPIC handles print, ship, and customer support</li>
    </ul>
    <p style="margin:0 0 20px;">
      <a href="${escapeHtml(opts.applyUrl)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">
        Apply to become a partner
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
      Or open this link:<br/>
      <a href="${escapeHtml(opts.applyUrl)}" style="color:#0369a1;word-break:break-all;">${escapeHtml(opts.applyUrl)}</a>
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
      If this is not relevant, you can ignore this email. Reply to opt out and we will not contact you again about this programme.
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
