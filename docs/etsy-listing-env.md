# Etsy draft listings — environment variables and taxonomy

This app can create **draft** physical listings on Etsy from the storefront product detail page (`/products/[id]`, admin-only panel). Drafts need a valid **seller taxonomy leaf** id, Etsy **shipping** and **return** policies (auto-detected from your shop by default), and **`listings_w`** on the OAuth token. **Connect** in this repo currently requests **order-only** scopes; listing drafts from SELPIC need a code change to request `listings_w` and a fresh Connect when Etsy allows it.

## Required (Vercel + local if you test locally)

| Variable | Purpose |
|----------|---------|
| `ETSY_CLIENT_ID` | App keystring (`client_id` + `x-api-key` left side). |
| `ETSY_CLIENT_SECRET` | Shared secret — `x-api-key` must be `KEYSTRING:SHARED_SECRET`. |
| `ETSY_OAUTH_REDIRECT_URI` | Full HTTPS callback URL registered on the Etsy app. |
| `ETSY_DEFAULT_TAXONOMY_ID` | **Numeric seller taxonomy leaf id** used for every draft created from SELPIC. Must be a **leaf** node that matches your product type (e.g. stickers, decals). |

Etsy **owns** the taxonomy tree; ids can vary by Etsy version and region. **Do not copy a random id from the internet** — pick one that matches your shop and category.

### How to pick `ETSY_DEFAULT_TAXONOMY_ID` (recommended)

1. Sign in to SELPIC as a **Supabase admin** (same session as Admin → Integrations).
2. In the browser, open:

   `https://YOUR_DOMAIN/api/admin/integrations/etsy/taxonomy/nodes?q=sticker`

   Replace `sticker` with keywords such as `name`, `label`, `decal`, `vinyl`, `paper`, etc.

3. The JSON response includes `nodes`: `[{ "id", "name", "path" }, ...]`. Choose a row whose **`path`** reads like the category you want (deepest / most specific rows are usually leaves).
4. Set **`ETSY_DEFAULT_TAXONOMY_ID`** in Vercel to that **`id`** (integer only), redeploy, then try **Create Etsy draft** again.

If the search returns too few rows, try a shorter `q` or omit `q` (response can be large).

### Name stickers / custom labels

There is **no single universal** "name sticker" id: search the taxonomy API with terms you actually use (`name sticker`, `custom label`, `paper sticker`, etc.) and select the leaf that Etsy shows for your intended listing type.

### One-command local suggestions (uses `.env.local`)

From the repo root (with `ETSY_CLIENT_ID` and `ETSY_CLIENT_SECRET` in `.env.local`):

```bash
npm run etsy:taxonomy
```

This prints ranked taxonomy **ids and paths** aligned with SELPIC’s storefront (stickers / name labels). Copy one **numeric `id`** into Vercel as `ETSY_DEFAULT_TAXONOMY_ID`.

## Optional overrides

| Variable | When to set |
|----------|-------------|
| `ETSY_DEFAULT_SHIPPING_PROFILE_ID` | If auto-pick of the first **non-deleted** shipping profile is wrong. |
| `ETSY_DEFAULT_RETURN_POLICY_ID` | If auto-pick of the first **non-deleted** return policy is wrong. |
| `ETSY_LISTING_MARKUP_DEFAULT_PERCENT` | Default **percent** markup when the API/UI does not send one (e.g. `15`). |
| `NEXT_PUBLIC_ETSY_LISTING_MARKUP_DEFAULT` | Default percent shown in the product-page markup field in the browser. |

## Shipping and return policies (automation)

If the optional env ids above are **unset**, the server:

1. Calls Etsy `GET .../shops/{shop_id}/shipping-profiles`
2. Calls Etsy `GET .../shops/{shop_id}/policies/return`
3. Prefers rows that are **not** marked deleted (`is_deleted` / similar), then falls back to the first row with a valid id.

You must have at least one shipping profile and one return policy configured in **Etsy Shop Manager** for the connected shop.

## Images on drafts

After creating the listing, the server uploads up to **10** images via Etsy `uploadListingImage`:

- Product `image` and `fallbackImage`
- Gallery images from the media library for that `productId` (same order as on the site; WebP URL used when present)

Relative paths (`/images/...`) are resolved with `assetBaseUrl` from the browser (`window.location.origin`) or `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_URL` on the server.

## OAuth scope

- **Default OAuth (Connect):** `shops_r`, `transactions_r`, `address_r` only — fixed in `getEtsyOAuthScopes()` (no env toggles).
- **Drafts + images:** need **`listings_w`** on the token; extend OAuth scope logic in code and reconnect when Etsy allows listing scopes for your app.

Etsy’s scope strings **`listings_r`** / **`listings_w`** match the [Open API v3 authentication docs](https://developer.etsy.com/documentation/essentials/authentication); they are not misspelled. Whether your app can use them without a separate Etsy review depends on your app’s status on Etsy’s side.
