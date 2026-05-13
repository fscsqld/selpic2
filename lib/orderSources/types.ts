import type { OrderPlatformSource, OrderRecord } from '@/lib/store'

/** Canonical shape all marketplace adapters produce before persistence. */
export type NormalizedMarketplaceAddress = {
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  country: string
  asSingleLine: string
}

export type NormalizedMarketplaceCustomer = {
  name: string
  firstName?: string
  lastName?: string
  email: string
  phone: string
}

export type NormalizedMarketplaceLineItem = {
  externalLineId?: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
  image?: string
  buyerPersonalization?: string
  personalizationResponses?: Array<{ label: string; value: string; promptId?: string }>
  customizations?: Record<string, string>
}

export type NormalizedMarketplaceOrder = {
  platform: OrderPlatformSource
  externalOrderKey: string
  createdAtIso: string
  customer: NormalizedMarketplaceCustomer
  address: NormalizedMarketplaceAddress
  items: NormalizedMarketplaceLineItem[]
  subtotal: number
  shippingPrice: number
  total: number
  shippingOptionId: string
  shippingOptionName?: string
  paymentMethodName: string
  status: OrderRecord['status']
  /** Platform-specific ids for re-sync / admin UI. */
  integration?: {
    etsy?: { receiptId: number; shopId: number }
  }
  raw?: Record<string, unknown>
}

export interface MarketplaceOrderAdapter {
  readonly platform: OrderPlatformSource
  /** Map remote payload (JSON) into normalized order; throw if invalid. */
  mapRemoteToNormalized(remote: unknown): NormalizedMarketplaceOrder
  /** Build persisted `OrderRecord` (stable id, platform fields, etc.). */
  toOrderRecord(normalized: NormalizedMarketplaceOrder): OrderRecord
}
