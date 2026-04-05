import { NextResponse } from 'next/server'
import { persistVerifiedStripeSession } from '@/lib/orders/stripePaidOrder'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

/**
 * Called from /success after returning from Stripe Checkout.
 * Verifies payment with Stripe, persists order to Supabase (idempotent by session id).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { session_id?: string } | null
    const session_id = body?.session_id?.trim()
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const result = await persistVerifiedStripeSession(session_id)
    if (!result.ok) {
      logAndSafeMessage('stripe/complete persist', result.error)
      const status =
        result.status >= 400 && result.status < 600 ? result.status : 500
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status })
    }

    return NextResponse.json({ ok: true, order: result.order })
  } catch (e) {
    logAndSafeMessage('stripe/complete', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
