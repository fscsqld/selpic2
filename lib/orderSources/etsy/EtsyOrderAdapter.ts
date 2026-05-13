import type { MarketplaceOrderAdapter, NormalizedMarketplaceOrder } from '@/lib/orderSources/types'
import type { OrderRecord } from '@/lib/store'
import { mapEtsyReceiptEnvelopeToNormalized } from '@/lib/orderSources/etsy/mapEtsyReceiptToOrderRecord'

export class EtsyOrderAdapter implements MarketplaceOrderAdapter {
  readonly platform = 'etsy' as const

  mapRemoteToNormalized(remote: unknown): NormalizedMarketplaceOrder {
    return mapEtsyReceiptEnvelopeToNormalized(remote)
  }

  toOrderRecord(n: NormalizedMarketplaceOrder): OrderRecord {
    const rid = n.integration?.etsy?.receiptId
    const shopId = n.integration?.etsy?.shopId
    if (!rid || !shopId) throw new Error('Etsy normalized order missing integration.etsy ids')

    const items: OrderRecord['items'] = n.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      price: Number(it.unitPrice.toFixed(2)),
      image: it.image ?? '',
      quantity: it.quantity,
      customizations: it.customizations ?? {},
      buyerPersonalization: it.buyerPersonalization,
      personalizationResponses: it.personalizationResponses,
    }))

    return {
      id: `ORD-ETSY-${rid}`,
      createdAtIso: n.createdAtIso,
      platformSource: 'etsy',
      externalOrderKey: n.externalOrderKey,
      marketplaceSource: {
        etsyReceiptId: rid,
        etsyShopId: shopId,
        lastImportedAtIso: new Date().toISOString(),
      },
      items,
      subtotal: n.subtotal,
      shippingPrice: n.shippingPrice,
      total: n.total,
      shippingOptionId: n.shippingOptionId,
      shippingOptionName: n.shippingOptionName,
      paymentMethod: 'marketplace',
      paymentMethodName: n.paymentMethodName,
      status: n.status,
      customer: {
        name: n.customer.name,
        firstName: n.customer.firstName,
        lastName: n.customer.lastName,
        email: n.customer.email,
        phone: n.customer.phone,
      },
      address: n.address,
    }
  }
}
