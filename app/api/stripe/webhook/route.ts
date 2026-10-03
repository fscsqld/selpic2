import { after, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { persistVerifiedStripeSession } from '@/lib/orders/stripePaidOrder'
import { classifyStripeWebhookPersistFailure } from '@/lib/orders/stripeWebhookResponse'
import { notifyAdminsOfNewOrder } from '@/lib/server/adminInboundNotify'
import type Stripe from 'stripe'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

export const runtime = 'nodejs'

/**
 * Live endpoint: https://selpic.com.au/api/stripe/webhook
 * Must use raw body (`req.text()`) for `constructEvent`. Success → 200 `{ received: true }`.
 * Permanent persist 4xx → still 200 (logged) so Stripe does not retry-storm.
 * Transient 5xx/503 → non-2xx so Stripe retries. Admin notify runs in `after()` on new inserts.
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    if (!secret) {
      console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }

    const buf = await req.text()
    const sig = req.headers.get('stripe-signature')
    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(buf, sig, secret)
    } catch (err) {
      console.error('[stripe/webhook] signature verify failed', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'payment') {
        return NextResponse.json({ received: true, ignored: 'mode' })
      }
      const sessionId = session.id
      if (!sessionId) {
        return NextResponse.json({ received: true, ignored: 'no session id' })
      }

      const result = await persistVerifiedStripeSession(sessionId, { notifyAdmins: false })
      if (!result.ok) {
        logAndSafeMessage(`stripe/webhook persist session=${sessionId}`, result.error)
        const action = classifyStripeWebhookPersistFailure(result.status, result.error)
        if (action === 'retry') {
          const status =
            result.status >= 400 && result.status < 600 ? result.status : 500
          return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status })
        }
        // Permanent client error: ACK so Stripe stops retrying; order path may still heal via /success.
        return NextResponse.json({ received: true, persistFailed: true })
      }

      console.log(
        '[stripe/webhook] order persisted',
        result.order.id,
        sessionId,
        result.created ? 'created' : 'idempotent'
      )

      if (result.created) {
        const order = result.order
        after(async () => {
          try {
            const notifyResult = await notifyAdminsOfNewOrder(order)
            if (!notifyResult?.ok) {
              console.warn(
                '[stripe/webhook] admin notify failed:',
                notifyResult?.logMessage
              )
            }
          } catch (err) {
            console.warn(
              '[stripe/webhook] admin notify threw:',
              err instanceof Error ? err.message : err
            )
          }
        })
      }
    }

    // Unhandled event types (e.g. invoice.paid): ACK — we only persist Checkout payment sessions.
    return NextResponse.json({ received: true })
  } catch (e) {
    logAndSafeMessage('stripe/webhook', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
