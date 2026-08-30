import { roundMoney } from '@/lib/utils/currency-format'

export function isContractorExpenseCategory(category: string): boolean {
  const key = category.toLowerCase()
  if (
    key.includes('accounting') ||
    key.includes('bookkeep') ||
    key.includes('legal') ||
    key.includes('professional') ||
    key.includes('consult')
  ) {
    return false
  }
  return (
    key.includes('subcontractor') ||
    key.includes('sub_contractor') ||
    key.includes('contractor') ||
    key.includes('commission')
  )
}

/** ATO myTax / CTR Item 6Y — fuel, vehicle, parking, tolls; not airfare. */
export function isMotorExpenseCategory(category: string): boolean {
  const key = category.toLowerCase()
  if (
    key.includes('accommodation') ||
    key.includes('hotel') ||
    key.includes('meal') ||
    key.includes('airfare') ||
    key.includes('air_fare') ||
    key.includes('air-fare') ||
    key.includes('flight') ||
    key.includes('airline') ||
    key.includes('air_travel') ||
    key.includes('air-travel') ||
    key.includes('travel_transport') ||
    key.includes('travel-transport') ||
    (key.includes('travel') && key.includes('transport'))
  ) {
    return false
  }
  return (
    key.includes('motor') ||
    key.includes('vehicle') ||
    key.includes('fuel') ||
    (key.includes('car') && !key.includes('care')) ||
    key.includes('parking') ||
    key.includes('toll')
  )
}

export function isPurchaseExpenseCategory(category: string): boolean {
  const key = category.toLowerCase()
  if (key.includes('office_supplies') || key.includes('office-supplies')) {
    return false
  }
  if (key.includes('supplies') && key.includes('office')) return false
  return (
    key.includes('inventory') ||
    key.includes('cogs') ||
    key.includes('cost_of_goods') ||
    key.includes('purchases') ||
    key.includes('stock') ||
    (key.includes('supplies') && !key.includes('office'))
  )
}

/** CTR Item 6Z — repairs and maintenance. */
export function isRepairsExpenseCategory(category: string): boolean {
  const key = category.toLowerCase()
  return key.includes('repair') || key.includes('maintenance')
}

export function isPrimarySalesIncomeCategory(category: string): boolean {
  const key = category.toLowerCase()
  if (key.includes('other') || key.includes('interest') || key.includes('gov')) {
    return false
  }
  return (
    key.includes('sales') ||
    key.includes('service') ||
    key.includes('trading') ||
    key.includes('revenue') ||
    key === 'income' ||
    key.endsWith('_income')
  )
}

export function sumMatchingCategoryMap(
  map: Record<string, number>,
  match: (category: string) => boolean
): number {
  let total = 0
  for (const [cat, amount] of Object.entries(map)) {
    if (match(cat)) total += Math.abs(amount)
  }
  return roundMoney(total)
}

export function otherExpenseTotalFromMap(
  map: Record<string, number>,
  excluded: number
): number {
  const total = Object.values(map).reduce((s, v) => s + Math.abs(v), 0)
  return roundMoney(Math.max(0, total - excluded))
}

export function splitBusinessIncomeExGst(map: Record<string, number>): {
  grossPayments: number
  otherIncome: number
} {
  let gross = 0
  let other = 0
  for (const [cat, amount] of Object.entries(map)) {
    const value = Math.abs(amount)
    if (isPrimarySalesIncomeCategory(cat)) gross += value
    else other += value
  }
  return { grossPayments: roundMoney(gross), otherIncome: roundMoney(other) }
}
