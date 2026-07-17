import type { OrderRecord } from '@/lib/store'
import { readCatalogProducts } from '@/lib/server/catalogStore'
import { getStorefrontLinePriceBreakdown } from '@/lib/storefrontLinePrice'
import { isValidAuPhone } from '@/lib/phone'
import { applyServerShippingToDraft } from '@/lib/orders/applyServerShippingToDraft'

export type BankOrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

function audCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100)
}

/**
 * Server-side validation for bank-transfer storefront orders: prices and totals
 * are derived from the live catalog (same trust model as Stripe checkout validation).
 */
export async function sanitizeStorefrontBankOrderDraft(orderDraft: BankOrderDraft): Promise<BankOrderDraft> {
  if (!Array.isArray(orderDraft.items) || orderDraft.items.length === 0) {
    throw new Error('Order must include at least one item.')
  }

  if (!isValidAuPhone(orderDraft.customer?.phone)) {
    throw new Error('Please enter a valid Australian phone number (e.g. +61 412 345 678).')
  }

  const catalogProducts = await readCatalogProducts()
  const catalogById = new Map(catalogProducts.map((p) => [String(p.id), p]))

  const sanitizedItems: BankOrderDraft['items'] = []
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
    const { unitPrice, baseUnitPrice: resolvedBase, customizationSurchargePerUnit: surchargePerUnit } =
      getStorefrontLinePriceBreakdown(catalogProduct, item.customizations)
    const unitCents = audCents(unitPrice)
    itemsSubtotalCents += unitCents * qty

    sanitizedItems.push({
      ...item,
      productId,
      name: catalogProduct.name || item.name,
      image: catalogProduct.image || item.image,
      price: unitPrice,
      baseUnitPrice: Number(resolvedBase.toFixed(2)),
      customizationSurchargePerUnit: Number(surchargePerUnit.toFixed(2)),
      quantity: qty,
      category: (catalogProduct as { category?: string }).category ?? item.category,
      subcategory: (catalogProduct as { subcategory?: string }).subcategory ?? item.subcategory,
      shippingClass: (
        catalogProduct as { shippingClass?: 'letter' | 'parcel' }
      ).shippingClass,
      shippingWeightGrams: (
        catalogProduct as { shippingWeightGrams?: number }
      ).shippingWeightGrams,
      weightKg:
        Number((catalogProduct as { shippingWeightGrams?: number }).shippingWeightGrams) > 0
          ? Number(
              (
                Number(
                  (catalogProduct as { shippingWeightGrams?: number }).shippingWeightGrams
                ) / 1000
              ).toFixed(3)
            )
          : item.weightKg,
      brand: (catalogProduct as { brand?: string }).brand ?? item.brand,
      size: (catalogProduct as { size?: string }).size ?? item.size,
      color: (catalogProduct as { color?: string }).color ?? item.color,
      type: (catalogProduct as { type?: string }).type ?? item.type,
      spfLevel: (catalogProduct as { spfLevel?: string }).spfLevel ?? item.spfLevel,
      isNew: (catalogProduct as { isNew?: boolean }).isNew ?? item.isNew,
      isBestSeller: (catalogProduct as { isBestSeller?: boolean }).isBestSeller ?? item.isBestSeller,
      isPopular: (catalogProduct as { isPopular?: boolean }).isPopular ?? item.isPopular,
      inStock: (catalogProduct as { inStock?: boolean }).inStock ?? item.inStock,
      features: (catalogProduct as { features?: string[] }).features ?? item.features,
      bundleItems:
        (catalogProduct as { bundleItems?: BankOrderDraft['items'][0]['bundleItems'] }).bundleItems ??
        item.bundleItems,
      isBundle: (catalogProduct as { isBundle?: boolean }).isBundle ?? item.isBundle,
    })
  }

  const withCatalog: BankOrderDraft = {
    ...orderDraft,
    items: sanitizedItems,
    subtotal: Number((itemsSubtotalCents / 100).toFixed(2)),
  }
  const shippingValidated = await applyServerShippingToDraft(withCatalog)

  const shippingCents = Math.max(0, audCents(shippingValidated.shippingPrice))
  const feeCents = Math.max(0, audCents(shippingValidated.paymentFee || 0))
  const discountCents = Math.max(0, audCents(shippingValidated.discount || 0))
  const grossCents = itemsSubtotalCents + shippingCents + feeCents

  if (discountCents > grossCents) {
    throw new Error('Invalid discount amount for order.')
  }

  const expectedTotalCents = grossCents - discountCents
  const draftTotalCents = Math.max(0, audCents(shippingValidated.total))
  if (Math.abs(expectedTotalCents - draftTotalCents) > 1) {
    throw new Error('Order total does not match items and discounts.')
  }

  return {
    ...shippingValidated,
    items: sanitizedItems,
    subtotal: Number((itemsSubtotalCents / 100).toFixed(2)),
    shippingPrice: Number((shippingCents / 100).toFixed(2)),
    paymentFee: Number((feeCents / 100).toFixed(2)),
    discount: Number((discountCents / 100).toFixed(2)),
    total: Number((expectedTotalCents / 100).toFixed(2)),
    paymentMethod: 'bank',
    paymentMethodName: shippingValidated.paymentMethodName || 'Bank Transfer',
    status: 'pending',
  }
}
