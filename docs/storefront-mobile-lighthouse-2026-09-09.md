# Storefront mobile performance — Lighthouse learning

## Latest lab report — Sep 10, 2026, **2:29:13 PM** GMT+10

| Field | Value |
|-------|--------|
| URL | `https://www.selpic.com.au/` |
| Tool | PageSpeed Insights / Lighthouse **13.4.1** |
| Device | Emulated **Moto G Power**, Mobile, Slow 4G |
| Field CrUX | **No Data** |
| Weights | FCP +10, LCP +8, TBT +29, CLS +25, SI +2 |

### Score trail

| Metric | Baseline 1:33 | Mid 10:11 | 1:26 | **Latest 2:29** |
|--------|-------------:|----------:|-----:|----------------:|
| Performance | 51 | 67 | 73 | **74** |
| FCP | 3.3 s | 2.4 s | 1.1 s | **1.1 s** |
| LCP | 8.4 s | 5.8 s | 5.2 s | **4.7 s** |
| TBT | 420 ms | 50 ms | 120 ms | **120 ms** |
| SI | 7.7 s | 9.3 s | 7.0 s | **8.9 s** |
| CLS | 0 | 0 | 0 | **0.002** |
| Payload | ~14.5 MiB | ~14.2 MiB | ~13.9 MiB | **~17.1 MiB** |
| Accessibility | 98 | 98 | 98 | **83** |
| Best Practices | 96 | 96 | 96 | **96** |
| SEO | 100 | 100 | 100 | **100** |

**Read:** Hero image WebP compress (ops) helped **LCP 5.2 → 4.7s** and Perf **73 → 74**. **Regressions to learn:** payload **~17 MiB** and SI **8.9s** (likely hero **MP4 ~3.2 MB** + other media in lab); A11y **83** (names/contrast/video captions). Image-delivery insight jumped to ~**12.6 MiB** claimed savings — treat video + remaining large assets as next class, not only Unsplash.

### What improved (verified)

- Perf **51 → 74**; FCP **1.1s** held; LCP **8.4 → 4.7s**.
- Live hero images (2–3) and hero-1 fallback already WebP under ~150 KB (ops CMS).

### Why some PSI audits still fail

| PSI still says | Live check | Likely reason |
|----------------|------------|---------------|
| Image delivery ~12.6 MiB | Hero MP4 + category/other PNGs | Video on critical path; below-fold still large |
| Cache lifetimes ~13 MiB | Own static immutable | Mostly 3rd-party / CDN TTL |
| Enormous payload ~17 MiB | — | Video + full page media; lab single load |
| Console errors | Dead URL guards shipped | Residual 3rd-party / realtime / remaining CMS |
| CSP not effective vs XSS | CSP present | `'unsafe-inline'`/`'unsafe-eval'` for Next — expected |
| Trusted Types | Not shipped | Deferred |
| A11y **83** @ 2:29 (was ~98) | Names / contrast / video captions | **Fix shipped locally:** Header icon `aria-label`s; hero pagination buttons; video captions track; footer contrast bump — re-run PSI after deploy |
| Agentic browsing 1/2 | a11y tree | Follow a11y cleanup |

### Remaining priorities (learned @ 2:29)

1. **Defer / poster-first hero video on mobile** — LCP on WebP fallback; do not redesign Hero.  
2. **Cut payload** — category hero PNGs (1.7–2.4 MB), any other multi‑MB assets; product AI already `encodeStorefrontWebp`.  
3. **A11y 83** — Header names + hero video captions + pagination buttons + footer contrast (local fix; needs deploy + PSI recheck).  
4. Console hygiene + CMS dead URLs.  
5. ~~Gemini key~~ — tomorrow (owner). Strict CSP / Trusted Types — later.

### Earlier today batches

- Fonts / Swiper / public SWR; Unsplash optimize; CSP/COOP; dead Unsplash guards; CMS hero WebP ops.  
- Product AI post-b64 WebP encode (`encodeStorefrontWebp`) — code may still need deploy if not shipped yet.

### Invariant

Optimize load path; do not redesign Hero (logo, HOT ITEM, Framer, gradients).

---

## Earlier snapshots

- **1:26 PM** — Perf 73, LCP 5.2s, payload ~13.9 MiB.  
- **10:11 AM** — Perf 67 (fonts/Swiper/CMS cache).  
- **1:33 PM Sep 9** — baseline Perf 51.  

Commits (trail): `cd6b32f` fonts/Swiper; `7546cbb` cache/LCP/`main`/W2.5; `47867f1` CSP/COOP; `80a85fb`/`38b7a88` console/LCP Unsplash.
