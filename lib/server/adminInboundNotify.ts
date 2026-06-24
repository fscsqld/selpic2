import { COMPANY_CONTACT } from '@/lib/companyLegal'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
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
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL?.trim() ||
    'https://selpic.com.au'
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '')
  return `https://${raw.replace(/\/$/, '')}`
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
