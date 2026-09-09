# Storefront mobile performance — Lighthouse learning (2026-09-09)

Source: PageSpeed Insights mobile, `https://www.selpic.com.au/`, Sep 9 2026 ~13:33 GMT+10  
Device: Emulated Moto G Power, Lighthouse 13.4.1, Slow 4G, HeadlessChromium.

## Scores (snapshot)

| Category | Score |
|----------|------:|
| Performance | **51** |
| Accessibility | 98 |
| Best Practices | 96 |
| SEO | 100 |

## Core metrics (why it feels slow on phone)

| Metric | Value | Meaning |
|--------|------:|---------|
| FCP | 3.3 s | First text/image paint late |
| LCP | **8.4 s** | Main hero/visual appears very late (primary pain) |
| TBT | 420 ms | Main thread blocked (JS) |
| CLS | 0 | Layout stable (good) |
| Speed Index | 7.7 s | Most content paints slowly |

Score weights in this run: TBT +20, CLS +25, LCP +1, FCP +4, SI +3 — **LCP is the standout failure**.

## Insights → codebase mapping → can we fix?

| Lighthouse insight | Est. savings | Likely cause in Selpic | Safe to fix? | Notes |
|--------------------|-------------:|------------------------|--------------|-------|
| Render-blocking requests | ~3,000 ms | Global Google Fonts + CSS in root layout (pre-font-scope fix); other CSS | **Yes** | Fonts scoped to customize routes (done locally). Don’t re-globalize. |
| Improve image delivery | ~263 KiB | Hero/category oversized or remote images | **Yes** (careful) | Compress/resize; keep Hero look; prefer same-origin. |
| Use efficient cache lifetimes | ~10,456 KiB | `no-cache` meta in layout; `cache: 'no-store'` + cache-bust on CMS | **Yes** | Short SWR for public config; don’t break admin freshness. |
| Avoid enormous network payloads | 14.5 MiB total | Images + JS + fonts + CMS assets | **Yes** (incremental) | Cap hero slide weight; lazy below-fold. |
| Reduce JS execution / main-thread / long tasks | 2.0–3.5 s / 9 tasks | `'use client'` homepage + Swiper + Zustand hydrate | **Yes** (medium) | Dynamic import Swiper; don’t rewrite Hero. |
| Reduce unused CSS / minify CSS | ~361 + 30 KiB | Global CSS + Swiper effect CSS | **Yes** | Route-level CSS imports. |
| Reduce unused JS / legacy JS | ~51 + 12 KiB | Bundled polyfills / unused modules | **Yes** (low) | Bundle analysis later. |
| Optimize DOM size | — | Large homepage tree | **Partial** | Avoid growing `/` further. |
| Forced reflow / LCP breakdown | — | Late LCP element (hero image after CMS) | **Yes** | Faster CMS path + LCP image priority. |
| Accessibility: no `main` landmark | — | Homepage structure | **Yes** (small) | Wrap content in `<main>` without Hero redesign. |
| Best Practices: console errors / CSP | — | Runtime noise / headers | **Later** | Separate hardening pass. |

## Already aligned / in progress

- Route-scoped Google Fonts (`GoogleFontsLinks` + customize/stamp layouts); root layout Inter only.
- Cursor rule: `.cursor/rules/storefront-mobile-performance.mdc` (always apply).

## Recommended fix order (no Hero redesign)

1. ~~Deploy font scoping~~ → done in mobile perf batch  
2. ~~Public site-config short cache / drop perpetual `?cb=` on home~~  
3. ~~Dynamic-import Swiper on home~~ (+ static first-slide LCP shell)  
4. ~~Image weight + LCP `fetchPriority=high` on first hero slide~~  
5. Optional next: `<main>` landmark; further CSS split; payload budget  

## Re-measure

After deploy: PSI mobile on production URL; record Performance, FCP, LCP, TBT, total weight vs Sep 9 baseline (Perf 51 / LCP 8.4s).
