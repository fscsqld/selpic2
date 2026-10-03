import { describe, expect, it } from 'vitest'
import { classifyStripeWebhookPersistFailure } from './stripeWebhookResponse'

describe('classifyStripeWebhookPersistFailure', () => {
  it('retries transient infra failures', () => {
    expect(classifyStripeWebhookPersistFailure(503, 'Order database not configured')).toBe('retry')
    expect(classifyStripeWebhookPersistFailure(500, 'Failed to save order')).toBe('retry')
  })

  it('retries payment-not-completed race on session.completed', () => {
    expect(classifyStripeWebhookPersistFailure(400, 'Payment not completed')).toBe('retry')
  })

  it('acks permanent client errors so Stripe stops retrying', () => {
    expect(
      classifyStripeWebhookPersistFailure(400, 'Paid amount does not match order total')
    ).toBe('ack')
    expect(
      classifyStripeWebhookPersistFailure(400, 'Could not restore order from payment session')
    ).toBe('ack')
  })
})
