# Storefront mobile performance — Lighthouse learning

## Post-deploy report (primary) — Sep 10, 2026, 10:11:17 AM GMT+10

| Field | Value |
|-------|--------|
| URL | `https://www.selpic.com.au/` |
| Tool | PageSpeed Insights / Lighthouse **13.4.1** |
| Device | Emulated **Moto G Power**, Mobile, Slow 4G |
| Browser | HeadlessChromium 151.0.7922.71 with lr |
| Field CrUX | **No Data** |

### Scores vs baseline (Sep 9 **1:33** PM)

| Category / metric | Baseline 1:33 | **After 10:11** | Delta |
|-------------------|-------------:|----------------:|------:|
| Performance | 51 | **67** | **+16** |
| Accessibility | 98 | 98 | — |
| Best Practices | 96 | 96 | — |
| SEO | 100 | 100 | — |
| Agentic Browsing | 2/2 | 2/2 | — |
| FCP | 3.3 s | **2.4 s** | **−0.9 s** |
| LCP | 8.4 s | **5.8 s** | **−2.6 s** |
| TBT | 420 ms | **50 ms** | **−370 ms** |
| CLS | 0 | 0 | — |
| Speed Index | 7.7 s | **9.3 s** | +1.6 s (lab noise / below-fold) |
| Network payload | ~14,565 KiB | **~14,167 KiB** | −~400 KiB |

Score weights (10:11): FCP +7, LCP +4, TBT +30, CLS +25, SI +1 → **TBT win drove most of the +16**; LCP still the main CWV gap (5.8 s ≫ 2.5 s “good”).

### Precise analysis (what worked / what remains)

| Insight (10:11) | Est. | Verdict | Action |
|-----------------|-----:|---------|--------|
| Improve image delivery | ~213 KiB | Still material; Unsplash `w=2070` CMS/defaults | **Fix:** `optimizeStorefrontImageUrl` caps Unsplash to w≤1200/q60 on Hero/category |
| Use efficient cache lifetimes | ~10,456 KiB | **Root cause:** `next.config` `/:path*` **no-store** overwrote `_next/static` + public API SWR | **Fix:** immutable cache for `/_next/static`; drop no-store override on public catalog/site-config; media public SWR |
| Render-blocking requests | (listed) | Fonts already off `/`; residual CSS | Monitor after deploy |
| Enormous network payloads | ~14.2 MiB | Mostly CMS/media + below-fold images | Incremental; same-origin media later |
| Unused CSS | ~21 KiB | Was ~361 KiB — large win from font/Swiper scope | Low priority |
| Unused JS | ~51 KiB | Still | Further islands later |
| Legacy JS | ~12 KiB | Polyfills | Low |
| Long main-thread tasks | **5** (was 9) | Swiper defer helped | Keep not growing `/` |
| LCP breakdown / discovery | — | Hero image still late on Slow 4G | Image size + cache + priority (done); remeasure |
| DOM size | — | Large home tree | Don’t grow first viewport |
| **main landmark** | A11y | Missing | **Fix:** wrap home sections in `<main id="main-content">` |
| Console errors / CSP | BP 96 | Separate hardening | Later |

### Invariant (unchanged)

Optimize **load path**, not Hero look (logo, HOT ITEM, Framer, gradients protected).

---

## Baseline (pre mobile-perf) — Sep 9, 2026, 1:33:42 PM

Kept for delta comparison only. See git history / earlier sections in prior commits for full baseline tables.

Shipped batch 1 (`cd6b32f`): font scoping, site-config SWR, LazyHomeSwiper, LCP `fetchPriority`.

## Perf batch 2 (this learning cycle) — code

1. `lib/optimizeStorefrontImageUrl.ts` — Unsplash downsize on Hero/category  
2. `next.config.js` — `/_next/static` immutable; stop killing public API caches  
3. `app/api/media/public` — short SWR  
4. Homepage `<main>` landmark  

## Re-measure checklist (after batch 2 deploy)

- [ ] PSI mobile again on `https://www.selpic.com.au/`  
- [ ] Expect: cache-lifetime savings drop; image-delivery savings drop; Perf maybe 70+ if LCP improves  
- [ ] Confirm `/_next/static/...` response header `max-age=31536000`  
- [ ] Confirm `/api/site-config/public` not forced `no-store` by config  
- [ ] A11y: main landmark passes  
- [ ] Customize fonts still load; Hero look unchanged  
