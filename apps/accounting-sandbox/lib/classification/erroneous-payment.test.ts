import { describe, expect, it } from 'vitest'
import {
  detectErroneousPayment,
  isErroneousPaymentReturnDescription,
  applyErroneousPaymentSwap,
  ERRONEOUS_PAYMENT_RETURN,
  ERRONEOUS_PAYMENT_OUT,
} from '@/lib/classification/erroneous-payment'

describe('erroneous payment classification', () => {
  it('detects return of accidental wrong reimbursement (user example)', () => {
    const desc = 'MR JINSOO KIM Return wrong reimb Return of accidental'
    expect(isErroneousPaymentReturnDescription(desc)).toBe(true)

    const match = detectErroneousPayment({
      description: desc,
      debit: null,
      credit: 500,
    })
    expect(match?.category).toBe(ERRONEOUS_PAYMENT_RETURN)
  })

  it('converts incorrect debit parse to credit for return narrative', () => {
    const tx = applyErroneousPaymentSwap({
      date: '2025-07-01',
      description: 'Return wrong reimb Return of accidental',
      debit: 200,
      credit: null,
      balance: 0,
    })
    expect(tx.credit).toBe(200)
    expect(tx.debit).toBeNull()
  })

  it('detects erroneous payment outflow', () => {
    const match = detectErroneousPayment({
      description: 'ACCIDENTAL PAYMENT TO MR JINSOO KIM',
      debit: 500,
      credit: null,
    })
    expect(match?.category).toBe(ERRONEOUS_PAYMENT_OUT)
  })
})
