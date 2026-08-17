import type { FundraisingChangeRequest, FundraisingPartner, FundraisingSettings } from '@/lib/fundraising/types'
import { FUNDRAISING_DOCUMENT_LABELS } from '@/lib/fundraising/types'
import { formatChangeRequestKind, formatChangeRequestStatus } from '@/lib/fundraising/changeRequests'
import { COMPANY_CONTACT } from '@/lib/companyLegal'
import { getPublicSiteUrl } from '@/lib/publicSiteUrl'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import { generateFundraisingDoc } from '@/lib/fundraising/generateDoc'
import { issueFundraisingDocuments } from '@/lib/fundraising/issueDocuments'
import {
  loadFundraisingSettingsFromDb,
  upsertFundraisingDocumentRow,
} from '@/lib/fundraising/persistence'
import type { OrderRecord } from '@/lib/store'

export function resolveAdminNotificationRecipients(): string[] {
  const fromEnv = (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.CONTACT_ADMIN_EMAIL || '')
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean)
  if (fromEnv.length > 0) return fromEnv
  return [COMPANY_CONTACT.email]
}

export function siteBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) return getPublicSiteUrl()
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    if (vercel.startsWith('http://') || vercel.startsWith('https://')) return vercel.replace(/\/$/, '')
    return `https://${vercel.replace(/\/$/, '')}`
  }
  return getPublicSiteUrl()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type AdminInboundEmailInput = {
  subjectPrefix: string
  headline: string
  intro: string
  rows: Array<{ label: string; value: string }>
  bodyText?: string
  adminPath: string
  replyTo?: string
  footerNote?: string
}

async function sendAdminInboundEmail(input: AdminInboundEmailInput): Promise<{ ok: boolean; logMessage?: string }> {
  const recipients = resolveAdminNotificationRecipients()
  const adminUrl = `${siteBaseUrl()}${input.adminPath.startsWith('/') ? input.adminPath : `/${input.adminPath}`}`
  const subject = `${input.subjectPrefix}`.slice(0, 500)

  const rowsHtml = input.rows
    .map(
      (row) =>
        `<tr><td style="padding:6px 0;color:#666;width:120px;vertical-align:top">${escapeHtml(row.label)}</td><td style="padding:6px 0">${escapeHtml(row.value)}</td></tr>`
    )
    .join('')

  const bodyBlock = input.bodyText
    ? `<div style="margin:16px 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;white-space:pre-wrap;font-size:14px">${escapeHtml(input.bodyText)}</div>`
    : ''

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:640px">
      <h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(input.headline)}</h2>
      <p style="margin:0 0 16px;color:#444">${escapeHtml(input.intro)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rowsHtml}</table>
      ${bodyBlock}
      <p style="margin:16px 0 0">
        <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Open in admin</a>
      </p>
      ${input.footerNote ? `<p style="margin:12px 0 0;font-size:12px;color:#64748b">${escapeHtml(input.footerNote)}</p>` : ''}
    </div>
  `.trim()

  const result = await sendEmailViaResendServer({
    to: recipients,
    subject,
    html,
    replyTo: input.replyTo,
    skipBranding: true,
    skipTracking: true,
  })

  if (!result.ok) {
    console.warn('[admin-inbound] email failed:', result.logMessage)
  }
  return result
}

export type ContactAdminNotifyInput = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  category: string
}

export async function notifyAdminsOfContactMessage(input: ContactAdminNotifyInput) {
  return sendAdminInboundEmail({
    subjectPrefix: `[SELPIC Contact] ${input.subject}`,
    headline: 'New customer message',
    intro: 'A customer submitted the Contact Us form. Reply to this email to respond directly.',
    rows: [
      { label: 'From', value: `${input.name} <${input.email}>` },
      { label: 'Category', value: input.category },
      { label: 'Subject', value: input.subject },
    ],
    bodyText: input.message,
    adminPath: '/admin/messages',
    replyTo: input.email,
    footerNote: `Message ID: ${input.id}`,
  })
}

export async function notifyAdminsOfBespokeRequest(input: {
  id: string
  contactName?: string
  contactEmail?: string
  rollPreset?: string
}) {
  return sendAdminInboundEmail({
    subjectPrefix: '[SELPIC Bespoke] New label request',
    headline: 'New bespoke label request',
    intro: 'A customer submitted a bespoke sticker/label request with optional logo upload.',
    rows: [
      { label: 'Request ID', value: input.id },
      { label: 'Contact', value: input.contactName || '—' },
      { label: 'Email', value: input.contactEmail || '—' },
      { label: 'Roll / type', value: input.rollPreset || '—' },
    ],
    adminPath: '/admin/bespoke-requests',
    replyTo: input.contactEmail,
  })
}

export async function notifyAdminsOfNewsletterSignup(email: string) {
  return sendAdminInboundEmail({
    subjectPrefix: '[SELPIC Newsletter] New subscriber',
    headline: 'New newsletter subscriber',
    intro: 'A visitor subscribed to the newsletter from the storefront.',
    rows: [{ label: 'Email', value: email }],
    adminPath: '/admin/newsletter',
    replyTo: email,
  })
}

export async function notifyAdminsOfCommunityPost(input: {
  id: number | string
  title: string
  category: string
  author: string
  content: string
}) {
  return sendAdminInboundEmail({
    subjectPrefix: `[SELPIC Community] New post: ${input.title}`.slice(0, 120),
    headline: 'New community post',
    intro: 'A customer published a new community board post. Review if moderation is needed.',
    rows: [
      { label: 'Title', value: input.title },
      { label: 'Category', value: input.category },
      { label: 'Author', value: input.author },
    ],
    bodyText: input.content.slice(0, 4000),
    adminPath: '/admin/community',
    footerNote: `Post ID: ${input.id}`,
  })
}

export async function notifyAdminsOfCommunityComment(input: {
  postId: number
  postTitle: string
  author: string
  content: string
}) {
  return sendAdminInboundEmail({
    subjectPrefix: `[SELPIC Community] Comment on: ${input.postTitle}`.slice(0, 120),
    headline: 'New community comment',
    intro: 'A customer commented on a community post.',
    rows: [
      { label: 'Post', value: input.postTitle },
      { label: 'Author', value: input.author },
    ],
    bodyText: input.content.slice(0, 4000),
    adminPath: '/admin/community',
    footerNote: `Post ID: ${input.postId}`,
  })
}

export async function notifyAdminsOfFundraisingApplication(input: {
  id: string
  organizationName: string
  organizationTypeLabel: string
  contactName: string
  contactEmail: string
  phone: string
  postalAddress: string
}): Promise<{ ok: boolean; logMessage?: string }> {
  return sendAdminInboundEmail({
    subjectPrefix: `[SELPIC Fundraising] New partner application — ${input.organizationName}`.slice(0, 120),
    headline: 'New fundraising partnership application',
    intro: 'An organisation applied to the SELPIC Fundraising Program. Review and assign a promo code in admin.',
    rows: [
      { label: 'Organisation', value: input.organizationName },
      { label: 'Type', value: input.organizationTypeLabel },
      { label: 'Contact', value: `${input.contactName} <${input.contactEmail}>` },
      { label: 'Phone', value: input.phone },
      { label: 'Address', value: input.postalAddress },
      { label: 'Partner ID', value: input.id },
    ],
    adminPath: '/admin/fundraising/partners',
    replyTo: input.contactEmail,
    footerNote: 'Open Fundraising Partners to approve, assign a code, and send the welcome pack.',
  })
}

/** Partner Lookup — request only (no bank mutation). Admin completes change in Partner Registry. */
export async function notifyAdminsOfGrantAccountChangeRequest(input: {
  partner: FundraisingPartner
  kind: 'register' | 'update'
  note?: string
  proposed?: {
    bankName?: string
    accountName?: string
    abn?: string
    bsb?: string
    accountNumber?: string
  }
}): Promise<{ ok: boolean; logMessage?: string; subject: string; to: string[] }> {
  // Legacy wrapper — prefer notifyAdminsOfFundraisingChangeRequest with a persisted ticket.
  const proposed = input.proposed
  const proposedLines = proposed
    ? [
        proposed.bankName ? `Bank name: ${proposed.bankName}` : '',
        proposed.accountName ? `Account name: ${proposed.accountName}` : '',
        proposed.abn ? `ABN: ${proposed.abn}` : '',
        proposed.bsb ? `BSB: ${proposed.bsb}` : '',
        proposed.accountNumber ? `Account number: ${proposed.accountNumber}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return sendAdminInboundEmail({
    subjectPrefix: `SELPIC Fundraising — Grant Account ${
      input.kind === 'register' ? 'registration' : 'update'
    } request (${input.partner.organizationName})`.slice(0, 500),
    headline:
      input.kind === 'register'
        ? 'Official Grant Account registration requested'
        : 'Official Grant Account update requested',
    intro:
      'A partner organisation asked SELPIC to set or change Official Grant Account details. Update bank/ABN in Partner Registry after verification.',
    rows: [
      { label: 'Organisation', value: input.partner.organizationName },
      { label: 'Partner ID', value: input.partner.id },
      { label: 'Contact', value: `${input.partner.contactName} <${input.partner.contactEmail}>` },
    ],
    bodyText: [input.note ? `Partner note:\n${input.note}` : '', proposedLines ? `Proposed details:\n${proposedLines}` : '']
      .filter(Boolean)
      .join('\n\n'),
    adminPath: '/admin/fundraising/partners',
    replyTo: input.partner.contactEmail,
    footerNote: 'Open Partner Registry → Change requests queue.',
  }).then((r) => ({
    ...r,
    subject: `SELPIC Fundraising — Grant Account request (${input.partner.organizationName})`,
    to: resolveAdminNotificationRecipients(),
  }))
}

export async function notifyAdminsOfFundraisingChangeRequest(input: {
  partner: FundraisingPartner
  request: FundraisingChangeRequest
  isReply?: boolean
}): Promise<{ ok: boolean; logMessage?: string; subject: string; to: string[] }> {
  const recipients = resolveAdminNotificationRecipients()
  const { request } = input
  const subject = `SELPIC Fundraising — ${input.isReply ? 'Partner reply' : 'Change request'} (${
    input.partner.organizationName
  }) · ${formatChangeRequestKind(request.kind)}`.slice(0, 500)

  const proposed = request.proposed
  const proposedLines = proposed
    ? Object.entries(proposed)
        .filter(([, v]) => Boolean(v))
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : ''

  const result = await sendAdminInboundEmail({
    subjectPrefix: subject,
    headline: input.isReply
      ? 'Partner replied to a change request'
      : 'New fundraising change request',
    intro: input.isReply
      ? 'The organisation submitted a reply. Review the queue, verify details, then apply changes in Partner Registry.'
      : 'A partner submitted a change request. It appears in Partner Registry → Change requests. Do not auto-apply — verify, send a form if needed, then Save bank/contact on the partner form.',
    rows: [
      { label: 'Organisation', value: input.partner.organizationName },
      { label: 'Partner ID', value: input.partner.id },
      { label: 'Request ID', value: request.id },
      { label: 'Kind', value: formatChangeRequestKind(request.kind) },
      { label: 'Status', value: formatChangeRequestStatus(request.status) },
      { label: 'Contact', value: `${input.partner.contactName} <${input.partner.contactEmail}>` },
    ],
    bodyText: [
      request.message ? `Partner message:\n${request.message}` : '',
      proposedLines ? `Proposed details:\n${proposedLines}` : '',
      request.partnerReply ? `Partner reply:\n${request.partnerReply}` : '',
      request.attachments?.length
        ? `Attachments:\n${request.attachments.map((a) => `- ${a.fileName}${a.fileUrl ? ` · ${a.fileUrl}` : ''}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
    adminPath: '/admin/fundraising/partners#change-requests',
    replyTo: input.partner.contactEmail,
    footerNote: 'Fundraising Quick Action badge counts open change requests + pending applications.',
  })

  return { ...result, subject, to: recipients }
}

/** Issue D22 form (PDF email + Documents), then partner completes and uploads reply. */
export async function sendPartnerChangeRequestPack(input: {
  partner: FundraisingPartner
  request: FundraisingChangeRequest
  adminNote?: string
}): Promise<{ ok: boolean; logMessage?: string; subject: string; documentId?: string }> {
  const settings = await loadFundraisingSettingsFromDb()
  const kindLabel = formatChangeRequestKind(input.request.kind)
  const adminNote = String(input.adminNote || '').trim()

  const docs = await issueFundraisingDocuments({
    types: ['D22'],
    partner: input.partner,
    settings,
    email: true,
    extra: {
      changeRequestId: input.request.id,
      changeRequestKindLabel: kindLabel,
      partnerMessage: [input.request.message, adminNote ? `SELPIC note: ${adminNote}` : '']
        .filter(Boolean)
        .join('\n\n'),
    },
  })

  const doc = docs[0]
  const ok = Boolean(doc && doc.status !== 'Failed')
  const subject = `SELPIC Fundraising — ${FUNDRAISING_DOCUMENT_LABELS.D22} (${input.partner.organizationName})`

  if (!ok) {
    return {
      ok: false,
      logMessage: 'Failed to email D22 Partnership Change Request Form',
      subject,
      documentId: doc?.id,
    }
  }

  return { ok: true, subject, documentId: doc?.id }
}

export async function notifyAdminsOfGrantAccountUpdate(input: {
  partner: FundraisingPartner
  settings: FundraisingSettings
  kind: 'registered' | 'updated'
  updatedAt: string
}): Promise<{ ok: boolean; logMessage?: string; subject: string; to: string[] }> {
  const base = siteBaseUrl()
  const partnersUrl = `${base}/admin/fundraising/partners`
  const payoutUrl = `${base}/admin/fundraising/payout`
  const recipients = resolveAdminNotificationRecipients()
  const subject = `SELPIC Community Fundraising — D17 Admin Grant Account Alert (${input.partner.organizationName})`.slice(
    0,
    500
  )

  const doc = generateFundraisingDoc('D17', {
    partner: input.partner,
    settings: input.settings,
    extra: {
      kind: input.kind,
      updatedAt: input.updatedAt,
      partnersUrl,
      payoutUrl,
      contactEmail: input.partner.contactEmail,
      bankName: input.partner.bankName,
    },
    status: 'Generated',
  })

  const result = await sendEmailViaResendServer({
    to: recipients,
    subject,
    html: doc.htmlBody,
    replyTo: input.partner.contactEmail,
    skipBranding: true,
    skipTracking: true,
  })

  doc.status = result.ok ? 'Sent' : 'Failed'
  doc.sentAt = result.ok ? new Date().toISOString() : undefined
  doc.updatedAt = new Date().toISOString()
  void upsertFundraisingDocumentRow(doc).catch((e) =>
    console.warn('[fundraising] D17 document persist failed:', e)
  )

  if (!result.ok) console.warn('[admin-inbound] grant account alert (D17) failed:', result.logMessage)
  return { ...result, subject, to: recipients }
}

export async function sendPartnerGrantAccountConfirmation(input: {
  partner: FundraisingPartner
  settings: FundraisingSettings
  kind: 'registered' | 'updated'
  updatedAt: string
}): Promise<{ ok: boolean; logMessage?: string; subject: string }> {
  const support = COMPANY_CONTACT.email
  const subject = `SELPIC Community Fundraising — Official Grant Account Updated (${input.partner.organizationName})`.slice(
    0,
    500
  )

  const doc = generateFundraisingDoc('D16', {
    partner: input.partner,
    settings: input.settings,
    extra: {
      kind: input.kind,
      updatedAt: input.updatedAt,
    },
    status: 'Generated',
  })

  // Grant Account confirmation: full HTML security notice (no PDF) — registration-style email.
  const result = await sendEmailViaResendServer({
    to: input.partner.contactEmail,
    subject,
    html: doc.htmlBody,
    replyTo: support,
    skipBranding: true,
    skipTracking: true,
  })

  doc.status = result.ok ? 'Sent' : 'Failed'
  doc.sentAt = result.ok ? new Date().toISOString() : undefined
  doc.updatedAt = new Date().toISOString()
  void upsertFundraisingDocumentRow(doc).catch((e) =>
    console.warn('[fundraising] D16 document persist failed:', e)
  )

  if (!result.ok) console.warn('[fundraising] grant account partner email (D16) failed:', result.logMessage)
  return { ...result, subject }
}

export async function notifyAdminsOfNewOrder(order: OrderRecord) {
  const customerName = order.customer?.name || 'Customer'
  const customerEmail = order.customer?.email || '—'
  const paymentLabel = order.paymentMethodName || order.paymentMethod || '—'
  const itemSummary = order.items
    .slice(0, 5)
    .map((i) => `${i.name} ×${i.quantity}`)
    .join(', ')

  return sendAdminInboundEmail({
    subjectPrefix: `[SELPIC Order] ${order.id} — ${customerName}`,
    headline: 'New storefront order',
    intro:
      order.status === 'pending'
        ? 'A customer placed a bank-transfer order awaiting payment.'
        : 'A customer completed a new paid order.',
    rows: [
      { label: 'Order ID', value: order.id },
      { label: 'Customer', value: customerName },
      { label: 'Email', value: customerEmail },
      { label: 'Total', value: `$${Number(order.total).toFixed(2)}` },
      { label: 'Status', value: order.status },
      { label: 'Payment', value: paymentLabel },
      { label: 'Items', value: itemSummary || '—' },
    ],
    adminPath: `/admin/orders/${encodeURIComponent(order.id)}`,
    replyTo: order.customer?.email,
  })
}
