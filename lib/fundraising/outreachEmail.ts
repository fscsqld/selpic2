import { randomBytes } from 'crypto'
import { COMPANY_CONTACT, COMPANY_LEGAL, COMPANY_WEBSITE_URL } from '../companyLegal'
import { getPartnerFacingSiteUrl } from '../publicSiteUrl'
import type { FundraisingOutreachTarget } from './types'

/**
 * Locality line for cold outreach footers (no street number).
 * Full registered address remains in COMPANY_CONTACT for invoices, quotes, policies, transactional mail.
 * Restore street number here only when the user asks (e.g. after Google Business / Street View photos are updated).
 */
export function fundraisingOutreachSenderLocality(
  fullAddress: string = COMPANY_CONTACT.address
): string {
  const parts = String(fullAddress || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  // e.g. "7 Harvest St, Mansfield QLD 4122, Australia" → "Mansfield QLD 4122, Australia"
  if (parts.length >= 2 && /^\d/.test(parts[0])) {
    return parts.slice(1).join(', ')
  }
  return String(fullAddress || '').trim()
}

/** Template variables for fundraising B2B outreach (Spam Act–oriented). */
export type FundraisingOutreachTemplateVars = {
  ContactName: string
  Organisation: string
  ApplyUrl: string
  UnsubscribeUrl: string
}

export const FUNDRAISING_OUTREACH_TEMPLATE_DEFAULTS = {
  ContactName: 'Partner',
  Organisation: 'your organisation',
} as const

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

/** One-click / browser unsubscribe page (unique per target token). */
export function buildFundraisingOutreachUnsubscribeUrl(unsubscribeToken: string): string {
  const token = String(unsubscribeToken || '').trim()
  const u = new URL(`${getPartnerFacingSiteUrl()}/fundraising/outreach/unsubscribe`)
  u.searchParams.set('token', token)
  return u.toString()
}

/** API endpoint for List-Unsubscribe / one-click POST (RFC 8058). */
export function buildFundraisingOutreachUnsubscribeApiUrl(unsubscribeToken: string): string {
  const token = String(unsubscribeToken || '').trim()
  const u = new URL(`${getPartnerFacingSiteUrl()}/api/fundraising/outreach/unsubscribe`)
  u.searchParams.set('token', token)
  return u.toString()
}

export function newFundraisingOutreachUnsubscribeToken(): string {
  return randomBytes(24).toString('hex')
}

export function resolveFundraisingOutreachTemplateVars(opts: {
  target: Pick<FundraisingOutreachTarget, 'organizationName' | 'contactName'>
  applyUrl: string
  unsubscribeUrl: string
}): FundraisingOutreachTemplateVars {
  const contact = String(opts.target.contactName || '').trim()
  const org = String(opts.target.organizationName || '').trim()
  return {
    ContactName: contact || FUNDRAISING_OUTREACH_TEMPLATE_DEFAULTS.ContactName,
    Organisation: org || FUNDRAISING_OUTREACH_TEMPLATE_DEFAULTS.Organisation,
    ApplyUrl: opts.applyUrl,
    UnsubscribeUrl: opts.unsubscribeUrl,
  }
}

/** Replace {{VarName}} placeholders; unknown tokens left intact for debugging. */
export function renderFundraisingOutreachTemplate(
  template: string,
  vars: FundraisingOutreachTemplateVars
): string {
  return template.replace(/\{\{\s*(ContactName|Organisation|ApplyUrl|UnsubscribeUrl)\s*\}\}/g, (_, key: string) => {
    const k = key as keyof FundraisingOutreachTemplateVars
    return vars[k] ?? ''
  })
}

/**
 * Final outreach copy (compliance-oriented).
 * Not legal advice — structure aligns with AU Spam Act practices:
 * identify sender, accurate claims with conditions, functional unsubscribe.
 * Cold outreach omits “confidentiality” notices (those belong on transactional mail).
 */
export const FUNDRAISING_OUTREACH_SUBJECT_TEMPLATE =
  'Optional Community Fundraising Partnership | SELPIC x {{Organisation}}'

export const FUNDRAISING_OUTREACH_BODY_TEXT_TEMPLATE = `Hello {{ContactName}},

I am writing from SELPIC (${COMPANY_WEBSITE_URL.replace(/^https?:\/\//, '')}) about an optional community fundraising partnership that may be relevant to {{Organisation}}.

This is a business introduction email from ${COMPANY_LEGAL.companyName} (ABN ${COMPANY_LEGAL.abn}). There is no obligation to reply or apply.

About the programme (summary only — full terms are shown on the application page and may change):
• No partnership fee charged by SELPIC to join
• No forced sales quota for your organisation
• Families may receive a community discount at checkout (rate set in programme settings; currently around 5% OFF)
• Approved partner organisations may receive a Fundraising Cashback Grant on eligible community purchases (rate set in programme settings; currently around 15%), calculated and paid on an Australian financial-year quarterly basis after approval and subject to programme terms
• SELPIC provides print, shipping, and customer support for orders placed through SELPIC

If you would like to learn more or apply, please use this link:
{{ApplyUrl}}

Unsubscribe / do not contact again about this fundraising programme:
{{UnsubscribeUrl}}

If you are not the right contact, please use the unsubscribe link above, or reply with the single word "unsubscribe" and we will update our records within a reasonable time.

This message was sent by ${COMPANY_LEGAL.companyName}.
${fundraisingOutreachSenderLocality()}
${COMPANY_CONTACT.email} | ${COMPANY_WEBSITE_URL.replace(/^https?:\/\//, '')}
${COMPANY_CONTACT.phone}

Kind regards,
Selpic Team`

export function buildFundraisingOutreachEmail(opts: {
  target: Pick<FundraisingOutreachTarget, 'organizationName' | 'contactName' | 'id'>
  applyUrl: string
  unsubscribeUrl: string
  /** Defaults to unsubscribeUrl when omitted. Prefer API URL for List-Unsubscribe header. */
  listUnsubscribeUrl?: string
}): {
  subject: string
  html: string
  text: string
  vars: FundraisingOutreachTemplateVars
  headers: Record<string, string>
} {
  const vars = resolveFundraisingOutreachTemplateVars(opts)
  const subject = renderFundraisingOutreachTemplate(FUNDRAISING_OUTREACH_SUBJECT_TEMPLATE, vars)
  const text = renderFundraisingOutreachTemplate(FUNDRAISING_OUTREACH_BODY_TEXT_TEMPLATE, vars)
  const html = buildFundraisingOutreachHtml(vars)
  const listUnsub = opts.listUnsubscribeUrl || opts.unsubscribeUrl

  return {
    subject,
    html,
    text,
    vars,
    headers: {
      'List-Unsubscribe': `<${listUnsub}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

function buildFundraisingOutreachHtml(vars: FundraisingOutreachTemplateVars): string {
  const contact = escapeHtml(vars.ContactName)
  const org = escapeHtml(vars.Organisation)
  const applyUrl = escapeHtml(vars.ApplyUrl)
  const unsubUrl = escapeHtml(vars.UnsubscribeUrl)
  const siteHost = escapeHtml(COMPANY_WEBSITE_URL.replace(/^https?:\/\//, ''))
  const company = escapeHtml(COMPANY_LEGAL.companyName)
  const abn = escapeHtml(COMPANY_LEGAL.abn)
  const address = escapeHtml(fundraisingOutreachSenderLocality())
  const email = escapeHtml(COMPANY_CONTACT.email)
  const phone = escapeHtml(COMPANY_CONTACT.phone)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SELPIC community fundraising</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 12px;font-size:14px;color:#047857;font-weight:700;">SELPIC Community Fundraising</p>
              <p style="margin:0 0 16px;font-size:20px;font-weight:700;line-height:1.35;color:#0f172a;">Hello ${contact},</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">
                I am writing from SELPIC (${siteHost}) about an optional community fundraising partnership that may be relevant to <strong>${org}</strong>.
              </p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">
                This is a business introduction email from ${company} (ABN ${abn}). There is no obligation to reply or apply.
              </p>
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">About the programme</p>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.45;">
                Summary only — full terms are shown on the application page and may change.
              </p>
              <ul style="margin:0 0 18px;padding-left:20px;font-size:15px;line-height:1.55;color:#334155;">
                <li>No partnership fee charged by SELPIC to join</li>
                <li>No forced sales quota for your organisation</li>
                <li>Families may receive a community discount at checkout (rate set in programme settings; currently around 5% OFF)</li>
                <li>Approved partner organisations may receive a Fundraising Cashback Grant on eligible community purchases (rate set in programme settings; currently around 15%), calculated and paid on an Australian financial-year quarterly basis after approval and subject to programme terms</li>
                <li>SELPIC provides print, shipping, and customer support for orders placed through SELPIC</li>
              </ul>
              <p style="margin:0 0 18px;">
                <a href="${applyUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">
                  Learn more / apply
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.45;word-break:break-all;">
                Or open this link:<br/>
                <a href="${applyUrl}" style="color:#0369a1;">${applyUrl}</a>
              </p>
              <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.5;color:#475569;">
                <strong>Unsubscribe</strong> / do not contact again about this fundraising programme:<br/>
                <a href="${unsubUrl}" style="color:#0369a1;word-break:break-all;">${unsubUrl}</a>
              </p>
              <p style="margin:12px 0 0;font-size:12px;line-height:1.45;color:#94a3b8;">
                If you are not the right contact, please use the unsubscribe link, or reply with the single word &quot;unsubscribe&quot; and we will update our records within a reasonable time.
              </p>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#64748b;">
                This message was sent by ${company}.<br/>
                ${address}<br/>
                ${email} | ${siteHost}<br/>
                ${phone}
              </p>
              <p style="margin:16px 0 0;font-size:14px;color:#0f172a;line-height:1.4;">
                Kind regards,<br/>
                <strong>Selpic Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** True if subject/body looks like an unsubscribe reply (AU Spam Act–style request). */
export function messageLooksLikeUnsubscribeRequest(subject: string, text: string): boolean {
  const blob = `${subject}\n${text}`.toLowerCase()
  if (/\bunsubscribe\b/.test(blob)) return true
  if (/\bopt[-\s]?out\b/.test(blob)) return true
  if (/\bremove me\b/.test(blob)) return true
  return false
}
