# Product image AI providers — removable design (SELPIC)

**Updated:** 2026-09-08  
**Status:** **W1 shipped in code** (OpenAI behind provider interface). Google provider not shipped (W2).  
**Default (recommended until admin A/B decides otherwise):** OpenAI **`gpt-image-2`** via existing HITL pipeline.  
**Optional later:** Google **Gemini 2.5 Flash Image (Nano Banana)** behind the same interface.  
**Accounting:** unchanged — `apps/accounting-sandbox` keeps its own `OPENAI_API_KEY` (statement parsing). Never couple.

Language: Admin UI = English. This doc may be discussed in Korean.

---

## 0. Product decision (locked)

| Decision | Choice |
|----------|--------|
| Catalog main-shot default | **OpenAI `gpt-image-2`** (edit preferred when https source exists) |
| Photo Brief UI | **Free template only** (not a billed image provider) |
| Google Nano Banana | **Optional second provider** after adapter exists — not a forced cutover |
| When admin decides a winner | **Remove the loser cleanly** via checklist below — no dead imports, no broken Save/Apply |
| HITL | Generate → Supabase Media URL → **Apply** (form) → **Save product** (catalog). Never auto-catalog |
| Storage | Supabase `SELPIC_CONTENTS` + Media Library — **not** AWS S3 |
| Homepage Hero | **Out of scope forever** for this feature |

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

### W2 — Google adapter (optional, behind flag)

1. Add `GOOGLE_GEMINI_API_KEY` to `.env.example` + Vercel when user asks.  
2. Implement Google adapter (`gemini-2.5-flash-image` or env override).  
3. Map inline image bytes → same `b64` contract.  
4. Pricing estimate branch.  
5. Default provider **remains openai** until user sets `AGENT_IMAGE_PROVIDER=google`.  
6. Admin A/B: same SKU, both providers, compare identity drift / retries.  
7. Docs: how to flip provider; link removal checklist §3.

**Exit:** Flipping env switches provider without UI code change.

### W3 — Admin decision → remove loser (§3.A or §3.B)

1. Follow checklist.  
2. Deploy.  
3. Update this doc status.

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
| 「구글 제거」 / 「OpenAI 이미지만」 | §3.A |
| 「Wave 4.5 시작」 | Site Review S0 (parallel track) |

---

**End of design.** Next code step when asked: **W1**.
