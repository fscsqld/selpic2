import type { OrderRecord } from '@/lib/store'

/** Default mass per sellable unit when `item.weightKg` is missing (flat sticker–class, kg). */
export const DEFAULT_STANDARD_LETTER_WEIGHT_KG = 0.05

const MAX_DECLARED_KG = 22

function roundKg(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * Declared mass for shipping labels:
 * 1) `order.declaredShippingWeightKg` if set and positive;
 * 2) else sum over lines: `item.weightKg * quantity` when `weightKg` is set, otherwise
 *    `DEFAULT_STANDARD_LETTER_WEIGHT_KG * quantity` per line (so multiple units scale);
 * 3) empty cart fallback: {@link DEFAULT_STANDARD_LETTER_WEIGHT_KG} once.
 */
export function computeDeclaredShippingWeightKg(order: OrderRecord): number {
  const declared = order.declaredShippingWeightKg
  if (typeof declared === 'number' && Number.isFinite(declared) && declared > 0) {
    return roundKg(Math.min(declared, MAX_DECLARED_KG))
  }
  const items = order.items || []
  if (items.length === 0) {
    return DEFAULT_STANDARD_LETTER_WEIGHT_KG
  }
  let sum = 0
  for (const it of items) {
    const w = typeof it.weightKg === 'number' && Number.isFinite(it.weightKg) && it.weightKg > 0 ? it.weightKg : 0
    const q = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1
    if (w > 0) {
      sum += w * q
    } else {
      sum += DEFAULT_STANDARD_LETTER_WEIGHT_KG * q
    }
  }
  return roundKg(Math.min(sum, MAX_DECLARED_KG))
}

export function formatDeclaredWeightForLabel(kg: number): string {
  const r = roundKg(kg)
  const t = r % 1 === 0 ? String(r) : r.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `${t} kg`
}
