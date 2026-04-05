import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js'

let stripePromise: Promise<StripeJs | null> | null = null

/** Publishable key — used for Stripe.js (e.g. future Elements). Checkout redirect works without calling this. */
export function getStripeJs(): Promise<StripeJs | null> {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    return Promise.resolve(null)
  }
  if (!stripePromise) {
    stripePromise = loadStripe(key)
  }
  return stripePromise
}
