import { NextResponse } from 'next/server'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import type { OrderRecord } from '@/lib/store'
import { getStripe } from '@/lib/stripe'
import { orderDraftToMetadataChunks } from '@/lib/stripeCheckoutMetadata'
import type Stripe from 'stripe'

type OrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

function audCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100)
}

function validateTotalsAndBuildLineItems(orderDraft: OrderDraft): {
  line_items: Stripe.Checkout.SessionCreateParams.LineItem[]
  discountCents: number
} {
  let sumCents = 0
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = []

  for (const item of orderDraft.items || []) {
    const qty = Math.max(1, Math.floor(item.quantity || 1))
    const unitCents = audCents(item.price)
    sumCents += unitCents * qty
    const name = (item.name || 'Item').slice(0, 120)
    line_items.push({
      quantity: qty,
      price_data: {
        currency: 'aud',
        unit_amount: unitCents,
        product_data: {
          name,
        },
      },
    })
  }

  const shipCents = audCents(orderDraft.shippingPrice)
  sumCents += shipCents
  line_items.push({
    quantity: 1,
    price_data: {
      currency: 'aud',
      unit_amount: shipCents,
      product_data: {
        name: (orderDraft.shippingOptionName || 'Shipping').slice(0, 120),
      },
    },
  })

  const fee = orderDraft.paymentFee ?? 0
  if (fee > 0) {
    const feeCents = audCents(fee)
    sumCents += feeCents
    line_items.push({
      quantity: 1,
      price_data: {
        currency: 'aud',
        unit_amount: feeCents,
        product_data: {
          name: 'Payment fee',
        },
      },
    })
  }

  const discountCents = audCents(orderDraft.discount ?? 0)
  const expectedTotalCents = sumCents - discountCents
  const draftTotalCents = audCents(orderDraft.total)

  if (Math.abs(expectedTotalCents - draftTotalCents) > 1) {
    throw new Error('Order total does not match line items and discounts.')
  }

  return { line_items, discountCents }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const orderDraft = body?.orderDraft as OrderDraft | undefined
    if (!orderDraft || typeof orderDraft !== 'object') {
      return NextResponse.json({ error: 'Invalid order draft' }, { status: 400 })
    }

    // Basic debug logging (no sensitive data) to trace checkout calls
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    const keyPrefix = stripeKey ? stripeKey.slice(0, 8) : '(missing)'
    console.log('[stripe/checkout] incoming orderDraft summary:', {
      total: orderDraft.total,
      currency: 'aud',
      itemsCount: Array.isArray(orderDraft.items) ? orderDraft.items.length : 0,
      email: orderDraft.customer?.email || '(none)',
      shippingOptionId: orderDraft.shippingOptionId,
      env: process.env.NODE_ENV,
      stripeKeyPrefix: keyPrefix,
    })

    const { line_items, discountCents } = validateTotalsAndBuildLineItems(orderDraft)
    const stripe = getStripe()

    const originHeader = req.headers.get('origin')
    const referer = req.headers.get('referer')
    let fromReferer: string | null = null
    if (referer) {
      try {
        const u = new URL(referer)
        fromReferer = `${u.protocol}//${u.host}`
      } catch {
        /* ignore */
      }
    }
    const origin =
      originHeader ||
      fromReferer ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:3000'

    // Privacy-minimal / guest checkout:
    // - Do NOT create Stripe Customers
    // - Do NOT collect billing/shipping addresses in Stripe Checkout
    // - Only prefill email if available
    // - Store lightweight identifiers in metadata for dashboard visibility
    const email = orderDraft.customer?.email?.trim()
    const phone = orderDraft.customer?.phone?.trim()
    const addr = orderDraft.address
    const addrSingleLine =
      (addr?.asSingleLine || '').trim() ||
      [addr?.streetAddress, addr?.suburb, addr?.state, addr?.postcode, addr?.country]
        .filter(Boolean)
        .join(', ')
        .trim()

    const metadata = {
      ...orderDraftToMetadataChunks(orderDraft),
      ...(email ? { selpic_email: email.slice(0, 200) } : {}),
      ...(phone ? { selpic_phone: phone.slice(0, 60) } : {}),
      ...(addrSingleLine ? { selpic_address: addrSingleLine.slice(0, 450) } : {}),
      ...(orderDraft.shippingOptionId ? { selpic_shipping: String(orderDraft.shippingOptionId).slice(0, 80) } : {}),
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items,
      success_url: `${origin.replace(/\/$/, '')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin.replace(/\/$/, '')}/cart`,
      // Guest checkout (no Customer object)
      customer_email: email || undefined,
      metadata,
    }

    if (discountCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: discountCents,
        currency: 'aud',
        duration: 'once',
        name: 'Order discount',
      })
      sessionParams.discounts = [{ coupon: coupon.id }]
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log('[stripe/checkout] created session:', {
      id: session.id,
      url: session.url,
      mode: session.mode,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
    })

    if (!session.url) {
      console.error('[stripe/checkout] missing session.url')
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    logAndSafeMessage('stripe/checkout', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
