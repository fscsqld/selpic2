import { NextResponse } from 'next/server'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import type { OrderRecord } from '@/lib/store'
import { getStripe } from '@/lib/stripe'
import { orderDraftToMetadataChunks } from '@/lib/stripeCheckoutMetadata'
import { readCatalogProducts } from '@/lib/server/catalogStore'
import { getStorefrontLinePriceBreakdown } from '@/lib/storefrontLinePrice'
import { isValidAuPhone } from '@/lib/phone'
import type Stripe from 'stripe'

type OrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

function audCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100)
}

function normalizeSiteOriginFromEnv(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required for Stripe Checkout redirects.')
  }
  const parsed = new URL(raw)
  return `${parsed.protocol}//${parsed.host}`
}

async function validateTotalsAndBuildLineItems(orderDraft: OrderDraft): Promise<{
  line_items: Stripe.Checkout.SessionCreateParams.LineItem[]
  discountCents: number
  sanitizedOrderDraft: OrderDraft
}> {
  const catalogProducts = await readCatalogProducts()
  const catalogById = new Map(catalogProducts.map((product) => [String(product.id), product]))
  let itemsSubtotalCents = 0
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = []
  const sanitizedItems: OrderDraft['items'] = []

  for (const item of orderDraft.items || []) {
    const productId = String(item?.productId || '').trim()
    if (!productId) {
      throw new Error('Invalid order item: missing product id.')
    }
    const catalogProduct = catalogById.get(productId)
    if (!catalogProduct) {
      throw new Error(`Product not found in catalog: ${productId}`)
    }
    const qty = Math.max(1, Math.floor(item.quantity || 1))
    const baseUnitPrice = Number(catalogProduct.price)
    if (!Number.isFinite(baseUnitPrice) || baseUnitPrice < 0) {
      throw new Error(`Invalid catalog price for product: ${productId}`)
    }
    const { unitPrice, baseUnitPrice: resolvedBase, customizationSurchargePerUnit: surchargePerUnit } =
      getStorefrontLinePriceBreakdown(catalogProduct, item.customizations)
    const unitCents = audCents(unitPrice)
    itemsSubtotalCents += unitCents * qty
    const name = (catalogProduct.name || item.name || 'Item').slice(0, 120)
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
    sanitizedItems.push({
      ...item,
      productId,
      name: catalogProduct.name || item.name,
      image: catalogProduct.image || item.image,
      price: unitPrice,
      baseUnitPrice: Number(resolvedBase.toFixed(2)),
      customizationSurchargePerUnit: Number(surchargePerUnit.toFixed(2)),
      quantity: qty,
      category: (catalogProduct as any).category ?? item.category,
      subcategory: (catalogProduct as any).subcategory ?? item.subcategory,
      brand: (catalogProduct as any).brand ?? item.brand,
      size: (catalogProduct as any).size ?? item.size,
      color: (catalogProduct as any).color ?? item.color,
      type: (catalogProduct as any).type ?? item.type,
      spfLevel: (catalogProduct as any).spfLevel ?? item.spfLevel,
      isNew: (catalogProduct as any).isNew ?? item.isNew,
      isBestSeller: (catalogProduct as any).isBestSeller ?? item.isBestSeller,
      isPopular: (catalogProduct as any).isPopular ?? item.isPopular,
      inStock: (catalogProduct as any).inStock ?? item.inStock,
      features: (catalogProduct as any).features ?? item.features,
      bundleItems: (catalogProduct as any).bundleItems ?? item.bundleItems,
      isBundle: (catalogProduct as any).isBundle ?? item.isBundle,
    })
  }

  const shipCents = Math.max(0, audCents(orderDraft.shippingPrice))
  if (shipCents > 0) {
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
  }

  const fee = Math.max(0, Number(orderDraft.paymentFee) || 0)
  if (fee > 0) {
    const feeCents = audCents(fee)
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

  const discountCents = Math.max(0, audCents(orderDraft.discount ?? 0))
  const feeCents = audCents(fee)
  const grossTotalCents = itemsSubtotalCents + shipCents + feeCents
  if (discountCents > grossTotalCents) {
    throw new Error('Invalid discount amount for checkout.')
  }
  const expectedTotalCents = grossTotalCents - discountCents
  const draftTotalCents = Math.max(0, audCents(orderDraft.total))

  if (Math.abs(expectedTotalCents - draftTotalCents) > 1) {
    throw new Error('Order total does not match line items and discounts.')
  }

  const sanitizedOrderDraft: OrderDraft = {
    ...orderDraft,
    items: sanitizedItems,
    subtotal: Number((itemsSubtotalCents / 100).toFixed(2)),
    shippingPrice: Number((shipCents / 100).toFixed(2)),
    paymentFee: fee > 0 ? Number(fee.toFixed(2)) : 0,
    discount: Number((discountCents / 100).toFixed(2)),
    total: Number((expectedTotalCents / 100).toFixed(2)),
    paymentMethod: 'stripe',
    paymentMethodName: 'Stripe Checkout',
  }

  return { line_items, discountCents, sanitizedOrderDraft }
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

    const { line_items, discountCents, sanitizedOrderDraft } = await validateTotalsAndBuildLineItems(orderDraft)

    if (!isValidAuPhone(sanitizedOrderDraft.customer?.phone)) {
      return NextResponse.json(
        { error: 'Please enter a valid Australian phone number (e.g. +61 412 345 678).' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const origin = normalizeSiteOriginFromEnv()

    // Privacy-minimal / guest checkout:
    // - Do NOT create Stripe Customers
    // - Do NOT collect billing/shipping addresses in Stripe Checkout
    // - Only prefill email if available
    // - Store lightweight identifiers in metadata for dashboard visibility
    const email = sanitizedOrderDraft.customer?.email?.trim()
    const phone = sanitizedOrderDraft.customer?.phone?.trim()
    const addr = sanitizedOrderDraft.address
    const addrSingleLine =
      (addr?.asSingleLine || '').trim() ||
      [addr?.streetAddress, addr?.suburb, addr?.state, addr?.postcode, addr?.country]
        .filter(Boolean)
        .join(', ')
        .trim()

    const metadata = {
      ...orderDraftToMetadataChunks(sanitizedOrderDraft),
      ...(email ? { selpic_email: email.slice(0, 200) } : {}),
      ...(phone ? { selpic_phone: phone.slice(0, 60) } : {}),
      ...(addrSingleLine ? { selpic_address: addrSingleLine.slice(0, 450) } : {}),
      ...(sanitizedOrderDraft.shippingOptionId ? { selpic_shipping: String(sanitizedOrderDraft.shippingOptionId).slice(0, 80) } : {}),
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      // Keep Checkout deterministic: disable BNPL wallets (e.g. Zip) by allowing card only.
      payment_method_types: ['card'],
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
