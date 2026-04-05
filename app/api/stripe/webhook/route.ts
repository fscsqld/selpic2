import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { persistVerifiedStripeSession } from '@/lib/orders/stripePaidOrder'
import type Stripe from 'stripe'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

export const runtime = 'nodejs'

export async function POST(req: Request) {
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
    const result = await persistVerifiedStripeSession(sessionId)
    if (!result.ok) {
      logAndSafeMessage(`stripe/webhook persist session=${sessionId}`, result.error)
      const status =
        result.status >= 400 && result.status < 600 ? result.status : 500
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status })
    }
    console.log('[stripe/webhook] order persisted', result.order.id, sessionId)
  }

  return NextResponse.json({ received: true })
}
