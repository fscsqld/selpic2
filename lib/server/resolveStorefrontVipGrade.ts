import 'server-only'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { calculateUserTotalSales } from '@/lib/userGradeUtils'
import { calculateGrade } from '@/lib/vipGradeConfig'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderRecord } from '@/lib/store'
import { getVipManualGradeOverrideForEmail } from '@/lib/server/vipManualGradeOverridesStore'
import { resolveEffectiveVipGradeCode } from '@/lib/vipManualGradeOverride'

function normEmail(s: string) {
  return (s || '').trim().toLowerCase()
}

/**
 * Resolve VIP grade for checkout:
 * 1) Admin manual override in site_configs when present (test / gift grades)
 * 2) Else sales-derived grade from ledger orders (normal customers unchanged)
 */
export async function resolveStorefrontVipGradeFromOrders(args: {
  email: string
  phone?: string
  gradeConfigs: Array<{ code: number; minAmount: number; maxAmount?: number; isActive?: boolean }>
}): Promise<{
  gradeCode: number
  totalSales: number
  orders: OrderRecord[]
  fromManualOverride: boolean
}> {
  const email = normEmail(args.email)
  if (!email || !isSupabaseConfigured()) {
    return { gradeCode: 0, totalSales: 0, orders: [], fromManualOverride: false }
  }

  const sb = getSupabaseAdmin()
  const raw = args.email.trim()
  const variants = [...new Set([email, raw])].filter(Boolean)
  const rowsByKey = new Map<string, OrderRecord>()

  for (const em of variants) {
    const { data: chunk, error } = await sb
      .from('orders')
      .select('payload')
      .filter('payload->customer->>email', 'eq', em)
      .limit(500)
    if (error) continue
    for (const row of chunk || []) {
      const order = normalizeLedgerOrder(row.payload as OrderRecord)
      if (order?.id) rowsByKey.set(order.id, order)
    }
  }

  const orders = Array.from(rowsByKey.values())
  const totalSales = calculateUserTotalSales(email, orders, args.phone)
  const salesGrade = calculateGrade(totalSales, args.gradeConfigs.length ? args.gradeConfigs : undefined)

  let override = null
  try {
    override = await getVipManualGradeOverrideForEmail(email)
  } catch {
    override = null
  }

  const { gradeCode, fromManualOverride } = resolveEffectiveVipGradeCode(salesGrade, override)
  return { gradeCode, totalSales, orders, fromManualOverride }
}

/** Count non-cancelled orders that already used this promo for the email. */
export function countPromoUsageForEmail(orders: OrderRecord[], promoCode: string, email: string): number {
  const needle = promoCode.trim().toUpperCase()
  const em = normEmail(email)
  if (!needle || !em) return 0
  return orders.filter((order) => {
    if (!order.promoCode || order.status === 'cancelled') return false
    if (String(order.promoCode).toUpperCase() !== needle) return false
    return normEmail(order.customer?.email || '') === em
  }).length
}
