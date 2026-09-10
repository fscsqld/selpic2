# Product image AI providers — removable design (SELPIC)

**Updated:** 2026-09-10  
**Status:** **W1 + W2 + W2.5 shipped in code** (adapters + Admin UI provider picker). Google option disabled until Gemini key. Default remains OpenAI.  
**Default until A/B ends:** OpenAI **`gpt-image-2`** for images when OpenAI selected / configured.  
**Optional:** Google **Gemini 2.5 Flash Image** via `googleGeminiImage.ts`.  
**Accounting:** unchanged — sandbox keeps its own `OPENAI_API_KEY`. Never couple.

Language: Admin UI = English. This doc may be discussed in Korean.

---

## 0. Product decision (locked)

| Decision | Choice |
|----------|--------|
| **Text polish** (Inbound / Community / Newsletter / descriptions) | **OpenAI only** — not part of image A/B |
| Catalog main-shot **image** default | OpenAI `gpt-image-2` until admin picks a winner |
| Photo Brief UI | **Free template only** (not a billed image provider) |
| Google Nano Banana | Second **image** provider for A/B — not a forced cutover |
| **A/B phase (learned 2026-09-10)** | Admin **chooses provider per Generate** in Products HITL UI (OpenAI \| Google), while both keys exist. Same SKU can be tried on both. CTA label stays **Generate / Edit with AI**. |
| **After A/B (W3)** | Pick one winner → **delete the loser cleanly** (§3.A or §3.B) — no dead UI options, no leftover env |
| HITL | Generate → Supabase Media URL → **Apply** (form) → **Save product**. Never auto-catalog |
| Storage | Supabase `SELPIC_CONTENTS` + Media Library — **not** AWS S3 |
| Homepage Hero | **Out of scope forever** for this feature |

### 0.1 Why UI choice then delete (learned)

Owner intent: keep using OpenAI for general agent work; for **product images** try Google while comparing; later **keep one image provider and remove the other**.

That matches the removable-plugin shape:

1. **Both adapters live** behind the same `{ ok, b64, provider, model, mode }` contract.  
2. **During A/B:** UI sends `provider: 'openai' | 'google'` on `imagery-generate` (preferred). Server validates key for that provider; if missing → clear English 503. Env `AGENT_IMAGE_PROVIDER` = **default** when UI omits provider (backward compatible).  
3. **After decision:** follow §3 — delete loser module + env + UI option; Apply/Save/Media untouched.  
4. Do **not** force a global env-only flip for A/B (hard to compare side-by-side). Do **not** couple text Polish to the image picker.

**Invariant:** Removing a provider never breaks catalog Save or Hero. Usage hub keeps historical runs (`provider` field; legacy = openai).

---

## 1. Why this shape (removal-safe)

Today image gen is **hard-wired** to OpenAI inside `lib/agent/productImageryGenerate.ts`.  
If we later “delete Google” or “delete OpenAI images” by ripping files without a boundary, risks are:

- UI still showing a dead provider label  
- `AGENT_IMAGE_PROVIDER=google` left on Vercel → 500 on Generate  
- Usage hub assuming only OpenAI pricing  
- Half-removed imports → build/type errors  
- Apply/Save confused with provider (must stay provider-agnostic)

**Invariant:** UI + Media + Apply + Save depend only on **`{ ok, b64|error, provider, model, mode }`**.  
Providers are **plugins**. Removing a plugin = delete one module + env + docs row — not the Products form.

---

## 2. Target architecture

```
ProductImageryAiAssist (UI)
  → POST /api/admin/products/imagery-generate
      → resolveImageProvider(env)     // openai | google | disabled
      → provider.generateOrEdit({ prompt, sourceImageUrl })
      → upload Supabase + Media Library (unchanged)
      → appendAgentRun({ kind:'image', provider, model, ... })
  → return { imageUrl, mode, model, provider, autonomyNote }
  → Apply → formData.image only
  → Save product → catalog
```

### 2.1 Shared contract (stable; do not break on removal)

```ts
// Conceptual — implement under lib/agent/productImage/

export type ProductImageProviderId = 'openai' | 'google'

export type ProductImageGenResult =
  | {
      ok: true
      mode: 'edit' | 'generate'
      b64: string
      model: string
      provider: ProductImageProviderId
    }
  | { ok: false; error: string; provider?: ProductImageProviderId }

export type ProductImageProvider = {
  id: ProductImageProviderId
  isConfigured(env: NodeJS.ProcessEnv): boolean
  generateOrEdit(opts: {
    prompt: string
    sourceImageUrl?: string
    env?: NodeJS.ProcessEnv
    fetchImpl?: typeof fetch
  }): Promise<ProductImageGenResult>
}
```

- **Prompt SSOT** stays shared: `buildImageEditPrompt` + `sanitizeImagePrompt` + Photo brief checklist lines (provider-agnostic).  
- **OpenAI adapter** = move current Images API calls.  
- **Google adapter** = Gemini `gemini-2.5-flash-image` (or pinned successor id) — separate file.  
- **Router** = `resolveProductImageProvider(env)`:

| Env | Behaviour |
|-----|-----------|
| `AGENT_PRODUCT_IMAGE_GEN=0` | Disabled (both) |
| `AGENT_IMAGE_PROVIDER=openai` or unset | OpenAI if `OPENAI_API_KEY` |
| `AGENT_IMAGE_PROVIDER=google` | Google if `GOOGLE_GEMINI_API_KEY` (or `GEMINI_API_KEY` alias) |
| Provider selected but key missing | Clear 503 JSON — **no throw into UI stack** |
| Unknown provider string | Fall back to **openai** + `console.warn` (never crash build) |

### 2.2 What must stay provider-blind

- `ProductImageryAiAssist.tsx` — no `if (openai)` branches except optional read-only badge `provider` from API  
- Imagery-generate upload / Media tags (`ai-generated`)  
- Apply / Save / `logAdminActivity`  
- Catalog / Hero / accounting-sandbox  

### 2.3 Usage / cost (survivable history)

Extend image run records with optional:

- `provider?: 'openai' | 'google'`

**Parse old rows without `provider` as `openai`.**  
Removing Google later must **not** delete historical runs or break hub aggregation — unknown provider → bucket `other` / label “legacy”.

Pricing: `estimateImageCostUsd(model, provider?)` — Google flat ~$0.039; OpenAI keep ~$0.05 medium ballpark. Missing provider → existing flat.

### 2.4 UI copy (English)

- Button stays **Generate / Edit with AI** (not “OpenAI” / “Gemini” in the primary CTA).  
- Optional small status: `Provider: OpenAI · gpt-image-2` from API response (helps A/B).  
- Photo Brief button unchanged (template).

---

## 3. Clean removal checklists (future)

### 3.A Remove Google (keep OpenAI) — after admin rejects Nano Banana

1. Set Vercel / `.env`: `AGENT_IMAGE_PROVIDER=openai` (or delete the var).  
2. Remove `GOOGLE_GEMINI_API_KEY` from Vercel (all envs).  
3. Delete `lib/agent/productImage/googleGeminiImage.ts` (name TBD).  
4. Remove `'google'` from union **or** keep in type as deprecated unused (prefer remove + fix switch exhaustiveness).  
5. Drop Google rows from `.env.example` + this doc section.  
6. Grep: `GOOGLE_GEMINI|gemini-2.5-flash-image|Nano Banana|provider === 'google'`.  
7. `tsc` + Generate smoke on Products.  
8. **Do not** touch Apply/Save, Media, Brief, accounting.

### 3.B Remove OpenAI **image** path only (keep Google + keep OpenAI text polish)

1. `AGENT_IMAGE_PROVIDER=google` + Gemini key present.  
2. Delete OpenAI Images adapter only — **keep** `agentOpenAiChat` for Polish.  
3. `isProductImageGenEnabled` must **not** require `AGENT_DRAFT_LLM` / chat key if only Google images remain (today image gen incorrectly shares global draft kill — fix in adapter work: **image kill ≠ draft kill** for multi-provider).  
4. Grep: `images/edits|images/generations|gpt-image|AGENT_IMAGE_MODEL`.  
5. Usage hub still shows chat OpenAI + image Google.  
6. Accounting sandbox untouched.

### 3.C Remove **all** product image AI

1. `AGENT_PRODUCT_IMAGE_GEN=0` **or** hide Assist panel behind flag `NEXT_PUBLIC_PRODUCT_IMAGE_AI=0`.  
2. Prefer flag hide over deleting component in first pass (rollback).  
3. Full delete later: Assist mount sites (`products/page`, `PhoneCaseManager`), routes `imagery-generate`, adapters, tests.  
4. Keep Media upload manual path.  
5. Grep + typecheck.

**Rule:** Removal PRs touch **adapter + env + docs + grep**, never Hero, never accounting, never catalog Save semantics.

---

## 4. Cousins / edge cases (ship with adapter)

- Provider A succeeds upload then client navigates away — Media orphan OK (already).  
- Google returns text-only / blocked — map to `{ ok:false, error }` English.  
- Source image not https — generate mode (same as today).  
- SynthID / C2PA — document for ops; no catalog block.  
- In-memory 8/day limit — keep per admin, provider-agnostic.  
- Vercel Hobby cold start — keys from env only.  
- Multi-admin devices — runs in `site_configs`, provider field optional.  
- Pin model ids in env: `AGENT_IMAGE_MODEL`, `AGENT_GOOGLE_IMAGE_MODEL` so vendor renames don’t require code hunt.

---

## 5. Work to do (detailed sequence)

Do **not** start Google cutover before **W1**. Wave 4.5 Site Review is a **parallel track** (see handoff); pick order with the user.

### W0 — Already done (do not redo)

- HITL Generate/Edit + Media + Apply + Save  
- Default model `gpt-image-2`  
- Photo Brief = template  
- Agent usage logging (OpenAI-shaped)  
- Accounting separate OpenAI  

### W1 — Provider adapter (OpenAI only behind interface) — **next recommended code**

**Goal:** Same behaviour, removable boundary. No Google yet.

1. Extract shared prompt helpers (keep tests).  
2. Add `ProductImageProvider` + OpenAI adapter (move current fetch).  
3. Router + `AGENT_IMAGE_PROVIDER` (default `openai`).  
4. Decouple image enable from “all draft LLM off” **carefully**:  
   - Keep `AGENT_PRODUCT_IMAGE_GEN=0` as image master kill.  
   - Global `AGENT_DRAFT_LLM=0` should still kill **OpenAI chat polish**; decide explicitly whether it kills OpenAI **images** (document: recommend **yes for openai provider**, **no effect on google** once added).  
5. Extend `AgentRunRecord` with optional `provider`; normalize old rows.  
6. API response includes `provider` + `model`.  
7. Unit tests: router fallback, sanitize, fingerprint-free enable matrix.  
8. Stop for review / smoke Products Generate.

**Exit:** Grep shows no Images API calls outside OpenAI adapter file.

### W2 — Google adapter (optional, behind flag) — **shipped 2026-09-09**

1. ~~Add `GOOGLE_GEMINI_API_KEY` to `.env.example`~~ (+ `GEMINI_API_KEY` alias, `AGENT_GOOGLE_IMAGE_MODEL`)  
2. ~~Implement Google adapter~~ — `lib/agent/productImage/googleGeminiImage.ts` (`gemini-2.5-flash-image`)  
3. ~~Map inline image bytes → same `b64` contract~~  
4. ~~Pricing estimate branch~~ — `estimateImageCostUsd(model, 'google')` ≈ $0.039  
5. Default provider **remains openai** until `AGENT_IMAGE_PROVIDER=google`  
6. Admin A/B: same SKU, both providers, compare identity drift / retries (ops)  
7. Flip without UI code change (below)

**Exit:** Flipping env switches provider without UI code change.

#### How to flip to Google (ops)

```bash
# .env.local or Vercel Production
AGENT_IMAGE_PROVIDER=google
GOOGLE_GEMINI_API_KEY=...          # or GEMINI_API_KEY=
# optional:
AGENT_GOOGLE_IMAGE_MODEL=gemini-2.5-flash-image
```

- Leave unset / `openai` → OpenAI path (needs `OPENAI_API_KEY`; also respects `AGENT_DRAFT_LLM=0`).  
- Google path ignores `AGENT_DRAFT_LLM` (image ≠ draft kill).  
- Master kill still: `AGENT_PRODUCT_IMAGE_GEN=0`.  
- UI CTA stays **Generate / Edit with AI**; result badge shows `provider · model`.  
- Removal later: §3.A / §3.B.

### W2.5 — Admin UI provider picker (A/B) — **shipped 2026-09-10**

1. ~~Products HITL: Image provider OpenAI | Google~~ (`ProductImageryAiAssist`)  
2. ~~`POST imagery-generate` accepts `provider`~~; env = default when omitted  
3. ~~Result badge `provider · model`~~  
4. ~~Last choice in `localStorage` (`selpic-product-image-provider`)~~  
5. When only one provider remains after W3, remove the control (or hard-code)  
6. ~~Tests: override, missing key, availability GET~~  
7. ~~`GET /api/admin/products/imagery-generate`~~ — configured flags + hint (no secrets)

**Exit:** Same admin can Generate with OpenAI now; with Google after key — no env flip required for A/B.

### W3 — Admin decision → remove loser (§3.A or §3.B)

1. Follow checklist (delete adapter + env + UI option).  
2. Deploy.  
3. Update this doc status — A/B closed.

### W4 — (Parallel) Wave 4.5 Site Review

Unrelated to image provider; see `docs/agent-site-review-wave45-handoff.md`.  
Site Review may **deep-link** to Products Assist — must stay provider-blind (only opens Assist).

---

## 6. Explicit non-goals

- Replacing Inbound/Community/Newsletter/description OpenAI Polish with Google  
- Moving accounting statement parsing to Gemini  
- Auto-Save catalog after Generate  
- Editing homepage Hero  
- Building a second Media pipeline for Google  

---

## 7. Resume signals

| User says | Start |
|-----------|--------|
| 「이미지 어댑터 시작」 / 「W1 시작」 | Provider split (OpenAI behind interface) |
| 「구글 이미지 붙이자」 / 「W2 시작」 | Nano Banana adapter + env |
| 「UI에서 선택」 / 「W2.5」 / 「A/B 선택」 | Admin image provider picker + per-request override |
| 「구글 제거」 / 「OpenAI 이미지만」 | §3.A |
| 「OpenAI 이미지 제거」 / 「구글만」 | §3.B |
| 「Wave 4.5 시작」 | Site Review S0 (parallel track) |

---

**End of design.** Next when asked: add Gemini key → smoke Google · then **W3** remove loser after A/B.
