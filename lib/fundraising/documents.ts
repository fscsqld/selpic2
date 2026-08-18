import { COMPANY_LEGAL, COMPANY_CONTACT } from '@/lib/companyLegal'
import { digitsOnlyAbn, formatAbnDisplay } from '@/lib/fundraising/abn'
import { LOOKUP_SESSION_HOURS } from '@/lib/fundraising/lookupConstants'
import {
  canonicalizePartnerFacingLookupUrl,
  healFundraisingDocumentHtml,
} from '@/lib/fundraising/partnerFacingSite'
import { maskedAccountValue, maskedBsbValue } from '@/lib/fundraising/mask'
import {
  FUNDRAISING_DOCUMENT_LABELS,
  TOTAL_COMMUNITY_SUPPORT_DEFINITION_VERSION,
  FundraisingDocumentType,
  FundraisingPartner,
  FundraisingSettings,
} from '@/lib/fundraising/types'
import {
  displayFundraisingPeriod,
  FUNDRAISING_GRANT_PAYOUT_POLICY,
  payoutDueDisplayForPeriod,
} from '@/lib/fundraising/auFinancialQuarter'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Title-case personal names for formal email greetings (jimmy → Jimmy). */
export function formatPartnerDisplayName(name: string | undefined | null, fallback = 'Partner'): string {
  const raw = String(name || '').trim()
  if (!raw) return fallback
  return raw
    .split(/\s+/)
    .map((part) => {
      if (!part) return part
      // Keep existing camel / mixed tokens lightly: capitalize first letter only
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

/** Resolve ABN from flat partner.abn (canonical) or legacy nested bankDetails.abn. */
export function resolvePartnerAbn(
  partner?: FundraisingPartner | null,
  extra?: Record<string, string | number | undefined>
): string {
  const nested =
    partner && typeof partner === 'object'
      ? String(
          (partner as FundraisingPartner & { bankDetails?: { abn?: string } }).bankDetails?.abn || ''
        )
      : ''
  const raw =
    String(partner?.abn || '').trim() ||
    nested.trim() ||
    (extra?.abn !== undefined ? String(extra.abn).trim() : '') ||
    ''
  return raw
}

export function formatGrantAccountUpdatedAt(iso?: string): string {
  const raw = String(iso || '').trim()
  if (!raw) return '—'
  try {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return raw
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)
    const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} AEST`
  } catch {
    return raw
  }
}

/** Shared welcome-email guide: Lookup access, OTP, Official Grant Account. */
export function partnerDashboardGuideHtml(lookupUrl?: string): string {
  const hours = LOOKUP_SESSION_HOURS
  const button = lookupUrl
    ? `<p style="margin:16px 0 8px;">
        <a href="${esc(lookupUrl)}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
          Open Partner Lookup Dashboard
        </a>
      </p>
      <p style="font-size:12px;color:#555;word-break:break-all;">Or copy this link:<br/>${esc(lookupUrl)}</p>`
    : `<p style="font-size:13px;color:#555;">Use the private Lookup link from your enrolment email to open the dashboard.</p>`

  return `
    <div style="margin-top:28px;padding:16px 18px;border:1px solid #d1d5db;border-radius:10px;background:#f8fafc;">
      <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;">How to Access &amp; Use Your Partner Dashboard</p>
      <ol style="margin:0;padding-left:18px;color:#334155;font-size:14px;line-height:1.55;">
        <li style="margin-bottom:10px;">
          <strong>Access your dashboard</strong><br/>
          Click the button below to open your Partner Lookup Dashboard. For your security, a 6-digit one-time passcode (OTP) will be emailed when you request access.
        </li>
        <li style="margin-bottom:10px;">
          <strong>Official Grant Account (managed by SELPIC)</strong><br/>
          SELPIC registers and updates your organisation&apos;s ABN, BSB, and Account Number after verification. In Lookup you can view masked details and request a change — you cannot edit the account directly. This keeps Fundraising Cashback Grant transfers secure and auditable.
        </li>
        <li style="margin-bottom:10px;">
          <strong>Track Community Impact</strong><br/>
          View Total Community Support, your Partner Community Code, and quarterly statements (D9/D10) anytime.
        </li>
      </ol>
      ${button}
      <p style="margin:12px 0 0;font-size:12px;color:#64748b;">
        Tip: Bookmark this access link for future use. Your active session remains valid for ${hours} hour${hours > 1 ? 's' : ''} on your current browser.
      </p>
    </div>`
}

/**
 * Australian law-aligned notice for partnership end / non-renewal emails.
 *
 * Legal framing (general information for SELPIC policy copy — not advice to the partner):
 * - Privacy Act 1988 (Cth) APP 11.2: when personal information is no longer needed for a
 *   permitted purpose, take reasonable steps to destroy or de-identify it — unless an
 *   Australian law or court/tribunal order requires retention (OAIC APP 11 guidance).
 * - ATO business record-keeping: generally keep tax/business records for 5 years from
 *   preparation/obtaining or completion of the related transaction (whichever is later).
 * - Companies may also need longer retention for financial records under Corporations Act
 *   requirements (commonly discussed as 7 years). Grant remittances, bank transfer evidence,
 *   and D9/D10 statements are treated as records SELPIC must retain for those purposes.
 *
 * Therefore emails must NOT claim “all organisation records are automatically deleted”.
 * Customer retail accounts (register/login to pay) are independent of the organisation partnership.
 */
export function partnershipEndDataHandlingHtml(companyName: string, contactEmail: string): string {
  return `
      <div style="margin:20px 0;padding:14px 16px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;">What happens to your partnership information</p>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#334155;">
          When your Community Fundraising partnership ends (including suspension, termination, or non-renewal),
          <strong>${esc(companyName)}</strong> will:
        </p>
        <ul style="margin:0 0 12px;padding-left:18px;font-size:13px;line-height:1.55;color:#334155;">
          <li style="margin-bottom:8px;">
            <strong>Close operational access</strong> — deactivate your Partner Community Code for new community fundraising orders,
            end Partner Lookup portal access for ongoing partnership management, and stop using your contact and bank details
            for day-to-day fundraising operations.
          </li>
          <li style="margin-bottom:8px;">
            <strong>Destroy or de-identify personal information that is no longer needed</strong> — consistent with
            Australian Privacy Principle <strong>APP 11.2</strong> under the <em>Privacy Act 1988</em> (Cth),
            ${esc(companyName)} will take reasonable steps to destroy or de-identify personal information that is no longer
            required for a purpose permitted under the Australian Privacy Principles
            (see OAIC guidance on APP 11).
          </li>
          <li style="margin-bottom:8px;">
            <strong>Retain records where Australian law requires</strong> — APP 11.2 does <em>not</em> require destruction
            where an Australian law or a court/tribunal order requires retention. In particular,
            ${esc(companyName)} retains grant payment, remittance, and related tax/business records for the periods
            required by Australian tax law (ATO guidance generally requires most business records to be kept for
            <strong>at least 5 years</strong>) and, where applicable, longer company record-keeping obligations
            (often discussed as up to <strong>7 years</strong> for company financial records).
            This typically includes Official Grant Account payment evidence and quarterly statements (for example D9/D10)
            needed for audit, dispute resolution, and compliance.
          </li>
        </ul>
        <div style="margin:0 0 10px;padding:12px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;">Family / customer accounts are separate</p>
          <p style="margin:0;font-size:12px;line-height:1.55;color:#475569;">
            Supporters buy on selpic.com.au as ordinary SELPIC customers: they <strong>register or log in</strong> to place and pay for orders.
            Your Partner Community Code only applies a community discount and attributes Total Community Support to your organisation.
            Community Fundraising is a relationship between ${esc(companyName)} and <em>your organisation</em> — it does not create, own, or control a customer&apos;s personal login.
            Ending this partnership does <strong>not</strong> close, suspend, or delete family customer accounts.
            A customer who wants to leave SELPIC closes their own account themselves, the same way as any other retail customer.
          </p>
        </div>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
          Privacy questions or access/correction requests: <a href="mailto:${esc(contactEmail)}" style="color:#4f46e5;">${esc(contactEmail)}</a>.
          This section describes ${esc(companyName)}&apos;s handling practices aligned with the Privacy Act and tax record-keeping obligations;
          it is general information and not legal advice to your organisation.
        </p>
      </div>`
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
  const org = partner?.organizationName || String(input.extra?.organizationName || 'Community Partner')
  const contact = formatPartnerDisplayName(
    partner?.contactName || String(input.extra?.contactName || ''),
    'Partner'
  )
  const abnRaw = resolvePartnerAbn(partner, input.extra)
  const abnDigits = digitsOnlyAbn(abnRaw)
  const abnDisplay = abnDigits.length === 11 ? formatAbnDisplay(abnDigits) : abnRaw
  const partnerAbnHtml =
    abnDigits.length === 11
      ? `<p style="margin:0;">Partner ABN: ${esc(abnDisplay)}</p>`
      : `<p style="margin:0;">Partner ABN: Not Provided</p>
            <p style="margin:4px 0 0;font-size:12px;color:#b45309;font-weight:600;">Not Provided — ABN Withholding May Apply</p>`
  const payeeAccountName = partner?.accountName || String(input.extra?.accountName || '')
  const payeeBsb = partner?.bsb || String(input.extra?.bsb || '')
  const payeeAccount = partner?.accountNumber || String(input.extra?.accountNumber || '')
  const partnerId = partner?.id || String(input.extra?.partnerId || '')
  const issuerAbn = COMPANY_LEGAL.abn
  const issuerAddress = 'QLD, Australia'
  const grantAmount = Number(input.extra?.commission ?? 0)
  const netSalesAmt = Number(input.extra?.netSales ?? 0)
  const orderCount = Number(input.extra?.orderCount ?? 0)
  const paymentRef = String(input.extra?.paymentReference || '')
  const paidAt = String(input.extra?.paidAt || '')
  const code = partner?.linkedPromoCode || String(input.extra?.promoCode || 'YOUR-CODE')
  const donation = Number(input.extra?.donationRate ?? input.settings.donationRate)
  const parentOff = Number(input.extra?.parentDisplayRate ?? input.settings.parentDisplayRate)
  const period = input.period || String(input.extra?.period || '')
  const title = FUNDRAISING_DOCUMENT_LABELS[input.type]
  const lookupUrl = canonicalizePartnerFacingLookupUrl(
    input.extra?.lookupUrl ? String(input.extra.lookupUrl) : undefined,
    partner?.lookupToken
  )
  const dashboardGuide = partnerDashboardGuideHtml(lookupUrl)
  const updatedAtDisplay = formatGrantAccountUpdatedAt(
    String(input.extra?.updatedAt || partner?.updatedAt || '')
  )
  const partnersUrl = String(input.extra?.partnersUrl || '')
  const payoutUrl = String(input.extra?.payoutUrl || '')

  const issuerRecipientBlock = `
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px;">
        <tr>
          <td style="width:50%;vertical-align:top;padding:12px 14px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;">
            <p style="margin:0 0 8px;font-weight:700;">Issuer</p>
            <p style="margin:0;">${esc(company)}</p>
            <p style="margin:0;">ABN: ${esc(issuerAbn)}</p>
            <p style="margin:0;">${esc(email)} | ${esc(issuerAddress)}</p>
          </td>
          <td style="width:12px;"></td>
          <td style="width:50%;vertical-align:top;padding:12px 14px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;">
            <p style="margin:0 0 8px;font-weight:700;">Recipient (Partner Organisation)</p>
            <p style="margin:0;">${esc(payeeAccountName || org)}</p>
            <p style="margin:0;">Organisation: ${esc(org)}</p>
            <p style="margin:0;">Partner ID: ${esc(partnerId || '—')}</p>
            ${partnerAbnHtml}
            <p style="margin:0;">Partner Community Code: ${esc(code)}</p>
          </td>
        </tr>
      </table>`

  const grantCalcTable = `
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
        <thead>
          <tr style="background:#0f172a;color:#fff;">
            <th style="text-align:left;padding:10px 12px;">Description</th>
            <th style="text-align:right;padding:10px 12px;">Amount / Value</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;">Total Orders Count</td>
            <td style="padding:10px 12px;text-align:right;">${esc(String(orderCount))}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;">Total Community Support ($ AUD)<br/><span style="font-size:12px;color:#64748b;">Product totals after family community discount; excluding shipping and refunds</span></td>
            <td style="padding:10px 12px;text-align:right;">$${esc(netSalesAmt.toFixed(2))}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;">Grant Rate</td>
            <td style="padding:10px 12px;text-align:right;">${esc(String(donation))}%</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;"><strong>Total Cashback Grant Amount ($ AUD)</strong></td>
            <td style="padding:10px 12px;text-align:right;"><strong>$${esc(grantAmount.toFixed(2))}</strong></td>
          </tr>
          <tr>
            <td style="padding:10px 12px;">GST Component</td>
            <td style="padding:10px 12px;text-align:right;">$0.00 AUD (Grant / Non-Taxable Supply)</td>
          </tr>
        </tbody>
      </table>`

  /**
   * D9 / D10 / D13: show ABN (public registry identifier) + mask BSB/account
   * (last 4 account digits only). Never print full BSB/account on partner-facing statements.
   */
  const paymentDestinationBlock = `
      <div style="margin:0 0 16px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
        <p style="margin:0 0 8px;font-weight:700;">Payment Destination (Official Grant Account)</p>
        <p style="margin:0;">Account Name: ${esc(payeeAccountName || '—')}</p>
        <p style="margin:0;">Partner ABN: ${esc(abnDigits.length === 11 ? abnDisplay : abnRaw || 'Not Provided')}</p>
        <p style="margin:0;">BSB ${esc(payeeBsb ? maskedBsbValue(payeeBsb) : '***-***')} / Acc ${esc(payeeAccount ? maskedAccountValue(payeeAccount) : '****')}</p>
        ${
          paidAt || paymentRef
            ? `<p style="margin:8px 0 0;">Payment Date: ${esc(paidAt || '—')}</p>
        <p style="margin:0;">Payment Reference: ${esc(paymentRef || '—')}</p>`
            : `<p style="margin:8px 0 0;font-size:12px;color:#64748b;">Payment date and reference are completed on remittance (D10) after transfer.</p>`
        }
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">BSB and account number are masked for security (last four account digits shown). Full bank details are held by SELPIC for payout only.</p>
      </div>`

  const auditRetainNote = `
      <p style="margin:20px 0 0;font-size:12px;color:#555;line-height:1.5;">
        This statement is an official record of Community Cashback Grant transferred by ${esc(company)}.
        Please retain this document for your organisation&apos;s financial audit and record-keeping.
        ${esc(company)} also retains grant remittance and related tax/business records for the periods required under
        Australian law (generally at least 5 years; longer where company record-keeping applies).
      </p>`

  const bodyByType: Record<FundraisingDocumentType, string> = {
    D1: `
      <p>Dear ${esc(contact)},</p>
      <p>Thank you for applying to the SELPIC Community Fundraising Partnership on behalf of <strong>${esc(org)}</strong>.</p>
      <p>We have received your application${
        input.extra?.sampleKitRequested === 'yes'
          ? ` and your request for a personalised name-sticker sample printed with “${esc(String(input.extra?.sampleKitPrintName || partner?.sampleKitPrintName || 'the name you provided'))}”. We will post it to the address on this application after review — it is not a generic kit, because every SELPIC name label is custom-printed`
          : ''
      }.</p>
      <p>Our team will review your details and email your Partner Community Code after approval.</p>
      <p style="font-size:13px;color:#555;">SELPIC puts trust and transparency with our community partners first.</p>
    `,
    D2: `
      <p>Dear ${esc(contact)},</p>
      <p>Thank you for partnering with SELPIC. Together for Our School &amp; Community.</p>
      <p><strong>${esc(org)}</strong> is now enrolled in our Community Fundraising Partnership.</p>
      <p>Share your Partner Community Code with families. Supporters receive ${parentOff}% OFF at checkout, and your organisation earns a <strong>${donation}% Fundraising Cashback Grant</strong> on Total Community Support.</p>
      <p style="font-size:13px;line-height:1.55;color:#334155;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
        <strong>Important — customer accounts are separate:</strong> Families register or log in to their own SELPIC customer account to pay for orders.
        Your code only applies the community discount. This fundraising partnership is between SELPIC and your organisation;
        it does not control a customer&apos;s personal login. If the partnership later ends, family accounts stay under each customer&apos;s own control
        (including any decision to close their account themselves).
      </p>
      ${dashboardGuide}
    `,
    D3: `
      <p><strong>Partnership Terms Summary — SELPIC Community Fundraising</strong></p>
      <ul>
        <li>Family benefit: applied via your Partner Community Code (display default ${parentOff}% OFF).</li>
        <li>Organisation benefit: ${donation}% Fundraising Cashback Grant on <em>Total Community Support</em>.</li>
        <li>Total Community Support = sum of order product totals <em>after</em> the family community discount (e.g. 5% OFF), for orders using your code — excluding cancelled/refunded orders and excluding shipping/payment fees. The Fundraising Cashback Grant is then applied to that discounted product total.</li>
        <li>Customer checkout: supporters must register or log in as ordinary SELPIC customers to place and pay for orders. The Partner Community Code does not create or administer their personal accounts.</li>
        <li>Partnership term: participation runs in <strong>12-month terms</strong> from approval. Near the end of each term, SELPIC emails a renewal notice. If you wish to continue and confirm renewal, your term is extended for another 12 months. You may also request suspension via your Lookup portal or by contacting SELPIC.</li>
        <li>End of partnership (suspension, termination, or non-renewal): organisational operational access and Partner Community Code use for new fundraising orders will close. Organisation personal information that is no longer needed is destroyed or de-identified under Australian Privacy Principle APP 11.2 (<em>Privacy Act 1988</em>), except where Australian law requires retention — including tax/business records generally kept for at least 5 years (ATO) and, where applicable, longer company financial record-keeping (commonly up to 7 years). Ending the partnership does <em>not</em> close family customer logins; customers manage their own accounts (including voluntary account closure) like any other SELPIC shopper.</li>
        <li>Fundraising Cashback Grants are calculated once per Australian financial-year quarter (Q1 Jul–Sep, Q2 Oct–Dec, Q3 Jan–Mar, Q4 Apr–Jun). Total Community Support for a quarter includes Partner Community Code orders with <strong>confirmed payment</strong> in that quarter (Australia/Sydney). Bank transfers placed before quarter end and confirmed by <strong>12:00 noon Sydney the next day</strong> still count in that quarter; pending bank deposits are excluded until confirmed. After each quarter ends, SELPIC waits <strong>7 calendar days</strong> so cancellations can settle, then locks the final grant amount. Bank transfer is targeted by the 15th of the month after the quarter ends (or the next business day if that date falls on a weekend). There is no minimum payout amount. Cancellations after figures are locked are adjusted in a later period (they do not reopen a paid quarter). New orders after quarter end count toward the next quarter immediately. These settlement rules apply to the organisation partnership only — they do not change how families check out or pay as ordinary SELPIC customers.</li>
      </ul>
      <p style="font-size:13px;color:#555;">SELPIC will register your Official Grant Account (ABN, BSB, and Account Number) after verification. In your Partner Lookup dashboard you can view masked details and request updates — reply to your partnership email or use Request update if anything needs changing.</p>
    `,
    D4: `
      <p>Dear ${esc(contact)},</p>
      <p>Your Partner Community Code for <strong>${esc(org)}</strong> is:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:0.05em;">${esc(code)}</p>
      <p>Supporters enter this code at checkout to receive ${parentOff}% OFF and help raise your Fundraising Cashback Grant. They still register or log in to their own SELPIC customer account to complete payment — the code is a discount only, not a shared login.</p>
      ${dashboardGuide}
    `,
    D5: `
      <p>Dear ${esc(contact)},</p>
      <p>A personalised name-sticker sample is being prepared for dispatch (not a generic blank kit).</p>
      <p>Name to print: <strong>${esc(String(input.extra?.sampleKitPrintName || partner?.sampleKitPrintName || 'Not provided — confirm the name with the organisation before printing'))}</strong></p>
      <p>Ship to: ${esc(partner?.postalAddress || String(input.extra?.postalAddress || 'Address on file'))}</p>
      <p>Contact: ${esc(contact)}${partner?.phone ? ` · ${esc(partner.phone)}` : ''}</p>
    `,
    D6: `
      <p><strong>Share copy for ${esc(org)}</strong></p>
      <p>Use code <strong>${esc(code)}</strong> at selpic.com.au checkout for ${parentOff}% OFF on custom name labels — and help us raise funds for our school and community. Sign in or create your own SELPIC customer account to place your order (the code is only for the community discount).</p>
    `,
    D7: `
      <p>Mid-period Community Impact snapshot for ${esc(org)}${period ? ` (${esc(period)})` : ''}.</p>
      <p>Total Community Support to date: $${esc(String(input.extra?.netSales ?? '0'))}</p>
      <p>Estimated Fundraising Cashback Grant (${donation}%): $${esc(String(input.extra?.commission ?? '0'))}</p>
    `,
    D8: `
      <p>Dear ${esc(contact)},</p>
      <p>This notice confirms a Fundraising Cashback Grant rate change for <strong>${esc(org)}</strong>.</p>
      <p>Previous grant rate: ${esc(String(input.extra?.oldDonationRate ?? ''))}%</p>
      <p>New grant rate: ${donation}% effective from ${esc(String(input.extra?.effectiveFrom || ''))}.</p>
      <p>Past completed grant transfers are not recalculated.</p>
    `,
    D18: `
      <p>Dear ${esc(contact)},</p>
      <p>This notice confirms that the <strong>Partner Community Code</strong> for <strong>${esc(org)}</strong> has been updated.</p>
      <p style="margin:16px 0;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
        <span style="display:block;font-size:12px;color:#64748b;margin-bottom:4px;">Previous code</span>
        <strong style="font-family:ui-monospace,monospace;font-size:16px;">${esc(String(input.extra?.oldPromoCode || '—'))}</strong><br/>
        <span style="display:block;font-size:12px;color:#64748b;margin:12px 0 4px;">New Partner Community Code</span>
        <strong style="font-family:ui-monospace,monospace;font-size:20px;letter-spacing:0.04em;">${esc(code)}</strong>
      </p>
      <p>Please share the <strong>new</strong> code with families. Orders placed with the previous code will not count toward your Total Community Support going forward.</p>
      <p>Supporters using the new code still receive ${parentOff}% OFF at checkout, and your organisation earns a ${donation}% Fundraising Cashback Grant on Total Community Support (product totals after the family community discount).</p>
      ${dashboardGuide}
      <p style="font-size:13px;color:#555;">You can always view the current code in your Partner Lookup portal under Partner Community Code.</p>
    `,
    D19: `
      <p>Dear ${esc(contact)},</p>
      <p>Your SELPIC Community Fundraising partnership for <strong>${esc(org)}</strong> is approaching the end of its current <strong>12-month term</strong>.</p>
      <p style="margin:16px 0;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fffbeb;">
        <span style="display:block;font-size:12px;color:#92400e;margin-bottom:4px;">Current term ends</span>
        <strong style="font-size:18px;">${esc(String(input.extra?.termEndsAtDisplay || input.extra?.termEndsAt || '—'))}</strong>
      </p>
      <p>To <strong>continue for another 12 months</strong>, please open your Partner Lookup portal and confirm renewal before the term ends (or reply to this email). Early confirmation helps families keep using your Partner Community Code without interruption.</p>
      <p>If you prefer not to renew, you can record that preference in Lookup or contact us. We will acknowledge your choice by email and explain how organisation partnership information is handled under Australian privacy and record-keeping laws (operational information that is no longer needed is destroyed or de-identified; grant and tax records are retained for the periods the law requires). Family customer accounts remain separate.</p>
      ${dashboardGuide}
      <p style="font-size:13px;color:#555;">Partner Community Code: <strong>${esc(code)}</strong> · Families still receive ${parentOff}% OFF while your partnership remains active.</p>
    `,
    D20: `
      <p>Dear ${esc(contact)},</p>
      <p>Thank you — we have received your renewal confirmation for <strong>${esc(org)}</strong>.</p>
      <p style="margin:16px 0;padding:12px 14px;border:1px solid #a7f3d0;border-radius:8px;background:#ecfdf5;">
        <strong style="color:#047857;">Partnership renewed</strong><br/>
        Your Community Fundraising partnership has been extended for another term.
        <span style="display:block;margin-top:10px;font-size:12px;color:#065f46;">New term end date</span>
        <strong style="font-size:18px;">${esc(String(input.extra?.termEndsAtDisplay || input.extra?.termEndsAt || '—'))}</strong>
      </p>
      <p>Your Partner Community Code <strong>${esc(code)}</strong> remains active. Families continue to receive ${parentOff}% OFF at checkout, and your organisation continues to earn a ${donation}% Fundraising Cashback Grant on Total Community Support.</p>
      ${dashboardGuide}
      <p style="font-size:13px;color:#555;">No further action is required unless you wish to update your Official Grant Account or share materials with families.</p>
    `,
    D9: `
      <p style="margin:0 0 4px;font-size:13px;color:#64748b;">Period: ${esc(period ? displayFundraisingPeriod(period) : '—')}</p>
      ${
        payoutDueDisplayForPeriod(period || '')
          ? `<p style="margin:0 0 12px;font-size:13px;color:#64748b;">Target payout date: <strong>${esc(payoutDueDisplayForPeriod(period || '') || '')}</strong> (15th of the month after quarter end, or next business day if weekend).</p>`
          : `<p style="margin:0 0 12px;font-size:13px;color:#64748b;">${esc(FUNDRAISING_GRANT_PAYOUT_POLICY.summary)}</p>`
      }
      <p style="margin:0 0 16px;"><strong>Quarterly Community Support &amp; Fundraising Cashback Grant Statement</strong></p>
      ${issuerRecipientBlock}
      ${grantCalcTable}
      ${paymentDestinationBlock}
      ${auditRetainNote}
    `,
    D10: `
      <p style="margin:0 0 4px;font-size:13px;color:#64748b;">Period: ${esc(period ? displayFundraisingPeriod(period) : '—')}</p>
      <p style="margin:0 0 16px;"><strong>Remittance Advice — Fundraising Cashback Grant Transfer</strong></p>
      ${issuerRecipientBlock}
      ${grantCalcTable}
      ${paymentDestinationBlock}
      <p>This confirms SELPIC has completed the bank transfer to your Official Grant Account for the period above.</p>
      ${auditRetainNote}
    `,
    D11: `
      <p>Tax Invoice / RCTI placeholder for ${esc(org)}.</p>
      <p>Enable this template only after accounting confirmation of GST / non-profit treatment.</p>
    `,
    D12: `
      <p>Dear ${esc(contact)},</p>
      <p>This notice confirms that Community Fundraising partnership participation for <strong>${esc(org)}</strong> has been
        <strong>${partner?.status === 'terminated' ? 'terminated' : 'suspended'}</strong>.</p>
      <p>Partner Community Code <strong>${esc(code)}</strong> is deactivated for new community fundraising orders.
        Partner Lookup access for ongoing partnership management will no longer be available for this enrolment.</p>
      <p>Any Fundraising Cashback Grant amounts already calculated for completed periods will continue to be handled under SELPIC&apos;s normal settlement process where still owing.</p>
      <p style="font-size:13px;line-height:1.55;color:#334155;">
        This change applies to your <em>organisation partnership</em> only. Families who purchased using your code remain ordinary SELPIC customers with their own logins;
        ending the partnership does not close their accounts.
      </p>
      ${partnershipEndDataHandlingHtml(company, email)}
      <p style="font-size:13px;color:#555;">If you believe this notice was sent in error, contact us at
        <a href="mailto:${esc(email)}">${esc(email)}</a>.</p>
    `,
    D21: `
      <p>Dear ${esc(contact)},</p>
      <p>We acknowledge receipt of your preference <strong>not to renew</strong> the SELPIC Community Fundraising partnership for <strong>${esc(org)}</strong>.</p>
      <p>Your current term remains in effect until
        <strong>${esc(String(input.extra?.termEndsAtDisplay || input.extra?.termEndsAt || 'the current term end date'))}</strong>
        (or until SELPIC suspends the partnership sooner if requested). While the partnership remains active, families may continue to use code <strong>${esc(code)}</strong> and receive ${parentOff}% OFF.</p>
      <p>When the partnership ends (at term end or upon suspension/termination), organisation operational access closes and organisation information is handled as described below. SELPIC may contact you before deactivating your Partner Community Code. Family customer accounts remain separate and are not closed by this decision.</p>
      ${partnershipEndDataHandlingHtml(company, email)}
      <p style="font-size:13px;color:#555;">If you change your mind before the term ends, open Partner Lookup and confirm renewal, or contact
        <a href="mailto:${esc(email)}">${esc(email)}</a>.</p>
    `,
    D22: `
      <p style="margin:0 0 12px;padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;font-size:13px;color:#065f46;">
        <strong>Action required:</strong> Complete this form, then upload the filled PDF (or a clear photo/scan) in Partner Lookup
        -&gt; Grant account -&gt; Your change requests -&gt; Reply &amp; files. Do not email bank details unless SELPIC asks you to.
      </p>
      <p>Dear ${esc(contact)},</p>
      <p>
        This <strong>Partnership Change Request Form (D22)</strong> is issued by ${esc(company)} so an authorised representative of
        <strong>${esc(org)}</strong> can request an update to partnership records (including Official Grant Account payee details or
        organisation contact details). SELPIC will only apply changes after verification.
      </p>
      <p style="font-size:13px;color:#555;">
        Request ID: <strong>${esc(String(input.extra?.changeRequestId || '—'))}</strong>
        · Kind: <strong>${esc(String(input.extra?.changeRequestKindLabel || '—'))}</strong>
        · Partner ID: <strong>${esc(partnerId || '—')}</strong>
        · Partner Community Code: <strong>${esc(code || '—')}</strong>
      </p>
      ${
        String(input.extra?.partnerMessage || '').trim()
          ? `<p style="margin:12px 0;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;white-space:pre-wrap;"><strong>Your original request message:</strong><br/>${esc(String(input.extra?.partnerMessage))}</p>`
          : ''
      }

      <h3 style="margin:24px 0 8px;font-size:16px;">1. Authorised officer / organisation head</h3>
      <p style="font-size:13px;color:#555;margin:0 0 8px;">Must be authorised by the organisation (for example Principal, Board Chair, Treasurer, or delegated officer) to instruct SELPIC about payee and contact records.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px;">
        <tr><td style="border:1px solid #cbd5e1;padding:10px;width:40%;">Full legal name</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">Position / role<br/><span style="font-size:11px;color:#64748b;">e.g. Principal, Board Chair, Treasurer</span></td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">Work email</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">Phone</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">Date (DD/MM/YYYY)</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
      </table>
      <p style="font-size:13px;margin:0 0 6px;"><strong>Signature of authorised officer</strong></p>
      <p style="font-size:12px;color:#64748b;margin:0 0 8px;">
        Digital: type full name in the email fillable PDF signature field. Wet ink: print, sign below, then scan/photo and upload.
      </p>
      <div style="border:2px solid #94a3b8;border-radius:8px;min-height:88px;padding:12px;margin:0 0 16px;background:#fafafa;">
        <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">Sign here / type full name</div>
        &nbsp;
      </div>

      <h3 style="margin:24px 0 8px;font-size:16px;">2. Change type (tick all that apply)</h3>
      <ul style="font-size:14px;line-height:1.8;margin:0 0 16px;list-style:none;padding-left:0;">
        <li>[ ] Official Grant Account (ABN / BSB / account name / account number)</li>
        <li>[ ] Organisation contact name, email or phone</li>
        <li>[ ] Other (describe in section 5)</li>
      </ul>

      <h3 style="margin:24px 0 8px;font-size:16px;">3. Official Grant Account (complete only if changing payee details)</h3>
      <p style="font-size:13px;color:#555;margin:0 0 8px;">
        Use an <strong>official school or organisation bank account</strong> used for transparent Fundraising Cashback Grant
        remittance and audit (D9/D10). Personal accounts are not accepted.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 8px;">
        <tr><td style="border:1px solid #cbd5e1;padding:10px;width:40%;">Bank name (optional)</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">Account name</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">ABN (11 digits)</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">BSB (6 digits)</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">Account number</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
      </table>
      <p style="font-size:12px;color:#64748b;margin:0 0 16px;">
        Current on-file (masked): ABN ${esc(abnDisplay || '—')} · BSB ${esc(payeeBsb ? maskedBsbValue(payeeBsb) : '***-***')} /
        Acc ${esc(payeeAccount ? maskedAccountValue(payeeAccount) : '****')} · Name ${esc(payeeAccountName || '—')}
      </p>

      <h3 style="margin:24px 0 8px;font-size:16px;">4. Contact details (complete only if changing contacts)</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px;">
        <tr><td style="border:1px solid #cbd5e1;padding:10px;width:40%;">New contact name</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">New contact email</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:10px;">New phone</td><td style="border:1px solid #cbd5e1;padding:10px;">&nbsp;</td></tr>
      </table>

      <h3 style="margin:24px 0 8px;font-size:16px;">5. Notes / other</h3>
      <div style="border:1px solid #cbd5e1;border-radius:8px;min-height:72px;padding:10px;margin:0 0 16px;">&nbsp;</div>

      <h3 style="margin:24px 0 8px;font-size:16px;">6. Privacy, authority and Australian law notices</h3>
      <ul style="font-size:13px;color:#334155;line-height:1.55;margin:0 0 12px;padding-left:18px;">
        <li><strong>Privacy Act 1988 (Cth) / APPs:</strong> ${esc(company)} collects this information to administer your Community Fundraising partnership, verify authorised instructions, and remit Fundraising Cashback Grants. We handle personal information under our Privacy Policy and APP requirements (including security and, when no longer needed, destruction or de-identification under APP 11.2, subject to legal retention).</li>
        <li><strong>Record retention:</strong> Grant remittance, bank transfer evidence, and related tax/business records are retained for the periods Australian law requires (ATO guidance generally at least 5 years; longer where company record-keeping applies, commonly discussed as up to 7 years).</li>
        <li><strong>Authority:</strong> By signing, you confirm you are authorised by ${esc(org)} to request these changes and that the Official Grant Account (if provided) is an official organisation account for grant remittance and audit reporting.</li>
        <li><strong>No tax advice:</strong> This form does not constitute legal, tax or accounting advice. Your organisation remains responsible for its own ABN and bookkeeping treatment of grants.</li>
        <li><strong>Confirmation:</strong> After SELPIC applies verified changes, we email an Official Grant Account Update Confirmation (D16) to the organisation contact (masked details) and keep an internal admin alert (D17) plus a durable change history for dispute resolution.</li>
      </ul>
      <p style="font-size:13px;margin:16px 0 0;">
        [ ] I confirm the information above is true and complete to the best of my knowledge, and I am authorised to submit this request on behalf of ${esc(org)}.
      </p>
      <p style="font-size:12px;color:#64748b;margin:16px 0 0;">
        Return path: download this form from Partner Lookup -&gt; Documents (or the PDF attached to this email), complete it,
        then upload under Grant account -&gt; Your change requests. Support: <a href="mailto:${esc(email)}">${esc(email)}</a>.
      </p>
    `,
    D13: `
      <p>Dear ${esc(contact)},</p>
      <p>This is the <strong>final Fundraising Cashback Grant statement</strong> for <strong>${esc(org)}</strong>
        following suspension or termination of the Community Fundraising partnership.</p>
      <p style="margin:0 0 4px;font-size:13px;color:#64748b;">Period: ${esc(period || '—')}</p>
      ${issuerRecipientBlock}
      ${grantCalcTable}
      ${paymentDestinationBlock}
      <p style="font-size:13px;color:#555;line-height:1.5;">
        Please retain this statement for your organisation&apos;s financial records.
        ${esc(company)} also retains grant remittance and related tax/business records for the periods required under
        Australian law (generally at least 5 years for tax records; longer where company record-keeping applies).
      </p>
      ${partnershipEndDataHandlingHtml(company, email)}
    `,
    D14: `
      <p><strong>Internal grant transfer checklist</strong> — ${esc(period)} / ${esc(org)}</p>
      <ol>
        <li>Generate settlement (Ready)</li>
        <li>Verify Total Community Support and grant rate</li>
        <li>Confirm Official Grant Account and transfer</li>
        <li>Mark as Paid</li>
        <li>Send D9 + D10</li>
      </ol>
    `,
    D15: `
      <p>Settlement Audit Pack — ${esc(org)} / ${esc(period)}</p>
      <p>Includes grant totals, payment reference, and document references for audit.</p>
      <p>Fundraising Cashback Grant: $${esc(String(input.extra?.commission ?? 0))} · Ref: ${esc(String(input.extra?.paymentReference || ''))}</p>
    `,
    D16: `
      <p>Dear ${esc(contact)},</p>
      <p>
        This notice confirms that the Official Grant Account for <strong>${esc(org)}</strong>
        has been ${input.extra?.kind === 'registered' ? 'registered' : 'updated'} by SELPIC after verification
        (for example following a Partner Lookup change request and completed D22 form).
      </p>
      <p style="margin:0 0 8px;font-weight:700;">Updated Details (Masked for Security):</p>
      <ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.6;">
        <li>Account Name: ${esc(payeeAccountName || org)}</li>
        <li>Partner ABN: ${esc(abnDigits.length === 11 ? abnDisplay : abnRaw || 'Not Provided')}</li>
        <li>BSB ${esc(payeeBsb ? maskedBsbValue(payeeBsb) : '***-***')} / Acc ${esc(payeeAccount ? maskedAccountValue(payeeAccount) : '****')}</li>
        <li>Date / Time: ${esc(updatedAtDisplay)}</li>
      </ul>
      <p style="margin:20px 0 0;padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:13px;color:#9a3412">
        <strong>Security Alert:</strong> If you or an authorised representative did not make this change,
        please contact SELPIC Support immediately at
        <a href="mailto:${esc(email)}" style="color:#9a3412">${esc(email)}</a>.
      </p>
    `,
    D17: `
      <p style="margin:0 0 12px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;font-weight:700;color:#991b1b;">
        [Admin Internal Notice] Official Grant Account ${input.extra?.kind === 'registered' ? 'Registered' : 'Updated'}
      </p>
      <ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.65;">
        <li>Partner Name: ${esc(org)}</li>
        <li>Partner ID: ${esc(partnerId || '—')}</li>
        <li>Partner Community Code: ${esc(code || '—')}</li>
        <li>ABN: ${esc(abnDisplay || '—')}</li>
        <li>Account Name: ${esc(payeeAccountName || '—')}</li>
        <li>Bank Name: ${esc(partner?.bankName || String(input.extra?.bankName || '—'))}</li>
        <li>BSB: ${esc(payeeBsb || '—')}</li>
        <li>Account Number: ${esc(payeeAccount || '—')}</li>
        <li>Updated At: ${esc(updatedAtDisplay)}</li>
        <li>Contact email: ${esc(partner?.contactEmail || String(input.extra?.contactEmail || '—'))}</li>
      </ul>
      <p style="margin:0 0 12px;font-weight:600;">Action Required: Review in Admin Partner Registry before processing the quarterly payout.</p>
      ${
        partnersUrl || payoutUrl
          ? `<p style="margin:16px 0 0;">
        ${partnersUrl ? `<a href="${esc(partnersUrl)}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;margin:0 8px 8px 0">Partner Registry</a>` : ''}
        ${payoutUrl ? `<a href="${esc(payoutUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;margin:0 8px 8px 0">Grant Tracker</a>` : ''}
      </p>`
          : ''
      }
    `,
  }

  return healFundraisingDocumentHtml(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${esc(title)}</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5;max-width:720px;margin:0 auto;padding:24px;">
  <header style="border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px;">
    <div style="font-size:20px;font-weight:700;">${esc(company)}</div>
    <div style="font-size:14px;color:#555;">Community Fundraising · ${esc(input.type)} · ${esc(title)}</div>
  </header>
  ${bodyByType[input.type]}
  <hr style="border:none;border-top:1px solid #dddddd;margin:32px 0 16px;" />
  <footer style="font-size:12px;line-height:1.5;color:#888888;">
    <p style="margin:0 0 6px;">${esc(company)} · ${esc(email)}</p>
    <p style="margin:0;">Grant Policy: Total Community Support definition version: ${esc(TOTAL_COMMUNITY_SUPPORT_DEFINITION_VERSION)}</p>
  </footer>
</body>
</html>`)
}

/**
 * Partner email cover copy (invoice-style): brief body in the email;
 * the full official document lives in the PDF attachment only.
 * Mirror admin invoice Send: `message` cover + PDF, not full document HTML in the body.
 */
export function buildFundraisingDocCoverPlainText(input: {
  contactName?: string | null
  organizationName: string
  documentTitle: string
  documentType: FundraisingDocumentType | string
  period?: string
}): string {
  const name = formatPartnerDisplayName(input.contactName, 'Partner')
  const periodBit = input.period ? ` for ${input.period}` : ''
  return (
    `Dear ${name},\n\n` +
    `Thank you for partnering with SELPIC. Together for Our School & Community.\n\n` +
    `Please find attached your ${input.documentTitle} (${input.documentType})${periodBit} for ${input.organizationName}.\n\n` +
    `The PDF attachment is the official record for your organisation's files and audit retention. ` +
    `This email is a short notice only — the full statement is in the attachment.\n\n` +
    `If you have any questions, reply to this email or contact ${COMPANY_CONTACT.email}.`
  )
}

/** Short HTML cover for server-side Resend sends (same content as plain cover). */
export function buildFundraisingDocCoverHtml(input: {
  contactName?: string | null
  organizationName: string
  documentTitle: string
  documentType: FundraisingDocumentType | string
  period?: string
  /** Optional partner-facing note (Unicode-safe in HTML email; PDF font may not support CJK). */
  partnerMessage?: string | null
  changeRequestId?: string | null
}): string {
  const name = esc(formatPartnerDisplayName(input.contactName, 'Partner'))
  const org = esc(input.organizationName)
  const title = esc(input.documentTitle)
  const type = esc(String(input.documentType))
  const periodBit = input.period ? ` for <strong>${esc(input.period)}</strong>` : ''
  const support = esc(COMPANY_CONTACT.email)
  const isD22 = String(input.documentType) === 'D22'
  const msg = String(input.partnerMessage || '').trim()
  const msgBlock = msg
    ? `<p style="margin:16px 0 8px;"><strong>Your request message:</strong></p>
       <p style="margin:0 0 16px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;white-space:pre-wrap;">${esc(msg)}</p>`
    : ''
  const d22Instructions = isD22
    ? `<div style="margin:16px 0;padding:14px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;color:#065f46;">
         <p style="margin:0 0 8px;font-weight:600;">How to complete your change request</p>
         <ol style="margin:0;padding-left:18px;color:#064e3b;">
           <li>Open your secure <strong>Partner Lookup</strong> link (same portal you use for fundraising).</li>
           <li>Go to <strong>Documents</strong> and download <strong>D22 — Partnership Change Request Form</strong> (fillable PDF).</li>
           <li>Open the PDF on a computer, complete the fields, tick the change type(s), and sign as the authorised officer.</li>
           <li>Save the PDF, then return to Lookup → <strong>Grant account</strong> → <strong>Your change requests</strong> → attach the completed file under <strong>Reply &amp; files</strong> and send.</li>
         </ol>
         <p style="margin:10px 0 0;font-size:12px;color:#047857;">There is no PDF attached to this email — always use Documents so you get the latest fillable form.</p>
       </div>
       ${
         input.changeRequestId
           ? `<p style="font-size:12px;color:#64748b;">Request ID: ${esc(String(input.changeRequestId))}</p>`
           : ''
       }`
    : ''
  const intro = isD22
    ? `<p>SELPIC has reviewed your change request for <strong>${org}</strong>. Please download and complete form <strong>${title}</strong> (${type}) from Partner Lookup Documents, then upload the filled file on your change request.</p>`
    : `<p>Please find attached your <strong>${title}</strong> (${type})${periodBit} for <strong>${org}</strong>.</p>`
  const footerNote = isD22
    ? `<p style="color:#555">This email is an instruction notice only. Your original message is kept above (including non-English text). The fillable form lives in Partner Lookup → Documents.</p>`
    : `<p style="color:#555">The PDF attachment is the official form for your organisation&apos;s files. This email keeps your original message readable (including non-English text).</p>`
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#111;line-height:1.55;max-width:640px">
      <p>Dear ${name},</p>
      <p>Thank you for partnering with SELPIC. Together for Our School &amp; Community.</p>
      ${intro}
      ${msgBlock}
      ${d22Instructions}
      ${footerNote}
      <p>If you have any questions, reply to this email or contact <a href="mailto:${support}">${support}</a>.</p>
    </div>
  `.trim()
}

export function buildFundraisingSettlementCoverPlainText(input: {
  contactName?: string | null
  organizationName: string
  period: string
  paymentReference: string
  grantAmount: number
}): string {
  const name = formatPartnerDisplayName(input.contactName, 'Partner')
  return (
    `Dear ${name},\n\n` +
    `Please find attached your quarterly Community Grant statement (D9) and remittance advice (D10) for ${input.period} — ${input.organizationName}.\n\n` +
    `Payment reference: ${input.paymentReference}\n` +
    `Grant amount: $${Number(input.grantAmount || 0).toFixed(2)} AUD\n\n` +
    `The PDF attachments are the official records for your organisation's files. This email is a short notice only.\n\n` +
    `If you have any questions, reply to this email or contact ${COMPANY_CONTACT.email}.`
  )
}

/** Shared shell matching D1–D21 partnership emails (header + Grant Policy footer). */
export function wrapFundraisingEmailHtml(input: {
  code: string
  title: string
  bodyHtml: string
  definitionVersion?: string
}): string {
  const company = COMPANY_LEGAL.companyName
  const email = COMPANY_CONTACT.email
  const version = TOTAL_COMMUNITY_SUPPORT_DEFINITION_VERSION
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${esc(input.title)}</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5;max-width:720px;margin:0 auto;padding:24px;">
  <header style="border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px;">
    <div style="font-size:20px;font-weight:700;">${esc(company)}</div>
    <div style="font-size:14px;color:#555;">Community Fundraising · ${esc(input.code)} · ${esc(input.title)}</div>
  </header>
  ${input.bodyHtml}
  <hr style="border:none;border-top:1px solid #dddddd;margin:32px 0 16px;" />
  <footer style="font-size:12px;line-height:1.5;color:#888888;">
    <p style="margin:0 0 6px;">${esc(company)} · ${esc(email)}</p>
    <p style="margin:0;">Grant Policy: Total Community Support definition version: ${esc(version)}</p>
  </footer>
</body>
</html>`.trim()
}
