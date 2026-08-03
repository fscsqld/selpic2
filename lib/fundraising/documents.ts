import { COMPANY_LEGAL, COMPANY_CONTACT } from '@/lib/companyLegal'
import {
  FUNDRAISING_DOCUMENT_LABELS,
  FundraisingDocumentType,
  FundraisingPartner,
  FundraisingSettings,
} from '@/lib/fundraising/types'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildFundraisingDocumentHtml(input: {
  type: FundraisingDocumentType
  partner?: FundraisingPartner | null
  settings: FundraisingSettings
  period?: string
  extra?: Record<string, string | number | undefined>
}): string {
  const company = COMPANY_LEGAL.companyName
  const email = COMPANY_CONTACT.email
  const partner = input.partner
  const org = partner?.organizationName || String(input.extra?.organizationName || 'Partner Organisation')
  const contact = partner?.contactName || String(input.extra?.contactName || 'Partner Contact')
  const code = partner?.linkedPromoCode || String(input.extra?.promoCode || 'YOUR-CODE')
  const donation = Number(input.extra?.donationRate ?? input.settings.donationRate)
  const parentOff = Number(input.extra?.parentDisplayRate ?? input.settings.parentDisplayRate)
  const period = input.period || String(input.extra?.period || '')
  const title = FUNDRAISING_DOCUMENT_LABELS[input.type]

  const bodyByType: Record<FundraisingDocumentType, string> = {
    D1: `
      <p>Dear ${esc(contact)},</p>
      <p>Thank you for applying to the SELPIC Fundraising Program on behalf of <strong>${esc(org)}</strong>.</p>
      <p>We have received your application${input.extra?.sampleKitRequested === 'yes' ? ' and your request for a free Educator Sample Kit' : ''}.</p>
      <p>Our team will review your details and email your unique fundraising code after approval.</p>
    `,
    D2: `
      <p>Dear ${esc(contact)},</p>
      <p>Welcome to the SELPIC Fundraising Program. <strong>${esc(org)}</strong> is now enrolled.</p>
      <p>Share your code with families in newsletters and apps. Supporters receive ${parentOff}% OFF at checkout, and your organisation earns ${donation}% cashback on Net Sales.</p>
      ${
        input.extra?.lookupUrl
          ? `<p><strong>Your private performance dashboard:</strong><br/><a href="${esc(String(input.extra.lookupUrl))}">${esc(String(input.extra.lookupUrl))}</a></p>
      <p style="font-size:12px;color:#555;">For security, you will receive a one-time verification code by email when you open this link.</p>`
          : ''
      }
    `,
    D3: `
      <p><strong>Terms Summary — SELPIC Fundraising</strong></p>
      <ul>
        <li>Parent discount: applied via existing Promo Code (display default ${parentOff}%).</li>
        <li>Organisation cashback: ${donation}% of <em>Net Sales</em>.</li>
        <li>Net Sales = sum of order product subtotals for orders using your code, excluding cancelled/refunded orders and excluding shipping/payment fees.</li>
        <li>Settlements are calculated monthly and paid after SELPIC completes bank transfer.</li>
      </ul>
    `,
    D4: `
      <p>Dear ${esc(contact)},</p>
      <p>Your unique fundraising code for <strong>${esc(org)}</strong> is:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:0.05em;">${esc(code)}</p>
      <p>Supporters enter this code at checkout to receive ${parentOff}% OFF and support your fundraising.</p>
      ${
        input.extra?.lookupUrl
          ? `<p>Track results anytime: <a href="${esc(String(input.extra.lookupUrl))}">Open your fundraising dashboard</a></p>`
          : ''
      }
    `,
    D5: `
      <p>Dear ${esc(contact)},</p>
      <p>Your Educator Sample Kit is being prepared for dispatch to:</p>
      <p>${esc(partner?.postalAddress || String(input.extra?.postalAddress || 'Address on file'))}</p>
    `,
    D6: `
      <p><strong>Share copy for ${esc(org)}</strong></p>
      <p>Use code <strong>${esc(code)}</strong> at selpic.com.au checkout for ${parentOff}% OFF on custom name labels — and help us raise funds for our community.</p>
    `,
    D7: `
      <p>Mid-period snapshot for ${esc(org)}${period ? ` (${esc(period)})` : ''}.</p>
      <p>Net Sales to date: $${esc(String(input.extra?.netSales ?? '0'))}</p>
      <p>Estimated commission (${donation}%): $${esc(String(input.extra?.commission ?? '0'))}</p>
    `,
    D8: `
      <p>Dear ${esc(contact)},</p>
      <p>This notice confirms a fundraising rate change for <strong>${esc(org)}</strong>.</p>
      <p>Previous donation rate: ${esc(String(input.extra?.oldDonationRate ?? ''))}%</p>
      <p>New donation rate: ${donation}% effective from ${esc(String(input.extra?.effectiveFrom || ''))}.</p>
      <p>Past paid settlements are not recalculated.</p>
    `,
    D9: `
      <p>Monthly Sales &amp; Commission Statement</p>
      <p>Organisation: ${esc(org)}</p>
      <p>Period: ${esc(period)}</p>
      <p>Promo code: ${esc(code)}</p>
      <p>Orders: ${esc(String(input.extra?.orderCount ?? 0))}</p>
      <p>Net Sales: $${esc(String(input.extra?.netSales ?? 0))}</p>
      <p>Rate applied: ${donation}%</p>
      <p><strong>Commission due: $${esc(String(input.extra?.commission ?? 0))}</strong></p>
      <p style="font-size:12px;color:#555;">Order identifiers in the admin report are available on request. Customer personal details are omitted from this statement.</p>
    `,
    D10: `
      <p>Remittance Advice / Payment Confirmation</p>
      <p>Organisation: ${esc(org)}</p>
      <p>Period: ${esc(period)}</p>
      <p>Amount paid: $${esc(String(input.extra?.commission ?? 0))}</p>
      <p>Payment reference: ${esc(String(input.extra?.paymentReference || ''))}</p>
      <p>Paid at: ${esc(String(input.extra?.paidAt || ''))}</p>
      <p>This confirms SELPIC has completed the bank transfer for the period above.</p>
    `,
    D11: `
      <p>Tax Invoice / RCTI placeholder for ${esc(org)}.</p>
      <p>Enable this template only after accounting confirmation of GST / non-profit treatment.</p>
    `,
    D12: `
      <p>Dear ${esc(contact)},</p>
      <p>This notice confirms that fundraising participation for <strong>${esc(org)}</strong> has been suspended or terminated.</p>
      <p>Code <strong>${esc(code)}</strong> will be deactivated as advised by SELPIC admin.</p>
    `,
    D13: `
      <p>Final Settlement Statement for ${esc(org)}</p>
      <p>Period: ${esc(period)}</p>
      <p>Final commission: $${esc(String(input.extra?.commission ?? 0))}</p>
    `,
    D14: `
      <p><strong>Internal payout checklist</strong> — ${esc(period)} / ${esc(org)}</p>
      <ol>
        <li>Generate settlement (Ready)</li>
        <li>Verify Net Sales and rate</li>
        <li>Copy bank details and transfer</li>
        <li>Mark as Paid</li>
        <li>Send D9 + D10</li>
      </ol>
    `,
    D15: `
      <p>Settlement Audit Pack — ${esc(org)} / ${esc(period)}</p>
      <p>Includes settlement totals, payment reference, and document references for audit.</p>
      <p>Commission: $${esc(String(input.extra?.commission ?? 0))} · Ref: ${esc(String(input.extra?.paymentReference || ''))}</p>
    `,
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${esc(title)}</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5;max-width:720px;margin:0 auto;padding:24px;">
  <header style="border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px;">
    <div style="font-size:20px;font-weight:700;">${esc(company)}</div>
    <div style="font-size:14px;color:#555;">Fundraising Document · ${esc(input.type)} · ${esc(title)}</div>
  </header>
  ${bodyByType[input.type]}
  <footer style="margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:12px;color:#666;">
    <p>${esc(company)} · ${esc(email)}</p>
    <p>Net Sales definition version: ${esc(input.settings.netSalesDefinitionVersion)}</p>
  </footer>
</body>
</html>`
}
