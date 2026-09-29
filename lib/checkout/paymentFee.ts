/**
 * Payment option fee — same formula as checkout page `getPaymentFee`.
 * Pure helper for client + server parity.
 */
export type PaymentFeeOptionLike = {
  fee?: number
  feeType?: 'fixed' | 'percentage' | string
  feePercentage?: number
}

export function getPaymentFee(option: PaymentFeeOptionLike | null | undefined, subtotal: number): number {
  if (!option) return 0
  if (option.feeType === 'percentage' && option.feePercentage) {
    return (subtotal * option.feePercentage) / 100
  }
  return Number(option.fee) || 0
}
