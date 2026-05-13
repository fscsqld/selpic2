import type { OrderRecord } from '@/lib/store'

/** Default when no per-line or order-level mass is stored (large letter–class placeholder, kg). */
export const DEFAULT_STANDARD_LETTER_WEIGHT_KG = 0.125

const MAX_DECLARED_KG = 22

function roundKg(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * Declared mass for shipping labels: `declaredShippingWeightKg` wins, else sum of
 * `item.weightKg * quantity`, else {@link DEFAULT_STANDARD_LETTER_WEIGHT_KG}.
 */
export function computeDeclaredShippingWeightKg(order: OrderRecord): number {
  const declared = order.declaredShippingWeightKg
  if (typeof declared === 'number' && Number.isFinite(declared) && declared > 0) {
    return roundKg(Math.min(declared, MAX_DECLARED_KG))
  }
  let sum = 0
  for (const it of order.items || []) {
    const w = typeof it.weightKg === 'number' && Number.isFinite(it.weightKg) && it.weightKg > 0 ? it.weightKg : 0
    const q = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1
    sum += w * q
  }
  if (sum > 0) return roundKg(Math.min(sum, MAX_DECLARED_KG))
  return DEFAULT_STANDARD_LETTER_WEIGHT_KG
}

export function formatDeclaredWeightForLabel(kg: number): string {
  const r = roundKg(kg)
  const t = r % 1 === 0 ? String(r) : r.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `${t} kg`
}
