import { NextResponse } from 'next/server'
import type { OrderRecord } from '@/lib/store'
import { getStripe } from '@/lib/stripe'
import { parseOrderDraftFromMetadata } from '@/lib/stripeCheckoutMetadata'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

type OrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const session_id = searchParams.get('session_id')
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== 'paid') {
      console.warn('[stripe/verify] payment_status not paid')
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 400 })
    }

    const orderDraft = parseOrderDraftFromMetadata(
      session.metadata as Record<string, string | undefined>
    ) as OrderDraft | null

    if (!orderDraft) {
      console.warn('[stripe/verify] metadata parse failed')
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 400 })
    }

    const paidCents = session.amount_total ?? 0
    const expectedCents = Math.round(orderDraft.total * 100)
    if (Math.abs(paidCents - expectedCents) > 1) {
      console.warn('[stripe/verify] amount mismatch')
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 400 })
    }

    return NextResponse.json({ ok: true, orderDraft })
  } catch (e) {
    logAndSafeMessage('stripe/verify', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
