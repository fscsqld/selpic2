import { describe, expect, it } from 'vitest'
import { detectPlatformTransaction } from '@/lib/classification/platform-marketplace'

describe('platform-marketplace', () => {
  it('classifies Stripe debit as merchant fees', () => {
    const m = detectPlatformTransaction('Stripe-zrar1cd92bj Stripe Selpic', 0.68, null)
    expect(m?.category).toBe('EXPENSE_MERCHANT_FEES')
  })

  it('classifies Cursor debit as software subscription', () => {
    const m = detectPlatformTransaction('Cursor Powered IDE Software', 32, null)
    expect(m?.category).toBe('EXPENSE_SOFTWARE_SUBSCRIPTIONS')
  })

  it('classifies Etsy credit as trading revenue', () => {
    const m = detectPlatformTransaction('ETSY MARKETPLACE PAYOUT', null, 240)
    expect(m?.category).toBe('INCOME_SALES_CLEANING')
  })

  it('classifies eBay credit as trading revenue', () => {
    const m = detectPlatformTransaction('EBAY AU PAYMENTS', null, 120)
    expect(m?.category).toBe('INCOME_SALES_CLEANING')
  })

  it('classifies Google Workspace as software not marketing', () => {
    const m = detectPlatformTransaction('GOOGLE WORKSPACE SYDNEY', 18, null)
    expect(m?.category).toBe('EXPENSE_SOFTWARE_SUBSCRIPTIONS')
  })

  it('classifies Google Ads as marketing', () => {
    const m = detectPlatformTransaction('GOOGLE ADS AUSTRALIA', 50, null)
    expect(m?.category).toBe('EXPENSE_MARKETING')
  })
})
