/**
 * Quick self-check for Stripe + Supabase order ledger (no network calls).
 * Run from project root (loads nothing from .env — set variables in shell or use your host dashboard):
 *
 *   node scripts/verify-order-ledger.mjs
 */
import dotenv from 'dotenv'

// Next.js loads `.env.local` automatically, but this node script does not.
// Load `.env.local` explicitly for local verification.
dotenv.config({ path: '.env.local' })

const required = [
  ['STRIPE_SECRET_KEY', (v) => v && (v.startsWith('sk_test_') || v.startsWith('sk_live_'))],
  ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', (v) => v && (v.startsWith('pk_test_') || v.startsWith('pk_live_'))],
  ['NEXT_PUBLIC_SUPABASE_URL', (v) => v && v.startsWith('https://')],
  ['SUPABASE_SERVICE_ROLE_KEY', (v) => v && v.length > 20],
]

const optional = [
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', (v) => v && v.length > 20],
  ['STRIPE_WEBHOOK_SECRET', (v) => v && v.startsWith('whsec_')],
]

let ok = true
for (const [name, validate] of required) {
  const val = process.env[name]
  const pass = validate(val || '')
  if (!pass) {
    ok = false
    console.error(`[missing or invalid] ${name}`)
  } else {
    console.log(`[ok] ${name}`)
  }
}
for (const [name, validate] of optional) {
  const val = process.env[name]
  const pass = validate(val || '')
  if (!pass) {
    console.warn(`[optional] ${name} — set whsec_... for POST /api/stripe/webhook`)
  } else {
    console.log(`[ok] ${name}`)
  }
}

console.log('')
console.log('Webhook URL to register in Stripe Dashboard (production):')
console.log('  https://<your-domain>/api/stripe/webhook')
console.log('Event: checkout.session.completed')
console.log('')
console.log('Apply SQL in Supabase: supabase/migrations/001_orders.sql')
console.log('')

process.exit(ok ? 0 : 1)
