# Storefront mobile performance — Lighthouse learning

## Latest lab report — Sep 12, 2026, **10:11:31 PM** GMT+10

| Field | Value |
|-------|--------|
| URL | `https://www.selpic.com.au/` |
| Tool | PageSpeed Insights / Lighthouse **13.4.1** |
| Device | Emulated **Moto G Power**, Mobile, Slow 4G |
| Field CrUX | **No Data** |
| Weights | FCP +10, LCP +3, TBT +29, CLS +25, SI +2 |

### Score trail

| Metric | Baseline 1:33 | 10:11 AM | 4:58 | 3:29 | 9:42 PM | **Latest 10:11 PM** |
|--------|-------------:|---------:|-----:|-----:|--------:|--------------------:|
| Performance | 51 | 67 | 74 | 78 | 75 | **69** |
| FCP | 3.3 s | 2.4 s | 1.1 s | 1.1 s | 1.1 s | **1.1 s** |
| LCP | 8.4 s | 5.8 s | 4.8 s | 4.4 s | 4.8 s | **6.1 s** |
| TBT | 420 ms | 50 ms | 100 ms | 30 ms | 80 ms | **120 ms** |
| SI | 7.7 s | 9.3 s | 8.8 s | 7.3 s | 7.1 s | **8.5 s** |
| CLS | 0 | 0 | 0.002 | 0.002 | 0.03 | **0.002** |
| Payload | ~14.5 MiB | ~14.2 | ~4.8 | ~4.8 | ~3.2 | **~3.2 MiB** (3,249 KiB) |
| Image delivery (claimed) | — | ~213 | ~393 | ~393 | ~592 | **~407 KiB** |
| Accessibility | 98 | 98 | 92 | 92 | 100 | **100** |
| Best Practices | 96 | 96 | 100 | 100 | 100 | **100** |
| SEO | 100 | 100 | 100 | 100 | 100 | **100** |
| Agentic | — | — | 2/2 | 2/2 | 2/2 | **2/2** |

**Read (10:11 PM — why Perf fell after logo upload):** Header logo re-upload (~**16.5 KB** transparent WebP) did **not** cause the drop. Total payload **3,247 → 3,249 KiB** (unchanged). Score fell because **LCP 4.8s → 6.1s** (LCP weight +8 → **+3**) and **SI 7.1 → 8.5s**. Live LCP media is still hero slide 1 **video** `hero-banner.mp4` ~**1.7 MB** + poster WebP ~**133 KB** — orders of magnitude above the header logo. Treat **75 ↔ 69** as lab/Slow-4G variance on hero timing; next real lever remains **smaller admin MP4**, not logo KB.

### What changed (10:11 PM vs 9:42 PM)

- Perf **75 → 69**; LCP **4.8 → 6.1s**; SI **7.1 → 8.5s**; TBT **80 → 120ms**
- CLS **0.03 → 0.002** (improved); A11y/BP/SEO/Agentic held at 100 / 100 / 100 / 2/2
- Payload flat ~**3.2 MiB**; image-delivery claim **~592 → ~407 KiB**
- Insights: cache ~**2,006 KiB**, render-blocking ~**610 ms**, unused JS/CSS same class, 4 long tasks

### Prior note (9:42 vs 3:29)

- Accessibility **92 → 100**; payload **~4.8 → ~3.2 MiB**
- Perf **78 → 75**; LCP **4.4 → 4.8s** — already lab noise before logo change

## External brief — Sep 12 “defer video + prioritize LCP Image” (learned 2026-09-12)

Claim: LCP 6.1s because 1.7 MB hero MP4 hogged Slow 4G; fix = (1) defer `<video>` until after LCP, (2) Next `<Image priority>` for hero banner.

| Ask | Fit for SELPIC homepage? | Status |
|-----|--------------------------|--------|
| Defer `hero-banner.mp4` / `preload=none\|metadata` | **Yes — already done** | `VideoSlide`: `shouldDeferHeroVideoNetwork()` on ≤1023px / Save-Data / slow-2g → no `<video src>` for ~2.8s (idle); then unlock. `preload="metadata"`. Poster `HeroCoverImage` first. |
| Prioritize LCP banner image | **Yes direction / wrong tool** | LCP for video slide 1 is **`fallbackImage` WebP**, not the MP4. Already: `fetchPriority="high"`, head `<link rel="preload" as="image" href={lcpHeroImageHref}>`. **Do not** convert to Next `<Image fill>` as the fix — protected Hero + intentional `<img>` onError chain. |
| Guarantee Perf **>85** from these two | **No** | Already shipped; 69/75 still lab-noise on hero. Remaining: **compress MP4 in Admin** (primary), optional longer mobile defer — not another Image rewrite. |

**Apply?** Only incremental tweaks if owner asks (e.g. longer defer, `preload="none"`). **Do not** execute the brief as a fresh Hero `next/image` refactor.

---

## External brief — Sep 12 “`<img>` / logo.png / preconnect” (learned 2026-09-12 evening)

Attached claim: Perf **69** / LCP **6.1s** because hero uses raw `<img>` instead of Next `<Image />`, plus legacy `/images/logo.png`, and missing Supabase `preconnect`.

| Claim | Is it the LCP cause? | SELPIC verdict |
|-------|----------------------|----------------|
| Hero raw `<img>` → Next `<Image fill priority>` | **No** | Live slide 1 is **`type: video`** (`hero-banner.mp4` ~**1.7 MB**) + poster WebP ~133 KB. LCP is dominated by **hero media bytes / Slow-4G timing**, not missing `next/image`. Homepage already uses intentional `<img>` + `fetchPriority="high"` / onError fallback chain (`HeroCoverImage` / `VideoSlide`). Blind Hero → `next/image` rewrite is **homepage-protection risk** and does **not** fix video LCP. |
| Purge all `/images/logo.png` → `.webp` | **No** (tiny) | Header CMS logo is already Supabase **~16.5 KB WebP**. Static `/images/logo.png` (~91 KB) may still load as **favicon / icons metadata / HeaderLogo fallback / OG** — not the LCP element. Payload stayed ~**3.2 MiB** across 75→69. Optional later; do not treat as Perf 69 fix. |
| `preconnect` to `*.supabase.co` | **No** (micro) | Optional handshake shave only. Does not explain **+1.3s LCP**. Fonts already preconnect; Supabase origin is fine to add later if measuring, but **not** the diagnosed root cause. |

**Correct reading of 69 / 6.1s:** Lab variance + **hero video/poster** on Slow 4G (same class as 9:42’s 4.8s LCP). Primary lever remains **admin smaller MP4** + existing mobile poster-first defer — **not** this three-item Next Image refactor.

**Do not implement this brief as written** without owner OK and without breaking Hero protection.

---

## External Lighthouse “refactor brief” → SELPIC mapping (learned 2026-09-11)

Generic Next/Tailwind checklists must be **adapted**. Do not blindly convert Hero to `next/image` or redesign brand.

| Brief item | Apply to SELPIC home? | Status / adaptation |
|------------|----------------------|---------------------|
| LCP = Hero in first viewport | **Yes** | LCP is hero slide 1 — often **video** (~3.2 MB MP4) + WebP fallback, not a Next `<Image />` |
| `priority` + `fetchPriority="high"` on Next Image | **Partial** | Already: plain `<img>` `fetchPriority="high"` + preload on first **image** slide. No whole-Hero `next/image` rewrite (homepage protection) |
| Explicit `sizes` on Next Image | **Skip / N/A** for Hero | Not using `next/image` on Hero; Unsplash already capped via `optimizeStorefrontImageUrl` |
| Font `display: swap` | **Done** | Root Inter only; customize fonts off `/` |
| Lazy third-party `Script` | **Low priority** | No heavy 3rd-party scripts on `/`; don’t add |
| Video hero | **Yes — top** | **Poster-first / defer MP4** on ≤1023px + Save-Data (shipped); admin trim video ≤~2 MB still helps |
| Subscribe `bg-emerald-500` → darker for contrast | **Yes — good** | `NewsletterForm` — `emerald-800` shipped |
| Sign in / Search touch ≥44–48px | **Yes — good** | Header `min-h/w-11` shipped |
| Hero title scrim for contrast | **No fill panel** | **Learned 2026-09-12 evening:** owner wants text-only + shadow; any `bg-black` title box muddies hero video/image. Don’t re-add for A11y alone |
| Company logo file shrink | **Optional / low** | Static `/logo.png` ~91 KB; LCP is hero media. Nice if easy; never ahead of hero MP4 trim |
| Header CMS logo (owner asset) | **Yes — transparent** | Preferred SELPIC ~16.5 KB WebP **with alpha**. **Perf 75→69 after upload ≠ logo** — payload flat; LCP/SI moved (hero MP4 ~1.7 MB) |
| “Refactor whole project” | **No** | Scope = storefront `/` + shared Header/Newsletter only; never accounting-sandbox |

### Apply order when implementing this brief

1. Newsletter Subscribe contrast (`emerald-700`).  
2. Header icon hit targets (`min-h/w-11` or 12).  
3. Hero video poster-first / deferred load (code) + optional admin smaller MP4.  
4. Re-run PSI vs **10:11 PM** baseline (69 / 6.1s LCP / A11y 100 / ~3.2 MiB). Expect LCP noise until hero MP4 shrinks; don’t attribute swings to header logo KB.

### Do not from this brief

- Replace Hero with `next/image` / change Framer / brand gradients / HOT ITEM.  
- Drive-by refactors across admin/accounting.  
- Re-add a filled hero title scrim for contrast (A11y already **100**; owner wants clear video).

### Still open

1. **Hero LCP** — keep poster-first; optional **admin smaller MP4** (primary LCP lever; LCP still ~4.8s).  
2. Residual image delivery ~**592 KiB** + 3rd-party cache ~**2.0 MiB**.  
3. Watch CLS / layout-shift culprits if CLS stays ≥0.03.  
4. Company logo shrink (~91 KB) — **skip unless convenient**; not a Perf priority.  
5. Gemini key / product AI — owner schedule.

### Invariant

Optimize load path; do not redesign Hero (logo, HOT ITEM, Framer, gradients). **No** filled title scrim panel — text + shadow only.

---

## Earlier snapshots

- **4:58 PM Sep 10** — Perf 74, LCP 4.8s, A11y 92, payload ~4.8 MiB (post CMS WebP).  
- **2:29 PM Sep 10** — Perf 74, A11y 83, payload ~17 MiB.  
- **1:33 PM Sep 9** — baseline Perf 51.  

Commits (trail): fonts/Swiper; cache/LCP; CSP; console; a11y+WebP `b6cc455`; realtime `5e0c11e`; contrast/cache `b504b07`.
