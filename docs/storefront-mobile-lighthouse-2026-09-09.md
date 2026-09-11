# Storefront mobile performance — Lighthouse learning

## Latest lab report — Sep 10, 2026, **4:58:07 PM** GMT+10

| Field | Value |
|-------|--------|
| URL | `https://www.selpic.com.au/` |
| Tool | PageSpeed Insights / Lighthouse **13.4.1** |
| Device | Emulated **Moto G Power**, Mobile, Slow 4G |
| Field CrUX | **No Data** |
| Weights | FCP +10, LCP +8, TBT +29, CLS +25, SI +2 |

### Score trail

| Metric | Baseline 1:33 | 10:11 | 1:26 | 2:29 | **Latest 4:58** |
|--------|-------------:|------:|-----:|-----:|----------------:|
| Performance | 51 | 67 | 73 | 74 | **74** |
| FCP | 3.3 s | 2.4 s | 1.1 s | 1.1 s | **1.1 s** |
| LCP | 8.4 s | 5.8 s | 5.2 s | 4.7 s | **4.8 s** |
| TBT | 420 ms | 50 ms | 120 ms | 120 ms | **100 ms** |
| SI | 7.7 s | 9.3 s | 7.0 s | 8.9 s | **8.8 s** |
| CLS | 0 | 0 | 0 | 0.002 | **0.002** |
| Payload | ~14.5 MiB | ~14.2 | ~13.9 | **~17.1** | **~4.8 MiB** |
| Image delivery (claimed) | — | ~213 KiB | ~191 KiB | **~12.6 MiB** | **~393 KiB** |
| Accessibility | 98 | 98 | 98 | **83** | **92** |
| Best Practices | 96 | 96 | 96 | 96 | **100** |
| SEO | 100 | 100 | 100 | 100 | **100** |
| Agentic | — | — | — | 1/2 | **2/2** |

**Read:** Ops CMS WebP (hero + category) + a11y deploy worked. **Payload 17 → ~4.8 MiB** and image-delivery claim **12.6 MiB → 393 KiB** are the clearest wins. Perf stays **74** because **LCP ~4.8s** / SI still dominate the weighted score; remaining LCP likely **hero video (~3.2 MB)** + critical path, not multi‑MB PNGs.

### What improved (4:58 vs 2:29)

- Accessibility **83 → 92** (icon names, captions track, footer contrast).
- Best Practices **96 → 100**; Agentic **2/2**; console errors gone in this lab.
- Network payload **~17 MiB → ~4.8 MiB**; image-delivery insight collapsed.
- TBT slightly better (120 → 100 ms).

### Still open

1. **Hero video** defer / poster-first on mobile (LCP/SI).  
2. Residual image delivery ~393 KiB + 3rd-party cache.  
3. ~~A11y residual contrast~~ — **patched locally** (hero/category scrim, solid SELPIC N title, footer gray-300, header logo text); needs deploy + PSI recheck.  
4. Cache micro: site-config **60s/300 SWR**; `/media`, logo, apple-touch long cache — deploy to measure. Render-blocking ~930ms mostly Next CSS/font — Inter already `swap`+preload; do not pull Google Fonts onto `/`.  
5. Gemini key / product AI — tomorrow (owner).  

### Invariant

Optimize load path; do not redesign Hero (logo, HOT ITEM, Framer, gradients).

---

## Earlier snapshots

- **2:29 PM** — Perf 74, A11y 83, payload ~17 MiB (pre category WebP).  
- **1:26 PM** — Perf 73, LCP 5.2s.  
- **10:11 AM** — Perf 67.  
- **1:33 PM Sep 9** — baseline Perf 51.  

Commits (trail): fonts/Swiper; cache/LCP; CSP; console/Unsplash; a11y+WebP encode `b6cc455`; realtime recursion `5e0c11e`; plus CMS ops WebP.
