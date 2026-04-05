import { getStripe } from '@/lib/stripe'
import { parseOrderDraftFromMetadata } from '@/lib/stripeCheckoutMetadata'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import type Stripe from 'stripe'
import type { OrderRecord } from '@/lib/store'

type OrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

export function isStripePaidOrderConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export async function verifyStripeCheckoutSessionPaid(sessionId: string): Promise<
  | { ok: true; session: Stripe.Checkout.Session; orderDraft: OrderDraft }
  | { ok: false; error: string; status: number }
> {
  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') {
      return { ok: false, error: 'Payment not completed', status: 400 }
    }
    const orderDraft = parseOrderDraftFromMetadata(session.metadata as Record<string, string | undefined>)
    if (!orderDraft) {
      return { ok: false, error: 'Could not restore order from payment session', status: 400 }
    }
    const paidCents = session.amount_total ?? 0
    const expectedCents = Math.round(orderDraft.total * 100)
    if (Math.abs(paidCents - expectedCents) > 1) {
      return { ok: false, error: 'Paid amount does not match order total', status: 400 }
    }
    return { ok: true, session, orderDraft }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Verification failed'
    return { ok: false, error: message, status: 500 }
  }
}

/** Stripe Checkout session is verified paid before persistence — ledger must show paid, not pending. */
export function normalizeLedgerOrder(order: OrderRecord): OrderRecord {
  if (!order.stripeCheckoutSessionId) return order
  return {
    ...order,
    status: 'paid',
    paymentMethod: 'stripe',
  }
}

export function draftToPersistedOrder(orderDraft: OrderDraft, stripeCheckoutSessionId: string): OrderRecord {
  const id = `ORD-${Date.now().toString(36)}`
  const base: OrderRecord = {
    id,
    createdAtIso: new Date().toISOString(),
    ...orderDraft,
    stripeCheckoutSessionId,
  }
  return normalizeLedgerOrder(base)
}

/** Idempotent: same Stripe session always maps to one row / one order payload. */
export async function upsertStripePaidOrderRow(stripeCheckoutSessionId: string, order: OrderRecord): Promise<OrderRecord> {
  const sb = getSupabaseAdmin()
  const { data: existing, error: selErr } = await sb
    .from('orders')
    .select('id,payload')
    .eq('stripe_checkout_session_id', stripeCheckoutSessionId)
    .maybeSingle()

  if (selErr) {
    throw new Error(selErr.message)
  }
  if (existing?.payload) {
    return normalizeLedgerOrder(existing.payload as OrderRecord)
  }

  const { error: insErr } = await sb.from('orders').insert({
    id: order.id,
    stripe_checkout_session_id: stripeCheckoutSessionId,
    payload: order,
  })

  if (insErr) {
    const { data: race } = await sb
      .from('orders')
      .select('payload')
      .eq('stripe_checkout_session_id', stripeCheckoutSessionId)
      .maybeSingle()
    if (race?.payload) return normalizeLedgerOrder(race.payload as OrderRecord)
    throw new Error(insErr.message)
  }

  return normalizeLedgerOrder(order)
}

export async function persistVerifiedStripeSession(sessionId: string): Promise<
  | { ok: true; order: OrderRecord }
  | { ok: false; error: string; status: number }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Order database not configured (Supabase).', status: 503 }
  }
  const v = await verifyStripeCheckoutSessionPaid(sessionId)
  if (!v.ok) {
    return { ok: false, error: v.error, status: v.status }
  }
  try {
    const order = draftToPersistedOrder(v.orderDraft, sessionId)
    const saved = await upsertStripePaidOrderRow(sessionId, order)
    return { ok: true, order: saved }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to save order'
    return { ok: false, error: message, status: 500 }
  }
}
