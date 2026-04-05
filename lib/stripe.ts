import Stripe from 'stripe'

/**
 * Server-side Stripe SDK (test or live key from STRIPE_SECRET_KEY).
 *
 * Used only for: Checkout Session create/retrieve, Coupon create, webhook signature verification.
 * This app does NOT call the Account API (POST /v1/account). If Stripe Dashboard shows
 * "Only live keys can access this method" when updating business/product description, that is
 * a Dashboard limitation for certain account fields — it does not block test Checkout payments.
 */

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key.trim() === '') {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key)
  }
  return stripeSingleton
}
