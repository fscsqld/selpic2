/**
 * Stripe retries webhook deliveries that do not return 2xx.
 * Permanent client failures must ACK (200) after logging so retries do not storm;
 * transient infra failures should keep 5xx/503 so Stripe retries.
 */
export function classifyStripeWebhookPersistFailure(
  status: number,
  error: string
): 'ack' | 'retry' {
  if (status === 503 || status >= 500) return 'retry'
  // checkout.session.completed can race Stripe's payment_status briefly
  if (status === 400 && /payment not completed/i.test(error)) return 'retry'
  if (status >= 400 && status < 500) return 'ack'
  return 'retry'
}
