# Cross-Device Sync Guardrails

This checklist prevents "local shows N items but deployed/customers show fewer" incidents.

## 1) Use one shared source of truth

- Device-local stores (`localStorage`, IndexedDB, Zustand persist) are caches only.
- Cross-device consistency must come from server snapshots:
  - Media: `POST /api/media/products` -> `site_configs.storefront_media`
  - Catalog: `POST /api/catalog/products` -> `site_configs.storefront_catalog`
- Storefront views should read server APIs (`/api/media/public`, `/api/catalog/public`) and merge local pending rows only as temporary fallback.

## 2) Prevent stale snapshot overwrites

- Never post a captured array from an old closure after a debounce delay.
- At flush time, always read latest store state (`useStore.getState()` / `useMediaStore.getState()`).
- Serialize sync requests (promise chain) so an older in-flight POST cannot overwrite a newer full snapshot.

## 3) Keep admin write auth robust in production

- Preferred auth: `Authorization: Bearer <CATALOG_SYNC_SECRET>`.
- Fallback for browser admin writes: `x-selpic-admin-write: 1`.
- Do not rely only on `Origin` / `Referer` checks; some proxies/browsers omit them.

## 4) Keep server storage resilient

- Primary: Supabase `site_configs` write.
- Fallback order:
  1. Service role client (`SUPABASE_SERVICE_ROLE_KEY`)
  2. Anon key client (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) where RLS allows writes
  3. Local file fallback for local recovery only (not a reliable production source)

## 5) Branch and deployment hygiene

- Keep `main`, `master`, and deployment branch aligned for sync-critical fixes.
- Before release, verify:
  - `git rev-parse main master origin/main origin/master` all equal
  - no pending sync-related commits left on non-deployed branches

## 6) Smoke tests after every sync-related change

1. Upload/link 2 files in admin.
2. Confirm `POST /api/media/products` returns 200.
3. Compare snapshots:
   - local: `http://localhost:3000/api/media/public`
   - deployed: `https://<prod-host>/api/media/public`
   - expected same `count`, same ids for target product.
4. Open product detail on another device/browser profile and verify gallery matches.

## 7) Fast diagnostics when mismatch appears

- If local > deployed:
  - check `POST /api/media/products` status in deployed admin network tab
  - check server logs for media/catalog upsert failures
  - check env vars on host (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional service role, sync secret)
- If deployed API has correct count but UI is stale:
  - check cache headers (`no-store`)
  - revalidate client refetch triggers (visibility/storage/event/timer)

