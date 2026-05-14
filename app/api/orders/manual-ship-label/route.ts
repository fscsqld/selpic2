import { NextResponse } from 'next/server'
import type { OrderRecord } from '@/lib/store'
import { DEFAULT_STANDARD_LETTER_WEIGHT_KG } from '@/lib/shipping/orderDeclaredWeightKg'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { buildOrdersTableUpdate } from '@/lib/orders/orderDbColumns'

const MAX_KG = 22

export type ManualShipLabelBody = {
  recipientName?: string
  email?: string
  phone?: string
  streetAddress?: string
  streetAddress2?: string
  suburb?: string
  state?: string
  postcode?: string
  country?: string
  /** Single line for the label “Items” row, e.g. “Custom stickers × 2”. */
  itemDescription?: string
  quantity?: number
  declaredWeightKg?: number
  /** Printed in the PERSONALIZATION block on the internal AusPost-style PDF. */
  labelNotes?: string
}

function buildAsSingleLine(a: {
  streetAddress: string
  streetAddress2: string
  suburb: string
  state: string
  postcode: string
  country: string
}): string {
  const line1 = [a.streetAddress, a.streetAddress2].filter((s) => s.trim()).join(', ')
  const line2 = [a.suburb, a.state, a.postcode, a.country].filter((s) => s.trim()).join(' ')
  return [line1, line2].filter(Boolean).join(' · ')
}

function isAustralia(country: string): boolean {
  const c = country.trim().toLowerCase()
  return !c || c === 'au' || c === 'aus' || c === 'australia'
}

export async function POST(req: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized — registry admin session required.' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Order database not configured.' }, { status: 503 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as ManualShipLabelBody

    const recipientName = String(body.recipientName || '').trim().slice(0, 120)
    const email = String(body.email || '').trim().slice(0, 254)
    const phone = String(body.phone || '').trim().slice(0, 40)

    const street = String(body.streetAddress || '').trim().slice(0, 200)
    const street2 = String(body.streetAddress2 || '').trim().slice(0, 200)
    const suburb = String(body.suburb || '').trim().slice(0, 120)
    const state = String(body.state || '').trim().slice(0, 32)
    const postcode = String(body.postcode || '').trim().slice(0, 20)
    const country = (String(body.country || '').trim() || 'Australia').slice(0, 80)

    const itemDescription = String(body.itemDescription || '').trim().slice(0, 300)
    const qty = Math.max(1, Math.min(999, Math.floor(Number(body.quantity) || 1)))
    const labelNotes = String(body.labelNotes || '').trim().slice(0, 2000)

    let w = Number(body.declaredWeightKg)
    if (!Number.isFinite(w) || w <= 0) {
      w = DEFAULT_STANDARD_LETTER_WEIGHT_KG
    }
    w = Math.min(MAX_KG, Math.round(w * 1000) / 1000)

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid customer email.' }, { status: 400 })
    }
    if (!street || !suburb || !state || !postcode) {
      return NextResponse.json(
        { error: 'Street, suburb, state, and postcode are required for Australia Post addressing.' },
        { status: 400 }
      )
    }
    if (!itemDescription) {
      return NextResponse.json({ error: 'Describe what is in the parcel (contents line for the label).' }, { status: 400 })
    }

    if (isAustralia(country) && !/^\d{4}$/.test(postcode)) {
      return NextResponse.json(
        { error: 'Australian addresses need a 4-digit postcode for domestic labels.' },
        { status: 400 }
      )
    }

    const displayName = recipientName || email.split('@')[0] || 'Customer'
    const asSingle = buildAsSingleLine({ streetAddress: street, streetAddress2: street2, suburb, state, postcode, country })

    const id = `ORD-${Date.now().toString(36)}`
    const now = new Date().toISOString()
    const performedBy = (admin.email || admin.user_metadata?.full_name || admin.id || 'admin').slice(0, 120)

    const order: OrderRecord = {
      id,
      createdAtIso: now,
      platformSource: 'website',
      externalOrderKey: `manual-ship:${id}`,
      customer: {
        name: displayName,
        email,
        phone: phone || '—',
      },
      address: {
        streetAddress: [street, street2].filter(Boolean).join(', '),
        suburb,
        state,
        postcode,
        country,
        asSingleLine: asSingle,
      },
      items: [
        {
          productId: 'manual-ship-label',
          name: itemDescription,
          price: 0,
          quantity: qty,
          image: '',
          customizations: {},
          buyerPersonalization: labelNotes || undefined,
        },
      ],
      subtotal: 0,
      shippingPrice: 0,
      discount: 0,
      paymentFee: 0,
      total: 0,
      shippingOptionId: 'manual-ship-label',
      shippingOptionName: 'Manual ship label (counter / AusPost-style PDF)',
      paymentMethod: 'bank',
      paymentMethodName: 'Manual label (not a storefront checkout)',
      status: 'processing',
      declaredShippingWeightKg: w,
      auditLog: [
        {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          timestamp: now,
          action: 'shipping_updated' as const,
          performedBy,
          description: 'Quick ship label order created for internal PDF / counter posting.',
        },
      ],
    }

    const sb = getSupabaseAdmin()
    const { error } = await sb.from('orders').insert({
      id: order.id,
      ...buildOrdersTableUpdate(order),
    })
    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true, order })
  } catch (e) {
    logAndSafeMessage('orders/manual-ship-label POST', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
