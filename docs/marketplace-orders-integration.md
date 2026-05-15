# Multi-platform order management (Website, Etsy, future channels)

This project treats **one canonical `OrderRecord` shape** in `payload` (see `lib/store.ts`) while the `orders` table adds **`platform_source`** and **`external_order_key`** for filtering and idempotent marketplace imports.

## Database

- Apply `supabase/migrations/003_orders_multi_platform.sql` (nullable Stripe session + platform columns).
- Apply `docs/etsy-oauth-supabase.sql` for the Etsy token table.

## Architecture (adapter pattern)

- **`lib/orderSources/types.ts`** — shared `NormalizedMarketplaceOrder` + `MarketplaceOrderAdapter` interface.
- **`lib/orderSources/registry.ts`** — maps `OrderPlatformSource` → adapter (add eBay/Amazon adapters here later).
- **`lib/orderSources/etsy/`** — Etsy-specific HTTP client, receipt mapping, personalization extraction.

Adding **eBay** later: implement `lib/orderSources/ebay/*`, register in `registry.ts`, add DB enum value `ebay`, extend `OrderRecord.platformSource`, and add a sync route similar to Etsy.

## Etsy Open API v3

### 1) Create an Etsy app

1. Open [Your Etsy apps](https://www.etsy.com/developers/your-apps) and create an app.
2. Note the **Keystring** (used as `client_id` / `x-api-key`) and **Shared secret** (`client_secret` — server only).
3. Add the **OAuth redirect URL** in the app settings. It must match **exactly** what you set in env:
   - Production: `https://YOUR_DOMAIN/api/admin/integrations/etsy/oauth/callback`
   - Etsy’s docs require **`https://`** for the redirect URI registered with Etsy. Local `http://localhost` is often rejected; use a tunnel (e.g. ngrok) with HTTPS for OAuth testing if needed.

### 2) Environment variables (server)

| Variable | Purpose |
|----------|---------|
| `ETSY_CLIENT_ID` | App **Keystring** (`client_id` for OAuth + `x-api-key` on API calls). Legacy alias: `ETSY_API_KEY`. |
| `ETSY_CLIENT_SECRET` | **Shared secret** — token exchange/refresh and **`x-api-key`** as `KEYSTRING:SHARED_SECRET` on REST calls. Server only. |
| `ETSY_OAUTH_REDIRECT_URI` | Full callback URL (must match Etsy app settings). |
| `ETSY_SHOP_ID` | Optional — pin one shop when the seller has multiple shops. |
| `NEXT_PUBLIC_SITE_URL` | Site base for emails/SEO; OAuth callback uses the **request origin** for local ports; resolves relative `/…` listing image URLs when the client does not send `assetBaseUrl`. |

### 3) OAuth 2.0 (PKCE)

Etsy requires **PKCE** (`code_challenge` + `code_verifier`). The app implements:

- **Authorization URL:** `https://www.etsy.com/oauth/connect` (same as Etsy OpenAPI spec).
- **Token URL:** `https://openapi.etsy.com/v3/public/oauth/token` (override with env `ETSY_OAUTH_TOKEN_URL` if needed).
- `GET /api/admin/integrations/etsy/oauth/start` — sets short-lived HTTP-only cookies and redirects to Etsy.
- `GET /api/admin/integrations/etsy/oauth/callback` — validates `state`, exchanges `code` for tokens, stores tokens in `etsy_oauth_connection`, then redirects to **`/admin/dashboard`** with query flags (`etsy=connected`, etc.).

**Redirect URI (exact path in this repo):** append  
`/api/admin/integrations/etsy/oauth/callback`  
to your public site origin. Example:  
`https://selpic.com.au/api/admin/integrations/etsy/oauth/callback`  
Register that **full URL** in the Etsy app and set the same value as `ETSY_OAUTH_REDIRECT_URI`.

**Scopes requested** (authorize URL): fixed in code — **`shops_r`**, **`transactions_r`**, **`address_r`** only (order import). Listing scopes are **not** sent on Connect in this build; draft listing from SELPIC needs a future OAuth scope change plus reconnect.

REST calls use **`Authorization: Bearer <access_token>`** and **`x-api-key: <KEYSTRING>:<SHARED_SECRET>`** (from `ETSY_CLIENT_ID` + `ETSY_CLIENT_SECRET`).

### 4) Import orders

- Admin UI: **Dashboard → Etsy shop** or **Integrations** → **Sync** (calls `POST /api/admin/integrations/etsy/sync`).
- **Automated sync:** `GET /api/cron/etsy-sync` with `Authorization: Bearer <CRON_SECRET>`. Use **Admin → Sync** manually, or an external scheduler (Vercel Hobby does not allow `*/10` in `vercel.json` crons — use Pro or GitHub Actions cron). If Etsy is not connected, the run returns `{ "skipped": true }` with HTTP 200.
- Default import: **paid** receipts with **`was_shipped=false`** (open for fulfillment), last **90** days (override with `sinceDays`, max 180). Set JSON body `{ "openOnly": false }` to include shipped receipts.

### 5) Publish / update listings (storefront product page)

- Admin-only panel on **`/products/[id]`** when signed in with Supabase admin and Etsy is connected. Creates a **draft** physical listing or **PATCH**es an existing listing linked via `etsyListingId` on the product.
- Server env: **`ETSY_DEFAULT_TAXONOMY_ID`** (seller taxonomy leaf). Shipping profile and return policy default to the **first** returned by Etsy for the shop unless **`ETSY_DEFAULT_SHIPPING_PROFILE_ID`** / **`ETSY_DEFAULT_RETURN_POLICY_ID`** are set.
- **Markup:** `pricingMode` `markup_percent` (with `markupPercent`) or `fixed_price` (with `fixedEtsyPrice`). Defaults from **`ETSY_LISTING_MARKUP_DEFAULT_PERCENT`** (server) and **`NEXT_PUBLIC_ETSY_LISTING_MARKUP_DEFAULT`** (browser field default).
- **Images:** After draft creation, the server uploads storefront + media-library images (max 10) via Etsy `uploadListingImage`. Relative image paths are resolved with `assetBaseUrl` / `NEXT_PUBLIC_SITE_URL`.
- **Taxonomy discovery:** `GET /api/admin/integrations/etsy/taxonomy/nodes?q=...` (admin session) — see **`docs/etsy-listing-env.md`** for choosing `ETSY_DEFAULT_TAXONOMY_ID`.

### 6) Personalization → SELPIC fields

Etsy line items may include free-text personalization and/or structured fields. The mapper fills:

- `OrderItemSnapshot.buyerPersonalization` — merged plain text for packing slips and search.
- `OrderItemSnapshot.personalizationResponses` — `{ label, value }[]` for multi-question listings.
- `OrderItemSnapshot.customizations['Etsy personalization']` — same merged string for compatibility with existing customization UI.

If Etsy changes payload shapes, adjust **`mapEtsyReceiptToOrderRecord`** only.
