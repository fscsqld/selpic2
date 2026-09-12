# Storefront mobile performance — Lighthouse learning

## Latest lab report — Sep 11, 2026, **3:29:13 PM** GMT+10

| Field | Value |
|-------|--------|
| URL | `https://www.selpic.com.au/` |
| Tool | PageSpeed Insights / Lighthouse **13.4.1** |
| Device | Emulated **Moto G Power**, Mobile, Slow 4G |
| Field CrUX | **No Data** |
| Weights | FCP +10, LCP +10, TBT +30, CLS +25, SI +3 |

### Score trail

| Metric | Baseline 1:33 | 10:11 | 4:58 | **Latest 3:29 (Sep 11)** |
|--------|-------------:|------:|-----:|-------------------------:|
| Performance | 51 | 67 | 74 | **78** |
| FCP | 3.3 s | 2.4 s | 1.1 s | **1.1 s** |
| LCP | 8.4 s | 5.8 s | 4.8 s | **4.4 s** |
| TBT | 420 ms | 50 ms | 100 ms | **30 ms** |
| SI | 7.7 s | 9.3 s | 8.8 s | **7.3 s** |
| CLS | 0 | 0 | 0.002 | **0.002** |
| Payload | ~14.5 MiB | ~14.2 | ~4.8 | **~4.8 MiB** |
| Image delivery (claimed) | — | ~213 KiB | ~393 KiB | **~393 KiB** |
| Accessibility | 98 | 98 | 92 | **92** |
| Best Practices | 96 | 96 | 100 | **100** |
| SEO | 100 | 100 | 100 | **100** |
| Agentic | — | — | 2/2 | **2/2** |

**Read:** Contrast/cache deploy (`b504b07`) correlated with **Perf 74 → 78**, **LCP 4.8 → 4.4s**, **TBT 100 → 30ms**, **SI 8.8 → 7.3s**. Payload flat (~4.8 MiB). A11y stays **92** with contrast still flagged (lab may sample hero video pixels under pink overlay, or other nodes) — do not rip Hero design for 100. Next CWV lever remains **hero video defer / poster-first**.

### What improved (3:29 vs 4:58)

- Performance **74 → 78**
- LCP **4.8s → 4.4s**; SI **8.8s → 7.3s**; TBT **100 → 30ms**
- Render-blocking claim **~930ms → ~720ms**
- BP / SEO / Agentic held at 100 / 100 / 2/2

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
| “Refactor whole project” | **No** | Scope = storefront `/` + shared Header/Newsletter only; never accounting-sandbox |

### Apply order when implementing this brief

1. Newsletter Subscribe contrast (`emerald-700`).  
2. Header icon hit targets (`min-h/w-11` or 12).  
3. Hero video poster-first / deferred load (code) + optional admin smaller MP4.  
4. Re-run PSI vs **3:29** baseline (78 / 4.4s LCP / A11y 92).

### Do not from this brief

- Replace Hero with `next/image` / change Framer / brand gradients / HOT ITEM.  
- Drive-by refactors across admin/accounting.  
- Chase A11y 100 by redesigning Hero video frames.

### Still open

1. **Hero video** defer / poster-first on mobile (primary LCP/SI lever).  
2. Newsletter Subscribe contrast + Header touch mins (from brief — good to ship next).  
3. Residual image delivery ~393 KiB + 3rd-party cache ~3.2 MiB.  
4. Gemini key / product AI — owner schedule.

### Invariant

Optimize load path; do not redesign Hero (logo, HOT ITEM, Framer, gradients). Text scrim OK.

---

## Earlier snapshots

- **4:58 PM Sep 10** — Perf 74, LCP 4.8s, A11y 92, payload ~4.8 MiB (post CMS WebP).  
- **2:29 PM Sep 10** — Perf 74, A11y 83, payload ~17 MiB.  
- **1:33 PM Sep 9** — baseline Perf 51.  

Commits (trail): fonts/Swiper; cache/LCP; CSP; console; a11y+WebP `b6cc455`; realtime `5e0c11e`; contrast/cache `b504b07`.
