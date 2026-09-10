# Storefront mobile performance — Lighthouse learning

## Latest lab report — Sep 10, 2026, **1:26:02 PM** GMT+10

| Field | Value |
|-------|--------|
| URL | `https://www.selpic.com.au/` |
| Tool | PageSpeed Insights / Lighthouse **13.4.1** |
| Device | Emulated **Moto G Power**, Mobile, Slow 4G |
| Field CrUX | **No Data** |

### Score trail

| Metric | Baseline 1:33 | Mid 10:11 | **Latest 1:26** |
|--------|-------------:|----------:|----------------:|
| Performance | 51 | 67 | **73** |
| FCP | 3.3 s | 2.4 s | **1.1 s** |
| LCP | 8.4 s | 5.8 s | **5.2 s** |
| TBT | 420 ms | 50 ms | **120 ms** |
| SI | 7.7 s | 9.3 s | **7.0 s** |
| CLS | 0 | 0 | **0** |
| Payload | ~14.5 MiB | ~14.2 MiB | **~13.9 MiB** |
| Accessibility | 98 | 98 | 98 |
| Best Practices | 96 | 96 | 96 |
| SEO | 100 | 100 | 100 |

Weights (1:26): FCP +10, LCP +6, TBT +29, CLS +25, SI +3 → FCP win + still-good TBT lifted Perf to **73**; **LCP 5.2s** remains the CWV gap.

### What improved (verified live)

- Perf **51 → 73** (+22 vs baseline); FCP **3.3 → 1.1s**; LCP **8.4 → 5.2s**; SI **7.0s**; payload ~13.9 MiB.
- Probed after BP deploy: HTML has `<main id="main-content">`; CSP + COOP present; `/_next/static` → `max-age=31536000, immutable`.

### Why some PSI audits still fail

| PSI still says | Live check | Likely reason |
|----------------|------------|---------------|
| No `main` landmark | `<main id="main-content">` in HTML | Lab false negative / a11y-tree timing — **not missing in prod** |
| CSP not effective vs XSS | Full CSP with `default-src`/`script-src` | Audit wants **no** `'unsafe-inline'`/`'unsafe-eval'` — Next still needs them → expected until nonce CSP |
| Console errors | Header amplifier fixed | Residual CMS media 404s / 3rd-party — Chrome still logs failed resources |
| Trusted Types | Not shipped | Deferred (high breakage) |
| Cache lifetimes ~10.5 MiB | Own static assets immutable | Savings often **3rd-party** (Unsplash/Supabase) TTL we don’t control |
| Image delivery ~191 KiB | Optimizer live | Remaining large CMS / non-Unsplash assets |
| Render-blocking ~700 ms | Fonts off `/` | Residual critical CSS |

### Remaining priorities

1. ~~**Google Gemini key**~~ — **deferred to tomorrow** (owner).  
2. **LCP / console (today)** — skip dead media URLs before request; tighter Unsplash w/q; LCP `decoding=sync` + preload first hero image. Prefer Supabase/self-host in CMS for further LCP (ops).  
3. **Console ops** — fix remaining 404 URLs in Admin CMS media.  
4. Strict CSP / Trusted Types — larger follow-up.  
5. Wave 6+ / W3 after Google A/B.

### Today batch (2+3 combined) — 2026-09-10

Recommendation learned: do **image delivery + console** together — skipping non-requestable URLs cuts Failed-to-load noise and wasted LCP bytes.

- `isRequestableStorefrontMediaUrl` / `resolveStorefrontImageSrc`  
- Hero Unsplash max **1080 / q55**; category **720**  
- LCP img `decoding="sync"`; `<link rel="preload" as="image">` for first slide  
- Video: skip `sample-videos.com` / upgrade http  

### Invariant

Optimize load path; do not redesign Hero (logo, HOT ITEM, Framer, gradients).

---

## Earlier snapshots

- **10:11 AM** — Perf 67 (fonts/Swiper/CMS cache).  
- **1:33 PM Sep 9** — baseline Perf 51.  

Commits: `cd6b32f` fonts/Swiper; `7546cbb` cache/LCP/`main`/W2.5; `47867f1` CSP/COOP/Header console.
