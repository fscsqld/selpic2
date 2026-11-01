import { describe, expect, it } from 'vitest'
import {
  marketplaceCustomerEmailSkipReason,
  shouldSendCustomerOrderEmail,
} from './customerOrderEmailPolicy'

describe('shouldSendCustomerOrderEmail', () => {
  it('allows website orders (default)', () => {
    expect(shouldSendCustomerOrderEmail({})).toBe(true)
    expect(shouldSendCustomerOrderEmail({ platformSource: 'website' })).toBe(true)
  })

  it('blocks marketplace sales channels', () => {
    expect(shouldSendCustomerOrderEmail({ platformSource: 'ebay' })).toBe(false)
    expect(shouldSendCustomerOrderEmail({ platformSource: 'amazon' })).toBe(false)
    expect(shouldSendCustomerOrderEmail({ platformSource: 'etsy' })).toBe(false)
    expect(shouldSendCustomerOrderEmail({ platformSource: 'EBAY' })).toBe(false)
  })
})

describe('marketplaceCustomerEmailSkipReason', () => {
  it('is empty for website and explains skip for eBay', () => {
    expect(marketplaceCustomerEmailSkipReason({ platformSource: 'website' })).toBe('')
    expect(marketplaceCustomerEmailSkipReason({ platformSource: 'ebay' })).toMatch(/eBay/)
  })
})
