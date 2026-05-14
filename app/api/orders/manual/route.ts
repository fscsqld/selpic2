import { NextResponse } from 'next/server'
import type { OrderRecord } from '@/lib/store'
import { readCatalogProducts } from '@/lib/server/catalogStore'
import { getCustomizationSurchargePerUnit } from '@/lib/orderCustomizationSurcharge'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { buildOrdersTableUpdate } from '@/lib/orders/orderDbColumns'

type OrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

function audCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100)
}

async function sanitizeAndValidateManualOrderDraft(orderDraft: OrderDraft): Promise<OrderDraft> {
  if (!Array.isArray(orderDraft.items) || orderDraft.items.length === 0) {
    throw new Error('Order must include at least one item.')
  }

  const catalogProducts = await readCatalogProducts()
  const catalogById = new Map(catalogProducts.map((p) => [String(p.id), p]))

  const sanitizedItems: OrderDraft['items'] = []
  let itemsSubtotalCents = 0

  for (const item of orderDraft.items) {
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
    const surchargePerUnit = getCustomizationSurchargePerUnit(item.customizations, {
      size: (item.customizations?.size && String(item.customizations.size).trim()) || (catalogProduct as { size?: string }).size,
    })
    const unitPrice = Number((baseUnitPrice + surchargePerUnit).toFixed(2))
    const unitCents = audCents(unitPrice)
    itemsSubtotalCents += unitCents * qty

    sanitizedItems.push({
      ...item,
      productId,
      name: catalogProduct.name || item.name,
      image: catalogProduct.image || item.image,
      price: unitPrice,
      baseUnitPrice: Number(baseUnitPrice.toFixed(2)),
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

  const shippingCents = Math.max(0, audCents(orderDraft.shippingPrice))
  const feeCents = Math.max(0, audCents(orderDraft.paymentFee || 0))
  const discountCents = Math.max(0, audCents(orderDraft.discount || 0))
  const grossCents = itemsSubtotalCents + shippingCents + feeCents

  if (discountCents > grossCents) {
    throw new Error('Invalid discount amount for order.')
  }

  const expectedTotalCents = grossCents - discountCents
  const draftTotalCents = Math.max(0, audCents(orderDraft.total))
  if (Math.abs(expectedTotalCents - draftTotalCents) > 1) {
    throw new Error('Order total does not match items and discounts.')
  }

  const paymentMethod = orderDraft.paymentMethod === 'bank' ? 'bank' : 'bank'
  return {
    ...orderDraft,
    items: sanitizedItems,
    subtotal: Number((itemsSubtotalCents / 100).toFixed(2)),
    shippingPrice: Number((shippingCents / 100).toFixed(2)),
    paymentFee: Number((feeCents / 100).toFixed(2)),
    discount: Number((discountCents / 100).toFixed(2)),
    total: Number((expectedTotalCents / 100).toFixed(2)),
    paymentMethod,
    paymentMethodName: orderDraft.paymentMethodName || 'Bank Transfer',
    status: 'pending',
  }
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
    const body = await req.json().catch(() => ({}))
    const orderDraft = body?.orderDraft as OrderDraft | undefined
    if (!orderDraft || typeof orderDraft !== 'object') {
      return NextResponse.json({ error: 'Invalid order draft.' }, { status: 400 })
    }

    const sanitizedDraft = await sanitizeAndValidateManualOrderDraft(orderDraft)
    const id = `ORD-${Date.now().toString(36)}`
    const order: OrderRecord = {
      id,
      createdAtIso: new Date().toISOString(),
      ...sanitizedDraft,
      status: 'pending',
      paymentMethod: 'bank',
      paymentMethodName: sanitizedDraft.paymentMethodName || 'Bank Transfer',
      platformSource: 'website',
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
    logAndSafeMessage('orders/manual POST', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
