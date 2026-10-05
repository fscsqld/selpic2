import type { OrderRecord } from '@/lib/store'
import {
  applyPreorderSoldIncrements,
  collectPreorderSoldIncrements,
} from '@/lib/marketSPreorder'
import { readCatalogSnapshot, writeCatalogFile } from '@/lib/server/catalogStore'

/**
 * After a new order is persisted, bump Market S `preorderSoldCount` for frozen
 * pre-order lines so optional max caps close automatically.
 *
 * Fail-open: never throw into checkout — order insert already succeeded.
 * Does not decrement on cancel (admin can edit sold count manually).
 */
export async function incrementMarketSPreorderSoldFromOrder(
  order: Pick<OrderRecord, 'items'> | null | undefined
): Promise<{ ok: boolean; applied: Record<string, number>; error?: string }> {
  const increments = collectPreorderSoldIncrements(order?.items)
  if (Object.keys(increments).length === 0) {
    return { ok: true, applied: {} }
  }

  try {
    const snapshot = await readCatalogSnapshot()
    const { products, changed, applied } = applyPreorderSoldIncrements(
      snapshot.products,
      increments
    )
    if (!changed) {
      return { ok: true, applied: {} }
    }
    await writeCatalogFile({
      updatedAt: new Date().toISOString(),
      products,
    })
    return { ok: true, applied }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'preorder sold increment failed'
    console.warn('[preorderSold] catalog bump failed (order still saved):', error)
    return { ok: false, applied: {}, error }
  }
}
