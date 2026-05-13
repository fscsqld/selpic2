import type { OrderPlatformSource } from '@/lib/store'
import type { MarketplaceOrderAdapter } from '@/lib/orderSources/types'
import { EtsyOrderAdapter } from '@/lib/orderSources/etsy/EtsyOrderAdapter'

const registry: Partial<Record<OrderPlatformSource, MarketplaceOrderAdapter>> = {
  etsy: new EtsyOrderAdapter(),
}

export function getMarketplaceOrderAdapter(platform: OrderPlatformSource): MarketplaceOrderAdapter | null {
  return registry[platform] ?? null
}

export function registerMarketplaceOrderAdapter(adapter: MarketplaceOrderAdapter): void {
  registry[adapter.platform] = adapter
}
