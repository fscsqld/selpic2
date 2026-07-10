/** Tetris level-5 reward — keep in sync with GamePromoCodeSync registration rules. */

export const GAME_PROMO_GUEST_STORAGE_KEY = 'selpic-game-completed-guest'

export function gamePromoUserStorageKey(userId: string): string {
  return `selpic-game-completed-${userId}`
}

export const GAME_LEVEL_5_REWARD = {
  source: 'game_level_5',
  discountPercent: 10,
  maxDiscountAmount: 15,
  validityMonths: 6,
  userUsageLimit: 1,
} as const

export const GAME_PROMO_STORE_DESCRIPTION =
  `🎮 Selpic TETRIS Level 5 Clear Reward - ${GAME_LEVEL_5_REWARD.discountPercent}% OFF (Max $${GAME_LEVEL_5_REWARD.maxDiscountAmount}) | Valid for ${GAME_LEVEL_5_REWARD.validityMonths} months`

export const GAME_PROMO_CUSTOMER_TERMS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Discount', value: `${GAME_LEVEL_5_REWARD.discountPercent}% off your order` },
  { label: 'Maximum discount', value: `$${GAME_LEVEL_5_REWARD.maxDiscountAmount} per order` },
  { label: 'Usage limit', value: 'One use per customer' },
  { label: 'Validity', value: `${GAME_LEVEL_5_REWARD.validityMonths} months from issue date` },
  { label: 'How to use', value: 'Enter this code at checkout' },
]

export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  const copy = new Date(d)
  copy.setMonth(copy.getMonth() + months)
  return copy.toISOString()
}
