import type { Product } from '@/lib/store'

/** Row stored in catalog JSON / site_configs — full storefront product + sync timestamp */
export type CatalogProductRecord = Product & { updatedAt: string }
