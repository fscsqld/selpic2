# Storefront mobile performance — Lighthouse learning (2026-09-09)

## Source (baseline — pre mobile-perf deploy)

| Field | Value |
|-------|--------|
| URL | `https://www.selpic.com.au/` |
| Report time | **Sep 9, 2026, 1:33:42 PM** GMT+10 |
| Tool | PageSpeed Insights / Lighthouse **13.4.1** |
| Device | Emulated **Moto G Power**, smartphone / Mobile |
| Network | **Slow 4G** throttling |
| Browser | HeadlessChromium 151.0.7922.71 with lr |
| Session | Single page, initial page load |
| Field data (CrUX) | **No Data** — lab-only |

> This snapshot is the **before** baseline. Mobile-perf batch (`cd6b32f`) deployed ~14:04 GMT+10. A **new** PSI run after that deploy is required to measure delta.

## Scores

| Category | Score | Notes |
|----------|------:|-------|
| Performance | **51** | Lab estimate; primary phone-slowness signal |
| Accessibility | **98** | Missing `<main>` landmark (best-practice item) |
| Best Practices | **96** | Console errors logged; CSP / COOP / Trusted Types gaps |
| SEO | **100** | Structured data: manual check only |
| Agentic Browsing | **2/2** | Passed (category still experimental) |

## Core metrics (why it feels slow on phone)

| Metric | Value | Score weight (this run) | Role |
|--------|------:|------------------------:|------|
| FCP | **3.3 s** | +4 | First paint late |
| LCP | **8.4 s** | **+1** | Hero/main visual very late — **primary pain** |
| TBT | **420 ms** | +20 | Main-thread JS blocking |
| CLS | **0** | +25 | Stable (keep this) |
| Speed Index | **7.7 s** | +3 | Most content paints slowly |

Score bands: 0–49 / 50–89 / 90–100. Performance **51** sits at the low end of “needs improvement.”

## Insights (lab) → codebase → status

| Lighthouse insight | Est. savings | Likely Selpic cause | Safe? | Status after `cd6b32f` |
|--------------------|-------------:|---------------------|-------|------------------------|
| **Render-blocking requests** | ~**3,000 ms** | Global Google Fonts CSS in root; other critical CSS | Yes | Fonts scoped off `/`; residual CSS still possible |
| **Improve image delivery** | ~**263 KiB** | Hero / category oversized or remote Unsplash | Careful | First-slide `fetchPriority`; leaner Unsplash q; more compression optional |
| **Use efficient cache lifetimes** | ~**10,456 KiB** | Layout `no-cache` meta; CMS `no-store` + `?cb=` | Yes | Public site-config SWR; drop home `?cb=`; asset CDN cache still review |
| **Avoid enormous network payloads** | **14,565 KiB** total | Images + JS + fonts + CMS media | Incremental | Fonts off critical path; payload still huge — next focus |
| Reduce JS execution time | **2.0 s** | Client homepage + hydrate | Yes | Swiper deferred; more islands later |
| Minimize main-thread work | **3.5 s** | Same + Framer / store sync | Partial | Keep Hero motion; don’t grow `/` tree |
| Avoid long main-thread tasks | **9** long tasks | Swiper init, hydrate, sync | Partial | Swiper dynamic import done |
| Reduce unused CSS | ~**361 KiB** | Global + Swiper effect CSS | Yes | Next: route-level CSS; don’t strip Hero styles |
| Minify CSS | ~**30 KiB** | Unminified or duplicated | Low | Build pipeline / audit later |
| Reduce unused JavaScript | ~**51 KiB** | Unused modules on `/` | Yes | Continue code-split |
| Legacy JavaScript | ~**12 KiB** | Polyfills for modern browsers | Low | Bundle analysis later |
| Optimize DOM size | — | Large homepage tree | Partial | Cap lists; no new first-viewport widgets |
| Forced reflow | — | Layout thrash during load | Investigate | Trace if LCP stays high |
| LCP breakdown | — | Late LCP element (hero after CMS) | Yes | Faster CMS + LCP priority (done); remeasure |
| Network dependency tree | — | Chain: HTML → CSS/fonts → CMS → image | Yes | Fonts + cache cut chain; watch CMS |
| 3rd parties | — | Unsplash, fonts, analytics if any | Careful | No new render-blocking 3P on `/` |

## Accessibility / Best Practices (non-perf but learned)

| Finding | Action |
|---------|--------|
| Document does not have a **main landmark** | Wrap storefront content in `<main>` without Hero redesign |
| Browser errors logged to the console | Fix noisy errors on `/` (separate pass) |
| CSP / COOP / Trusted Types | Hardening later — don’t block CWV work |
| SEO structured data | Manual validator only; score already 100 |

## Invariant (learned)

Mobile first paint and LCP must not wait on **unused** CDN fonts, **no-store** of every public asset, or **entire-page** client bundles. Hero look (logo, HOT ITEM, Framer, gradients) stays protected — optimize **load path**, not design.

## Cousins (future regressions)

- Empty CMS → Hero placeholder wait again  
- Cold CDN / multiple hero slides  
- Re-adding sitewide Google Fonts in `app/layout.tsx`  
- New heavy `'use client'` on `/` or global Swiper CSS  
- `?cb=Date.now()` / `Cache-Control: no-store` on public marketing GETs  
- Accounting-sandbox pulled into storefront webpack  

## Shipped in mobile-perf batch (`cd6b32f`)

1. Font scoping — root Inter only; customize/stamp layouts load Google fonts  
2. Public site-config short cache (`s-maxage=30`, SWR); drop perpetual home `?cb=`  
3. `LazyHomeSwiper` — static first-slide shell, then Swiper chunk  
4. LCP: `fetchPriority="high"` on first hero image; leaner Unsplash fallback  
5. Rule: `.cursor/rules/storefront-mobile-performance.mdc`

## Live verify — font scoping on production (2026-09-09 ~16:06 GMT+10)

Probed HTML while PSI still “working” — **font optimization is already live** (independent of Google’s report finish).

| URL | `fonts.googleapis.com` in HTML | Expected |
|-----|-------------------------------:|----------|
| `https://www.selpic.com.au/` | **0** | Yes — homepage must not load machine fonts |
| `https://www.selpic.com.au/stickers/customize` | **many** (sticker CSS links + preconnect) | Yes — customize-only via `GoogleFontsLinks` |

Code path: `app/layout.tsx` comment + Inter only; fonts mounted from `app/stickers/customize/layout.tsx` (and sibling customize/stamp layouts), not root. Commit: `cd6b32f` (still on prod after docs deploy `0d7e6d1`).

## Parallel work while PSI is still running (learned 2026-09-09 ~16:13)

Do **not** block product work on Google’s report UI. Fonts (and batch 1) are already live; PSI only measures.

| Track | Start now? | Why |
|-------|------------|-----|
| **W2 Google image provider** | **Yes (preferred)** | Design ready (`docs/agent-product-image-providers-design.md`); HITL; no Hero; independent of CWV |
| **Wave 6+ automation** | Only if trust is enough | Cron auto-draft / gated auto-publish — needs Community HITL trust; higher product risk |
| Perf batch 2 (images/CSS/payload) | **After** PSI numbers | Blind tuning wastes time; paste report then prioritize |
| `<main>` / console cleanup | Optional filler | Tiny, safe; can interleave anytime |

**Default while waiting:** start **W2** (or say which track). Paste PSI when ready → update this doc deltas → then perf 2 if still needed.

## Recommended next (after post-deploy PSI)

1. Record Perf / FCP / LCP / TBT / total KiB vs Sep 9 **1:33** baseline  
2. If LCP still >> 4s: image delivery + residual render-blocking CSS  
3. Payload budget (~14.5 MiB class)  
4. Unused CSS split; `<main>` landmark; console-error cleanup  

## Re-measure checklist

- [ ] New report time **after** ~14:04 GMT+10 deploy (not this 1:33 baseline)  
- [ ] Same: Mobile, Slow 4G, `https://www.selpic.com.au/`  
- [ ] Compare: Performance, FCP, LCP, TBT, SI, network payload  
- [ ] Spot-check customize Font 1–7 still load  
