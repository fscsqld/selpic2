/**
 * Shared signature, logo, and confidentiality appended to all transactional customer emails
 * (order confirmation, shipping, receipt, admin-sent documents, message replies, etc.).
 */

import { COMPANY_LOGO_URL, EMAIL_CONFIDENTIALITY_NOTICE } from '@/lib/companyLegal'

export const DEFAULT_PUBLIC_SITE_URL = 'https://selpic.com.au'
const WEBSITE_DISPLAY = 'selpic.com.au'

/** When dev uses localhost, mail clients cannot load `http://localhost/...` images — use this HTTPS base for email assets. */
const DEFAULT_EMAIL_ASSET_BASE = DEFAULT_PUBLIC_SITE_URL

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const u = new URL(origin)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]'
  } catch {
    return /localhost|127\.0\.0\.1/i.test(origin)
  }
}

/** Prefer https for remote hosts (many clients block or warn on http images). */
function normalizeBaseUrlForEmail(url: string): string {
  let u = url.trim().replace(/\/$/, '')
  if (u.startsWith('http://') && !isLocalhostOrigin(u)) {
    u = `https://${u.slice('http://'.length)}`
  }
  return u
}

/**
 * Public HTTPS base URL where `/logo.png` (and other public assets) are reachable on the **live** site.
 * Recipient mail servers cannot fetch `localhost` — never use dev origin for logo `src`.
 *
 * Priority:
 * 1. `NEXT_PUBLIC_EMAIL_ASSET_BASE_URL` — dedicated base for email images (no trailing slash)
 * 2. `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_URL`
 * 3. Browser: if origin is localhost → `DEFAULT_EMAIL_ASSET_BASE`
 * 4. Browser: else current origin (normalized to https when possible)
 * 5. Fallback: `DEFAULT_EMAIL_ASSET_BASE`
 */
export function getPublicEmailAssetBaseUrl(): string {
  const dedicated = (process.env.NEXT_PUBLIC_EMAIL_ASSET_BASE_URL || '').trim()
  if (dedicated) return normalizeBaseUrlForEmail(dedicated)

  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || '').trim()
  if (fromEnv) return normalizeBaseUrlForEmail(fromEnv)

  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '')
    if (isLocalhostOrigin(origin)) {
      return DEFAULT_EMAIL_ASSET_BASE
    }
    return normalizeBaseUrlForEmail(origin)
  }

  return DEFAULT_EMAIL_ASSET_BASE
}

/**
 * Absolute URL for the signature logo in HTML emails.
 * Set `NEXT_PUBLIC_EMAIL_LOGO_URL` to override (e.g. CDN or `https://www.selpic.com.au/images/logo.png`).
 */
export function getEmailLogoAbsoluteUrl(): string {
  const override = (process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || '').trim()
  if (override) return override.replace(/\/$/, '')

  const base = getPublicEmailAssetBaseUrl()
  const path = COMPANY_LOGO_URL.startsWith('/') ? COMPANY_LOGO_URL : `/${COMPANY_LOGO_URL}`
  return `${base.replace(/\/$/, '')}${path}`
}

/** @deprecated use getPublicEmailAssetBaseUrl — kept for any older imports */
export function getTransactionalEmailSiteOrigin(): string {
  return getPublicEmailAssetBaseUrl()
}

/** Display name under "Kind Regards," in all transactional emails */
export const TRANSACTIONAL_EMAIL_SIGNATURE_NAME = 'SELPIC TEAM'

export function buildTransactionalEmailSignaturePlainText(): string {
  return `Kind Regards,

${TRANSACTIONAL_EMAIL_SIGNATURE_NAME}
M: 0466 894 279
A: 7 Harvest St, Mansfield QLD 4122, Australia
E: info@selpic.com.au | W: ${WEBSITE_DISPLAY}`
}

/** Appends signature + confidentiality to plain-text bodies. */
export function appendTransactionalEmailBrandingPlainText(body: string): string {
  const trimmed = (body || '').trimEnd()
  const sig = buildTransactionalEmailSignaturePlainText()
  return `${trimmed}\n\n${sig}\n\n${EMAIL_CONFIDENTIALITY_NOTICE}`
}

/** HTML fragment: Kind Regards, name, contact lines (no logo image, to avoid broken/blocked images in mail clients). */
export function buildTransactionalEmailSignatureHtml(logoAbsoluteUrl: string): string {
  const siteUrl = DEFAULT_PUBLIC_SITE_URL
  // Table-based layout is more consistent across email clients (especially Outlook).
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #eee;border-collapse:collapse;">
    <tr>
      <td style="padding-top:20px;">
        <p style="margin:0 0 8px;padding:0;color:#111;line-height:1.4;">Kind Regards,</p>
        <p style="margin:0 0 16px;padding:0;font-weight:700;letter-spacing:0.02em;line-height:1.4;">${escHtml(TRANSACTIONAL_EMAIL_SIGNATURE_NAME)}</p>
        <p style="margin:8px 0 0;padding:0;font-size:14px;color:#333;line-height:1.4;">M: 0466 894 279</p>
        <p style="margin:4px 0;padding:0;font-size:14px;color:#333;line-height:1.4;">A: 7 Harvest St, Mansfield QLD 4122, Australia</p>
        <p style="margin:4px 0;padding:0;font-size:14px;color:#333;line-height:1.4;">E: <a href="mailto:info@selpic.com.au" style="color:#4f46e5;text-decoration:none;">info@selpic.com.au</a> | W: <a href="${siteUrl}" style="color:#4f46e5;text-decoration:none;">${WEBSITE_DISPLAY}</a></p>
      </td>
    </tr>
  </table>`
}

export function buildTransactionalEmailConfidentialityHtml(): string {
  return `<p style="font-size:11px;color:#9ca3af;margin-top:28px;line-height:1.45;">${escHtml(EMAIL_CONFIDENTIALITY_NOTICE)}</p>`
}

/** Appends shared footer to any HTML fragment (full documents or inner content). */
export function appendTransactionalEmailBrandingHtml(html: string): string {
  const absoluteLogo = getEmailLogoAbsoluteUrl()
  return `${html}${buildTransactionalEmailSignatureHtml(absoluteLogo)}${buildTransactionalEmailConfidentialityHtml()}`
}
