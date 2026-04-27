'use server'

import { headers } from 'next/headers'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { sendEmailViaResendServer, type ResendAttachmentInput } from '@/lib/email/resendServer'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderRecord } from '@/lib/store'
import {
  buildOrderConfirmationEmailHtml,
  buildOrderConfirmationEmailSubject,
} from '@/lib/orderConfirmationEmail'
import { buildSimpleReceiptEmailHtml, buildSimpleReceiptSubject } from '@/lib/email/simpleReceiptEmail'
import { buildOrderReceiptPdfBase64 } from '@/lib/pdf/serverReceiptPdf'
import { buildShippingNotificationPdfBase64 } from '@/lib/pdf/serverShippingNotificationPdf'

const GUEST_WINDOW_MS = 60 * 60 * 1000
const GUEST_MAX_PER_WINDOW = 30
const guestHits = new Map<string, { count: number; windowStart: number }>()

function guestRateAllowed(ip: string): boolean {
  const now = Date.now()
  const e = guestHits.get(ip)
  if (!e || now - e.windowStart > GUEST_WINDOW_MS) {
    guestHits.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (e.count >= GUEST_MAX_PER_WINDOW) return false
  e.count++
  return true
}

async function clientIp(): Promise<string> {
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown'
}

function receiptPdfAttachment(order: OrderRecord): ResendAttachmentInput | null {
  try {
    const content = buildOrderReceiptPdfBase64(order)
    if (!content) return null
    return {
      filename: `Receipt-${order.id}.pdf`,
      content,
      contentType: 'application/pdf',
    }
  } catch (e) {
    console.error('[receiptPdfAttachment]', e)
    return null
  }
}

function shippingNotificationPdfAttachment(order: OrderRecord): ResendAttachmentInput | null {
  try {
    const content = buildShippingNotificationPdfBase64(order)
    if (!content) return null
    return {
      filename: `Shipping-Notification-${order.id}.pdf`,
      content,
      contentType: 'application/pdf',
    }
  } catch (e) {
    console.error('[shippingNotificationPdfAttachment]', e)
    return null
  }
}

function shippingTrackUrl(provider: string | undefined, trackingNumber: string): string {
  const p = (provider || '').toLowerCase()
  const t = encodeURIComponent(trackingNumber.trim())
  if (p.includes('aus') || p.includes('australia post') || p.includes('post')) {
    return `https://auspost.com.au/mypost/track/#/details/${t}`
  }
  return `https://www.google.com/search?q=${t}+tracking`
}

async function markConfirmationSentInLedger(orderId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.from('orders').select('payload').eq('id', orderId).maybeSingle()
    if (error || !data?.payload) return
    const current = normalizeLedgerOrder(data.payload as OrderRecord)
    const now = new Date().toISOString()
    const next: OrderRecord = {
      ...current,
      emailConfirmation: {
        sent: true,
        sentAt: now,
        status: 'sent',
        attempts: (current.emailConfirmation?.attempts || 0) + 1,
        lastAttempt: now,
      },
    }
    const { error: upErr } = await sb.from('orders').update({ payload: next }).eq('id', orderId)
    if (upErr) {
      console.warn('[emails] markConfirmationSentInLedger failed:', upErr.message)
    }
  } catch (e) {
    console.warn('[emails] markConfirmationSentInLedger error:', e)
  }
}

async function markReceiptSentInLedger(orderId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.from('orders').select('payload').eq('id', orderId).maybeSingle()
    if (error || !data?.payload) return
    const current = normalizeLedgerOrder(data.payload as OrderRecord)
    const now = new Date().toISOString()
    const next: OrderRecord = {
      ...current,
      receiptEmail: {
        sent: true,
        sentAt: now,
      },
    }
    const { error: upErr } = await sb.from('orders').update({ payload: next }).eq('id', orderId)
    if (upErr) {
      console.warn('[emails] markReceiptSentInLedger failed:', upErr.message)
    }
  } catch (e) {
    console.warn('[emails] markReceiptSentInLedger error:', e)
  }
}

function parseOrderRecordJson(json: string): OrderRecord | null {
  try {
    const o = JSON.parse(json) as unknown
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return null
    const r = o as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.total !== 'number') return null
    const c = r.customer as Record<string, unknown> | undefined
    if (!c || typeof c.email !== 'string' || !String(c.email).includes('@')) return null
    if (!Array.isArray(r.items)) return null
    return o as OrderRecord
  } catch {
    return null
  }
}

async function loadOrderFromSupabaseById(orderId: string): Promise<OrderRecord | null> {
  if (!isSupabaseConfigured()) return null
  const sb = getSupabaseAdmin()
  const { data, error } = await sb.from('orders').select('payload').eq('id', orderId.trim()).maybeSingle()
  if (error || !data?.payload) return null
  return normalizeLedgerOrder(data.payload as OrderRecord)
}

/**
 * Admin UI / messages: send arbitrary transactional content (already branded + tracked on client when applicable).
 */
export async function sendAdminComposeEmailAction(input: {
  to: string | string[]
  subject: string
  html: string
  attachments?: ResendAttachmentInput[]
  skipBranding?: boolean
  skipTracking?: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireSupabaseAdminUser()
  if (!admin) return { ok: false, error: 'UNAUTHORIZED' }

  const r = await sendEmailViaResendServer({
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
    skipBranding: input.skipBranding === true,
    skipTracking: input.skipTracking === true,
  })
  if (!r.ok) {
    console.error('[sendAdminComposeEmailAction]', r.logMessage)
    return { ok: false, error: 'SEND_FAILED' }
  }
  return { ok: true }
}

/** Newsletter / campaign sends from admin (server verifies admin once per batch). */
export async function sendNewsletterBulkAction(
  items: Array<{ to: string; subject: string; html: string }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireSupabaseAdminUser()
  if (!admin) return { ok: false, error: 'UNAUTHORIZED' }
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'INVALID' }
  if (items.length > 2000) return { ok: false, error: 'TOO_MANY' }

  for (const it of items) {
    if (!it?.to || !it.subject || !it.html) continue
    const r = await sendEmailViaResendServer({ to: it.to, subject: it.subject, html: it.html })
    if (!r.ok) console.error('[sendNewsletterBulkAction]', it.to, r.logMessage)
  }
  return { ok: true }
}

/**
 * After Stripe Checkout + /api/stripe/complete: order row exists in Supabase. No admin session required.
 */
export async function sendStripeCheckoutEmailsAction(
  stripeSessionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = stripeSessionId?.trim()
  if (!sid) return { ok: false, error: 'INVALID_SESSION' }
  if (!isSupabaseConfigured()) return { ok: false, error: 'NO_DATABASE' }

  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('orders')
    .select('payload')
    .eq('stripe_checkout_session_id', sid)
    .maybeSingle()

  if (error) {
    console.error('[sendStripeCheckoutEmailsAction]', error.message)
    return { ok: false, error: 'LOAD_FAILED' }
  }

  const order = data?.payload ? normalizeLedgerOrder(data.payload as OrderRecord) : null
  if (!order?.customer?.email) {
    console.error('[sendStripeCheckoutEmailsAction] order missing after complete')
    return { ok: false, error: 'ORDER_NOT_FOUND' }
  }

  const to = order.customer.email.trim()
  const subj = buildOrderConfirmationEmailSubject(order.id)
  const html = buildOrderConfirmationEmailHtml(order)

  const c1 = await sendEmailViaResendServer({ to, subject: subj, html })
  if (!c1.ok) {
    console.error('[sendStripeCheckoutEmailsAction] confirmation', c1.logMessage)
    return { ok: false, error: 'SEND_FAILED' }
  }
  await markConfirmationSentInLedger(order.id)

  const rHtml = buildSimpleReceiptEmailHtml(order)
  const rSub = buildSimpleReceiptSubject(order.id)
  const pdf = receiptPdfAttachment(order)
  const c2 = await sendEmailViaResendServer({
    to,
    subject: rSub,
    html: rHtml,
    ...(pdf ? { attachments: [pdf] } : {}),
  })
  if (!c2.ok) {
    console.error('[sendStripeCheckoutEmailsAction] receipt', c2.logMessage)
    /* non-fatal */
  } else {
    await markReceiptSentInLedger(order.id)
  }

  return { ok: true }
}

/**
 * Legacy / non-ledger checkout: rate-limited guest sends (no admin cookie).
 */
export async function sendGuestCheckoutEmailsAction(
  orderJson: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIp()
  if (!guestRateAllowed(ip)) {
    console.warn('[sendGuestCheckoutEmailsAction] rate limited', ip)
    return { ok: false, error: 'RATE_LIMIT' }
  }

  const order = parseOrderRecordJson(orderJson)
  if (!order?.customer?.email) return { ok: false, error: 'INVALID_ORDER' }

  const to = order.customer.email.trim()
  const subj = buildOrderConfirmationEmailSubject(order.id)
  const html = buildOrderConfirmationEmailHtml(order)

  const c1 = await sendEmailViaResendServer({ to, subject: subj, html })
  if (!c1.ok) {
    console.error('[sendGuestCheckoutEmailsAction] confirmation', c1.logMessage)
    return { ok: false, error: 'SEND_FAILED' }
  }
  await markConfirmationSentInLedger(order.id)

  if (order.paymentMethod !== 'bank') {
    const rHtml = buildSimpleReceiptEmailHtml(order)
    const rSub = buildSimpleReceiptSubject(order.id)
    const pdf = receiptPdfAttachment(order)
    const c2 = await sendEmailViaResendServer({
      to,
      subject: rSub,
      html: rHtml,
      ...(pdf ? { attachments: [pdf] } : {}),
    })
    if (!c2.ok) {
      console.error('[sendGuestCheckoutEmailsAction] receipt', c2.logMessage)
    } else {
      await markReceiptSentInLedger(order.id)
    }
  }

  return { ok: true }
}

/**
 * Customer session: receipt email with HTML + PDF (same data as Stripe/guest server sends).
 * Rate-limited; used when the browser cannot run the admin html2pdf pipeline.
 */
export async function sendCustomerReceiptEmailAction(
  orderJson: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIp()
  if (!guestRateAllowed(ip)) {
    console.warn('[sendCustomerReceiptEmailAction] rate limited', ip)
    return { ok: false, error: 'RATE_LIMIT' }
  }

  const order = parseOrderRecordJson(orderJson)
  if (!order?.customer?.email) return { ok: false, error: 'INVALID_ORDER' }
  if (order.paymentMethod === 'bank') {
    return { ok: false, error: 'BANK_USE_ADMIN' }
  }

  const to = order.customer.email.trim()
  const pdf = receiptPdfAttachment(order)
  const r = await sendEmailViaResendServer({
    to,
    subject: buildSimpleReceiptSubject(order.id),
    html: buildSimpleReceiptEmailHtml(order),
    ...(pdf ? { attachments: [pdf] } : {}),
  })
  if (!r.ok) {
    console.error('[sendCustomerReceiptEmailAction]', r.logMessage)
    return { ok: false, error: 'SEND_FAILED' }
  }
  await markReceiptSentInLedger(order.id)
  return { ok: true }
}

/** Admin resend confirmation/receipt for an order id (loads from Supabase ledger). */
export async function sendAdminOrderEmailAction(input: {
  orderId: string
  kind: 'confirmation' | 'receipt' | 'both'
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireSupabaseAdminUser()
  if (!admin) return { ok: false, error: 'UNAUTHORIZED' }

  const order = await loadOrderFromSupabaseById(input.orderId)
  if (!order?.customer?.email) {
    console.error('[sendAdminOrderEmailAction] order not in ledger', input.orderId)
    return { ok: false, error: 'NOT_FOUND' }
  }

  const to = order.customer.email.trim()

  if (input.kind === 'confirmation' || input.kind === 'both') {
    const r = await sendEmailViaResendServer({
      to,
      subject: buildOrderConfirmationEmailSubject(order.id),
      html: buildOrderConfirmationEmailHtml(order),
    })
    if (!r.ok) {
      console.error('[sendAdminOrderEmailAction] confirmation', r.logMessage)
      return { ok: false, error: 'SEND_FAILED' }
    }
    await markConfirmationSentInLedger(order.id)
  }

  if (input.kind === 'receipt' || input.kind === 'both') {
    const pdf = receiptPdfAttachment(order)
    const r = await sendEmailViaResendServer({
      to,
      subject: buildSimpleReceiptSubject(order.id),
      html: buildSimpleReceiptEmailHtml(order),
      ...(pdf ? { attachments: [pdf] } : {}),
    })
    if (!r.ok) {
      console.error('[sendAdminOrderEmailAction] receipt', r.logMessage)
      return { ok: false, error: 'SEND_FAILED' }
    }
    await markReceiptSentInLedger(order.id)
  }

  return { ok: true }
}

export async function sendAdminShippingNotificationEmailAction(input: {
  orderId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireSupabaseAdminUser()
  if (!admin) return { ok: false, error: 'UNAUTHORIZED' }

  const order = await loadOrderFromSupabaseById(input.orderId)
  if (!order?.customer?.email) return { ok: false, error: 'NOT_FOUND' }
  if (!order.tracking?.number) return { ok: false, error: 'NO_TRACKING' }

  const tracking = order.tracking
  const estimated = tracking.estimatedDelivery
    ? new Date(tracking.estimatedDelivery).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Please check tracking status'

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:640px">
    <h1 style="font-size:20px">Shipping Notification</h1>
    <p>Your order <strong>${order.id}</strong> is on its way.</p>
    <p><strong>Tracking Number:</strong> ${tracking.number}</p>
    <p><strong>Shipping Provider:</strong> ${tracking.provider || 'Carrier'}</p>
    <p><strong>Estimated Delivery:</strong> ${estimated}</p>
    <p><a href="${shippingTrackUrl(tracking.provider, tracking.number)}">Track your shipment</a></p>
  </div>`

  const pdf = shippingNotificationPdfAttachment(order)
  const r = await sendEmailViaResendServer({
    to: order.customer.email.trim(),
    subject: `Shipping Notification - Order #${order.id}`,
    html,
    ...(pdf ? { attachments: [pdf] } : {}),
  })
  if (!r.ok) {
    console.error('[sendAdminShippingNotificationEmailAction]', r.logMessage)
    return { ok: false, error: 'SEND_FAILED' }
  }
  return { ok: true }
}
