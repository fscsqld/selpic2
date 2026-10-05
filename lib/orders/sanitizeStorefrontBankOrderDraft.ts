import type { OrderRecord } from '@/lib/store'
import { readCatalogProducts } from '@/lib/server/catalogStore'
import { getStorefrontLinePriceBreakdown } from '@/lib/storefrontLinePrice'
import { isValidAuPhone } from '@/lib/phone'
import { applyServerShippingToDraft } from '@/lib/orders/applyServerShippingToDraft'
import { applyServerCheckoutMoney } from '@/lib/orders/applyServerCheckoutMoney'
import { readCmsCheckoutPricingConfig } from '@/lib/server/cmsCheckoutPricingConfig'
import { resolveStorefrontVipGradeFromOrders } from '@/lib/server/resolveStorefrontVipGrade'
import {
  assertMarketSCatalogAllowsPurchase,
  buildOrderItemPreorderSnapshot,
  orderHasPreorderItems,
} from '@/lib/marketSPreorder'

export type BankOrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

function audCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100)
}

/**
 * Server-side validation for bank-transfer orders: prices from live catalog.
 * @param sessionEmail Storefront signed-in email; admin manual may omit (falls back to draft customer email).
 */
export async function sanitizeStorefrontBankOrderDraft(
  orderDraft: BankOrderDraft,
  sessionEmail?: string
): Promise<BankOrderDraft> {
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

    assertMarketSCatalogAllowsPurchase(
      {
        ...(catalogProduct as Parameters<typeof assertMarketSCatalogAllowsPurchase>[0]),
        name: catalogProduct.name || item.name,
      },
      qty
    )
    const preorderSnap = buildOrderItemPreorderSnapshot(catalogProduct)

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
      isHotGoods: Boolean(
        (catalogProduct as { isHotGoods?: boolean }).isHotGoods ?? item.isHotGoods
      ),
      shippingClass: (
        catalogProduct as { shippingClass?: 'letter' | 'parcel' }
      ).shippingClass,
      shippingWeightGrams: (
        catalogProduct as { shippingWeightGrams?: number }
      ).shippingWeightGrams,
      shippingThicknessMm: (
        catalogProduct as { shippingThicknessMm?: number }
      ).shippingThicknessMm,
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
      salesModeAtOrder: preorderSnap.salesModeAtOrder,
      preorderShipsFrom: preorderSnap.preorderShipsFrom,
    })
  }

  const cms = await readCmsCheckoutPricingConfig()
  const emailForMoney = String(sessionEmail || orderDraft.customer?.email || '')
    .trim()
    .toLowerCase()
  const { gradeCode } = emailForMoney
    ? await resolveStorefrontVipGradeFromOrders({
        email: emailForMoney,
        phone: orderDraft.customer?.phone,
        gradeConfigs: cms.vipGradeConfigs,
      })
    : { gradeCode: Number(orderDraft.vipGradeCode) || 0 }

  const withCatalog: BankOrderDraft = {
    ...orderDraft,
    items: sanitizedItems,
    subtotal: Number((itemsSubtotalCents / 100).toFixed(2)),
    vipGradeCode: gradeCode,
  }
  const shippingValidated = await applyServerShippingToDraft(withCatalog)
  const moneyValidated = emailForMoney
    ? await applyServerCheckoutMoney({
        orderDraft: shippingValidated,
        sessionEmail: emailForMoney,
        paymentType: orderDraft.paymentMethod === 'stripe' ? 'stripe' : 'bank',
      })
    : shippingValidated

  const shippingCents = Math.max(0, audCents(moneyValidated.shippingPrice))
  const feeCents = Math.max(0, audCents(moneyValidated.paymentFee || 0))
  const discountCents = Math.max(0, audCents(moneyValidated.discount || 0))
  const grossCents = itemsSubtotalCents + shippingCents + feeCents

  if (discountCents > grossCents) {
    throw new Error('Invalid discount amount for order.')
  }

  const expectedTotalCents = grossCents - discountCents
  const draftTotalCents = Math.max(0, audCents(moneyValidated.total))
  if (Math.abs(expectedTotalCents - draftTotalCents) > 1) {
    throw new Error('Order total does not match items and discounts.')
  }

  return {
    ...moneyValidated,
    items: sanitizedItems,
    hasPreorderItems: orderHasPreorderItems(sanitizedItems),
    subtotal: Number((itemsSubtotalCents / 100).toFixed(2)),
    shippingPrice: Number((shippingCents / 100).toFixed(2)),
    paymentFee: Number((feeCents / 100).toFixed(2)),
    discount: Number((discountCents / 100).toFixed(2)),
    total: Number((expectedTotalCents / 100).toFixed(2)),
    paymentMethod: 'bank',
    paymentMethodName: moneyValidated.paymentMethodName || 'Bank Transfer',
    status: 'pending',
  }
}
