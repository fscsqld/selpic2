# Stripe: switching from test mode to live mode

Use this checklist when Stripe account verification is complete and you are ready to accept real payments.

## Environment variables to update (`.env.local`)

Replace **test** keys with **live** keys for these three variables only (unless your host sets them elsewhere):

| Variable | Test prefix | Live prefix | Where it is used |
|----------|-------------|-------------|------------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` | Browser (Checkout, `lib/stripeClient.ts`) |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` | Server (`lib/stripe.ts`, `/api/stripe/checkout`, etc.) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (test endpoint) | `whsec_...` (live endpoint) | `/api/stripe/webhook` — **must match the live webhook** |

**Important:** Live and test webhook endpoints each have their **own** signing secret. After you create or switch to a live-mode webhook in the Dashboard, copy the **new** `whsec_...` for that endpoint into `STRIPE_WEBHOOK_SECRET`.

Do **not** mix test publishable/secret keys with live keys.

After editing `.env.local`, restart the Next.js process (and redeploy if you use Vercel/hosting env vars).

## Where to copy keys in Stripe Dashboard

1. **Turn on Live mode**  
   In the Stripe Dashboard, use the **Test mode / Live mode** toggle (usually top-right) and switch to **Live**.

2. **Publishable + Secret keys**  
   - Go to **Developers** → **API keys**.  
   - Under **Standard keys**, copy:  
     - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  
     - **Secret key** → `STRIPE_SECRET_KEY` (click **Reveal** if needed; keep this secret off the client).

3. **Webhook signing secret**  
   - Go to **Developers** → **Webhooks**.  
   - Ensure you are still in **Live** mode.  
   - Add (or select) an endpoint whose URL is your production site, e.g.  
     `https://your-domain.com/api/stripe/webhook`  
   - Choose the events your app needs (at minimum what your `app/api/stripe/webhook/route.ts` handles).  
   - Open that endpoint → **Signing secret** → **Reveal** → copy into `STRIPE_WEBHOOK_SECRET`.

4. **Production URL**  
   In **Checkout** settings or wherever you configure success/cancel URLs, confirm they use your **live** site URL if anything is hard-coded outside env (this project often uses relative paths; verify hosted `NEXT_PUBLIC_*` site URL matches production).

## Quick verification

- In the Dashboard, remain in **Live** mode and place a **small real** card payment (or Stripe’s test flow is not applicable — use a real small charge per your policy).  
- Confirm the payment appears under **Payments** (live) and that your app receives the webhook (Dashboard → Webhooks → endpoint → **Recent deliveries**).

## Rollback

If something fails, switch the toggle back to **Test** in the Dashboard for debugging, and temporarily restore `pk_test_` / `sk_test_` / test `whsec_` in `.env.local` until the issue is fixed.
