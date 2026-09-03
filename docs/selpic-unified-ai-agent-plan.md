# SELPIC Unified AI Agent — concrete plan

**Updated:** 2026-09-03 (Wave 5 SELPIC N AU calendar + daycare/kinder inclusive drafts)  
**Status:** Wave 1–4 **shipped**. Wave 5 Community drafts **HITL v1.1** (calendar suggestions → Approve → publish). Wave 6+ auto-draft/publish slots not started.  
**Related:** `.cursor/rules/fundraising-ai-sales-agent.mdc` (fundraising outreach v1) · `docs/fundraising-session-handoff.md`

Language: **UI/copy = English**; this doc may be discussed in Korean with the user.

---

## 0. Direct answers (product intent)

### 0.1 What we recommended — and yes, it is **phased**

**Recommendation in one sentence:** build a **governed Agent Core** that plugs into admin dashboard **sectors one by one**, starting with **Fundraising outreach** (real send + conversion), then add CS drafts, performance insights, and SELPIC N / community publishing — **not** a single unsupervised bot that rewrites the homepage or moves money.

| Question | Answer |
|----------|--------|
| Is this “add everything later, step by step”? | **Yes.** Phased / wave-based. Each wave ships a thin vertical slice, QA’s, then the next sector mounts on the same core. |
| Is Fundraising email the end goal? | **No.** It is the **first production sector** because the funnel and Resend/audit paths already exist. |
| Will the agent eventually manage many dashboard sectors? | **Yes, by design** — as **sector plugins** (Messages, Bespoke, Orders triage, Analytics coach, Community / SELPIC N, Newsletter), not one giant prompt. |
| Auto reply to customers / auto post news? | **Goal yes; default = draft → human Approve → publish/send.** Fully auto only where policy + permission explicitly allow (e.g. fundraising cold outreach send with `fundraising:write`). |
| Homepage Hero / checkout / Selpic A ledger? | **Out of auto scope forever** unless a future explicit project changes that. |

### 0.2 How advanced companies do this (patterns we transplant)

Leading enterprise agent platforms (orchestration hubs such as Verint Agent Factory–style CX hybrid workforces, monday-style workspace agents, NURA / Jio-style governed HITL hubs) converge on the same architecture SELPIC should copy **in miniature**:

1. **One orchestration hub** — not 10 disconnected chatbots.  
2. **Sector / skill agents** — support, marketing, ops each have tools + data boundaries.  
3. **Human-in-the-loop (HITL)** — consequential actions pause for Approve / Edit / Reject; some actions **never** auto-approve (money, legal, brand homepage).  
4. **RBAC matched to existing roles** — agent may only do what that admin’s permissions already allow.  
5. **Immutable audit** — who approved what, when.  
6. **Grounded knowledge** — answers cite approved playbooks / catalog / FAQs, not free hallucination.  
7. **Observability** — queues, failure clusters, cost/latency — not just “the model said so”.

SELPIC transplant: `/admin/agent` hub + sector adapters + existing `requireAdminPermission` + `logAdminActivity` + Resend + (later) community/CMS draft APIs. **No** need to buy an external Agent OS on day one.

### 0.3 User vision map → SELPIC surfaces

| Vision (user examples) | SELPIC surface | Wave | Autonomy default |
|------------------------|----------------|------|-------------------|
| Auto-collect AU schools + daily mass email | outreach_targets + cron send | **Later (not v1)** | Needs licensed lists, daily quota, opt-out; **not** open-web scrape in A1–A3 |
| Bot watches admin sectors; helps when errors / ops noise | Agent hub + sector health cards (API errors, inbound spikes) | Wave 2–3 | Alert + suggested fix; admin applies |
| First-line answer when future customers ask | Messages / Bespoke (+ optional storefront help widget later) | Wave 3 | **Draft reply**; human Send |
| Performance → concrete improvement tasks | Sales overview + Traffic + Fundraising Impact/Payout read models | Wave 4 | **Playbook drafts** (“promote X”, “restock Y”); human decides |
| Periodic company news / SELPIC N auto posts | `/admin/community` (+ public `/community`); newsletter optional mirror | Wave 5 | **Draft post** → Approve → publish; optional scheduled publish after trust |
| AU events / parent–student topics synthesised for visitors | Community categories + fundraising landing FAQ/news block (not homepage Hero) | Wave 5+ | Research → draft with sources → Approve; copyright/fair-use review |

Exact copy, topics, and calendars are **out of scope until the user requests content briefs** — this plan only locks **where** and **how** automation attaches.

---

## 1. How to proceed (recommended order)

Do **not** start by rewriting the homepage or building a mega “do everything” agent.

| Order | Phase | Outcome |
|------:|-------|---------|
| 0 | **Lock safety rules** (this doc §4–5) | Homepage / checkout / accounting stay untouched |
| 1 | **Fundraising Agent v1** (existing 3-step plan) | Real outreach → apply attribution → admin monitor |
| 2 | **Agent Core (platform)** | Shared runtime under `/admin/agent` + sector plugins |
| 3 | **Sector adapters** (one at a time) | CS drafts → performance coach → community / SELPIC N → … |
| 4 | **Optional later** | Suggest-only helpers for orders/CMS (never auto-edit homepage) |

**Why this order:** fundraising already has apply → partner → Lookup → payout. The first agent must **attach to that funnel** without breaking organic apply. Once send / target / conversion plumbing works, the same **core** (jobs, audit, permissions, Resend, rate limits, draft inbox) can power other admin Quick Action sectors — including the CS bot and SELPIC N writer you described.

**Branch policy**

- Fundraising v1: `feature/ai-fundraising-agent` (protects live site).
- Platform core (when Phase 2 starts): either continue on that branch or `feature/selpic-agent-core` after fundraising Step 1–3 QA.
- Ship to **`main` only when asked**, after smoke tests. Production deploys from `main`.

**Resume signal:** 「개발 시작하자」 → implement **Fundraising Step 1 only**, then stop for review unless told to continue.

---

## 2. Product vision (simple outreach → unified ops agent)

### 2.1 Not just “email marketing”

| Level | Name | What it does | What it must **not** do |
|-------|------|----------------|-------------------------|
| **v1** | Fundraising Outreach Agent | B2B email to AU orgs → `?ref=ai_agent&target_id=` → apply → `CONVERTED` | Auto-approve partners, auto Mark Paid, auto sample dispatch, edit homepage |
| **v2** | Agent Core + Fundraising sector | Shared job queue, draft inbox, audit, permissions; hub + Fundraising nav | Bypass `requireAdminPermission` |
| **v3** | Multi-sector unified agent | CS drafts, performance playbooks, SELPIC N / community drafts, newsletter assists | Silent money moves, CMS homepage edits, accounting-sandbox imports, uncited news scrape-publish |

Long-term north star matches the user’s examples: **one bot-shaped Agent that watches dashboard sectors**, drafts first replies, proposes performance work from real metrics, and prepares community / company news — with **Approve gates** so admins stay in control while saving time.

### 2.2 Value prop (fundraising copy — keep consistent)

- Org: zero cost, zero forced sales quota  
- Families: ~5% community discount  
- Org: ~15% Fundraising Cashback Grant (AU FY quarterly)  
- SELPIC: print, ship, CS  

### 2.3 North-star UX

Admin opens **one Agent hub** on the dashboard (new Quick Action later), picks a **sector**, sees:

1. **Observability** — queues, failures, conversion, last runs  
2. **Drafts** — emails / replies / summaries the agent prepared  
3. **Actions** — explicit human **Approve / Send / Apply** (default); auto-send only where a sector policy allows (fundraising cold outreach may allow send with `fundraising:write`)  
4. **Audit** — every mutation → `logAdminActivity`

---

## 3. Current state (learned inventory)

### 3.1 Fundraising — already shipped (do not re-litigate)

- Public: `/fundraising` apply, `/fundraising/lookup` OTP portal  
- Admin: Partners, Settings, Impact, Grant Tracker (`fundraising:finance`), Documents  
- Change requests, D22 fillable PDF (email = HTML only), controlled bank updates  
- Settlements / Mark Paid rules, sample kit opt-in (never auto)  
- Ops E2E locked cycle **passed** — do not re-run unless code that path changes  

**Gaps for agent v1:** no `outreach_targets`, no landing UTM/`ref` capture, no `payload.acquisition`, no `/admin/fundraising/agent`, no `/api/admin/agent/send`.

### 3.2 Admin dashboard Quick Actions (sectors the agent can eventually serve)

| Sector | Route | Permission | Agent fit (later) |
|--------|-------|------------|-------------------|
| Users | `/admin/users` | `users:read` | Low — PII; suggest only |
| Products | `/admin/products` | `products:read` | Later — catalog drafts |
| CMS / Content | `/admin/content` | `content:read` | **Never auto-edit storefront homepage** |
| Images | `/admin/images` | `images:read` | Low |
| Orders | `/admin/orders` | `orders:read` | Triage summaries; no silent refunds |
| Integrations | `/admin/integrations` | `integrations:read` | Health checks |
| Sales overview | `/admin/sales-overview` | `analytics:read` | Read dashboards |
| Traffic | `/admin/traffic` | `traffic:read` | Attribution views |
| Messages | `/admin/messages` | `messages:read` | **v3 inbound draft replies** |
| Bespoke | `/admin/bespoke-requests` | `bespoke:read` | Draft intake summaries |
| Newsletter | `/admin/newsletter` | `newsletter:read` | Assist campaigns; separate from B2B school outreach |
| Documents | `/admin/documents` | `documents:read` | Draft customer PDFs |
| **Fundraising** | `/admin/fundraising/partners` | `fundraising:read` | **v1 home** |
| Invoices | `/admin/invoices/preview` | `invoices:read` | Later |
| Community | `/admin/community` | `community:read` | Moderation assists |
| Administrator settings | `/admin/administrator-settings` | `admin:manage` | **Out of scope** for agent |
| Admin settings | `/admin/settings` | `settings:personal` | Out of scope |
| Selpic A | external | `accounting:read` | **HTTP/SSO only** — never import sandbox |

Fundraising sub-nav today (no Agent link yet): Partners · Settings · Impact · Grant Tracker · Documents.

### 3.3 Reusable building blocks (use these; do not reinvent)

- Email: `sendEmailViaResendServer` (`lib/email/resendServer.ts`) only  
- Persist: Supabase JS + `lib/fundraising/persistence.ts` JSONB `payload`  
- Auth: `requireAdminPermission` / fundraising API permission helpers  
- Audit: `logAdminActivity`  
- Admin UI patterns: `FundraisingAdminShell`, Zustand `lib/fundraising/store.ts`  
- Inbound badges on dashboard (contact / bespoke / newsletter / community / orders / fundraising)

---

## 4. Homepage & storefront safety (non-negotiable)

### 4.1 Homepage (`app/page.tsx`)

**Do not change:** Hero, giant SELPIC logo styling, HOT ITEM badge, Framer Motion / parallax, existing gradients, existing imports/state used by Hero.

**Do not** put agent capture, chat widgets, or UTM logic on the homepage.

**Allowed:** keep existing footer link to `/fundraising` as-is. All agent landing work lives on **`/fundraising`** (and later sector-specific public pages if any).

### 4.2 Independence & money paths

- Never import `apps/accounting-sandbox/**` into storefront `app/` / `components/` / root `lib/`  
- Do not change checkout / promo engines for fundraising outreach  
- Do not auto-dispatch sample kits  
- Do not let partners PUT bank details from Lookup (405 stays)  
- Partner-facing URLs: production host `https://www.selpic.com.au`

### 4.3 Backward compatibility

- Organic apply (no query string) must keep working **100%**  
- All acquisition / UTM fields **optional (`?`)** on partner payload  
- `useSearchParams` on `/fundraising` must be wrapped in `<Suspense>` (Next App Router)

---

## 5. Failure modes to design against (precision list)

| Risk | How it shows up | Prevention |
|------|-----------------|------------|
| Homepage / Hero break | Blank home, missing logo, Fast Refresh loop | Never touch `app/page.tsx` for agent work |
| Organic apply regression | Apply 500 / missing partners when UTM absent | Optional fields; unit test apply with **no** query params |
| Double CONVERTED / spam re-apply | Same `target_id` applied twice | Idempotent update of acquisition; don’t create duplicate partners blindly |
| Permission hole | Staff send mass B2B mail | Gate send with `fundraising:write` (v1); later `agent:run` + sector keys |
| Legacy alias surprise | `analytics:read` still implies fundraising | Do not rely on analytics for agent send; explicit fundraising/agent perms |
| Resend rate limit / spam | Domain reputation damage | Throttle/batch; status `PENDING→CONTACTED→FAILED`; opt-out field |
| Email wrong host | Links to localhost in prod mail | Reuse existing partner-facing URL helpers |
| Suspense / CSR crash | `/fundraising` white screen | Suspense boundary around search-param capture |
| Zustand vs Supabase skew | Admin sees partner local-only | Keep existing apply upsert pattern; don’t invent second store |
| Audit blind spot | Super-admin can’t see who mailed schools | `logAdminActivity` on send / status change |
| Scope creep into Mark Paid | Agent “helps” finance | Agent never calls settlement paid; finance stays human + `fundraising:finance` |
| Coupling to newsletter | School B2B mixed with consumer newsletter | Separate tables/APIs; shared Resend helper only |
| Accounting 500 / wrong port | Dev tests on 3000 vs 3001 | Agent never loads sandbox; Selpic A stays external |
| Deploy from wrong branch | Fixes on feature, prod on `main` | Cherry-pick / merge to `main` only when asked |

---

## 6. Architecture (unified, fundraising-first)

```
┌──────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                              │
│  Quick Actions → [Fundraising] … later [AI Agent hub]        │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ Agent Core (Phase 2+)   /admin/agent                         │
│  · sectors registry · jobs/runs · drafts · rate limits       │
│  · Resend adapter · logAdminActivity · permission checks     │
└───┬───────────────┬──────────────────┬───────────────────────┘
    │               │                  │
    ▼               ▼                  ▼
 Fundraising     Inbound           Newsletter
 sector (v1)     (messages/        assist (v3)
                 bespoke)          
    │
    ├── outreach_targets (Supabase)
    ├── /admin/fundraising/agent  (also linked from FundraisingAdminNav)
    ├── capture on /fundraising ?ref=&target_id=
    └── POST /api/admin/agent/send (or /api/admin/fundraising/agent/send)
```

**Plugin contract (per sector) — design now, implement later**

```ts
// Conceptual — not implemented yet
type AgentSector = {
  id: 'fundraising' | 'inbound' | 'newsletter' | ...
  label: string
  requiredPermission: AdminPermission // e.g. fundraising:write
  listTargets?: () => Promise<...>
  draftAction?: (...) => Promise<Draft>
  executeAction?: (...) => Promise<Result> // always permission-checked
  publicCapture?: 'fundraising-landing' | null
}
```

v1 implements **only** the fundraising sector behaviours (even if files live under `app/api/admin/agent/*` for future reuse).

---

## 7. Concrete build plan (linked to current 3 steps)

### Phase A — Fundraising Agent v1 (existing plan, unchanged order)

| Step | Scope | Files / artefacts (expected) |
|------|--------|------------------------------|
| **A1** | Schema + landing capture + apply acquisition + optional CONVERTED | `docs/fundraising-outreach-targets.sql`; small capture on `/fundraising` + Suspense; `POST /api/fundraising/apply` optional fields; partner `payload.acquisition?` |
| **A2** | Admin monitor UI | `/admin/fundraising/agent`; link in `FundraisingAdminNav`; list/filter targets by status |
| **A3** | Send API | `/api/admin/agent/send` (or fundraising-scoped path); Resend; throttle; `PENDING→CONTACTED→CONVERTED/FAILED`; `logAdminActivity` |

**Permissions (v1):** read UI with `fundraising:read`; create/send/update with `fundraising:write`. Do **not** require `system:admin`. Finance stays separate.

**Deploy:** one merge to `main` after A1–A3 QA (or A1 alone if user wants incremental prod — prefer full v1 together).

### Phase B — Agent Core (platform)

| Step | Scope |
|------|--------|
| **B1** | `/admin/agent` hub page + dashboard Quick Action (“AI Agent”) gated by new `agent:read` **or** temporarily `fundraising:read` until multi-sector |
| **B2** | Shared types: `agent_runs`, drafts, sector id; SQL docs under `docs/` |
| **B3** | Move fundraising send/monitor behind sector adapter without breaking A-routes (redirects OK) |
| **B4** | **DONE (Wave 3):** `agent:read` / `agent:run` in catalog + `permissionUtils`; hub/API/dashboard on `agent:read` (legacy aliases for fundraising/messages/bespoke read). Rule: `.cursor/rules/selpic-agent-permissions.mdc`. |

### Phase C — More sectors (human-approve by default)

| Priority | Sector | First capability |
|----------|--------|------------------|
| 1 | Fundraising | Already A1–A3 |
| 2 | Messages / Bespoke | Draft reply + summary; **human send** |
| 3 | Performance coach | Read Sales / Traffic / Fundraising Impact → task drafts |
| 4 | Community / SELPIC N | Research + draft posts; **Approve → publish** |
| 5 | Newsletter | Suggest subject/body; separate from school outreach_targets |
| 6 | Orders | Exception queue summary; no auto refund |
| — | CMS / Homepage | **Draft only in CMS**, never auto-publish homepage Hero |
| — | Administrator / Settings / Payroll | **Excluded** |

### Phase C detail — waves aligned to the “bot across sectors” vision

These waves are **additive**. Each reuses Agent Core (draft inbox, HITL Approve, audit, permissions). Content calendars and article briefs are requested later; waves only reserve **plumbing**.

#### Wave 1 — Fundraising Outreach (current A1–A3)

- Cold B2B email + conversion tracking.  
- Proves: Resend, permissions, activity log, optional public capture **off homepage**.

#### Wave 2 — Agent Core hub

- `/admin/agent` + dashboard Quick Action.  
- Fundraising stats + sector cards (`lib/agent/sectors.ts`).  
- **Permission:** Phase **B4 done** — hub uses `agent:read` (legacy aliases until JWTs updated).

#### Wave 3 — Customer Care draft bot (Messages + Bespoke)

- **Status:** **HITL live (verified ops 2026-08-31)** — `/admin/agent/inbound` + `POST /api/admin/agent/inbound/draft` (template drafts, **not LLM**).  
- **Entry:** Messages/Bespoke **Draft with Agent** → `?channel=message|bespoke&id=` deep-link; hub attention banner + sector cards.  
- Admin: **Edit → Send** via `emailService.sendResponse` + status PATCH; audit `agent_inbound_draft_sent`; send gated by `messages:write` / `bespoke:write`.  
- Intent hint classifier (payment → shipping → print/sticker product → fundraising → order → general). Escalation tone for payment disputes. Contact print/sticker copy asks size/qty/artwork (HITL still).  
- Deep-link loads **replied/closed** rows via single GET (not only default queue). Rule: `.cursor/rules/selpic-agent-inbound-wave3.mdc`.  
- **Wave 3 close (template era):** sticker-print Contact templates shipped. Optional later (not blocking): LLM grounding, storefront help widget, ops alert cards.

#### Wave 4 — Performance coach (Sales / Traffic / Fundraising Impact)

- **Status:** **v1 live (2026-09-01)** — `/admin/agent/performance` + `GET /api/admin/agent/performance`.  
- On-demand ranked **opportunity cards** from existing Supabase data (no new tables).  
- v1 rules: stale fundraising pending (>7d), bank transfer pending, traffic up + flat conversion, weekly revenue down.  
- Never auto Mark Paid, never auto change prices without `products:write` + human confirm.  
- Rule: `.cursor/rules/selpic-agent-performance-wave4.mdc`.  
- Optional later: nightly cron, PDP-level traffic, LLM draft promo copy.

#### Wave 5 — SELPIC N / Community content agent

- **Status:** **HITL v1.2 (2026-09-03)** — `/admin/agent/community` Queue + Compose; `POST …/queue` `generate_week` enqueues calendar drafts (**not** auto-publish).  
- Target: public **Selpic N** board (`/community`) for AU families, schools, kindergarten/kinder, daycare / early learning.  
- Pipeline: curated topic (calendar-ranked) → **admin-pasted source notes** → draft (English) → Admin **Approve & publish** → `POST /api/admin/community/posts` (`community:write`).  
- **Topic design:** daycare/kinder **integrated** into back-to-care drafts; **Market S** specials use separate topic `market_s_event` (CTA `/hot-goods`, calendar-suggested in gifting windows only). Use `custom_brief` for one-off stories.  
- Audit: `agent_community_draft_published`. Rule: `.cursor/rules/selpic-agent-community-wave5.mdc`.  
- **Roadmap:** v5 = suggest + draft + HITL publish; Wave 6+ = optional cron auto-draft / pre-approved auto-publish slots — never homepage Hero.  
- Policy: no ToS-violating scrape; cite sources; no medical/legal/political campaign copy.

#### Wave 6+ — Deeper automation (only after trust)

- Scheduled auto-publish for **pre-approved** community templates.  
- Storefront FAQ bot with hard escalation to Messages.  
- Multi-language drafts if locale strategy expands.

---

### Autonomy ladder (applies to every sector)

| Level | Behaviour | When to use |
|------:|-----------|-------------|
| L0 | Observe / report only | New sector, low trust |
| L1 | Draft for human | Default for CS, community, CMS, performance tasks |
| L2 | Auto-send / auto-publish within policy | Fundraising outreach send; later trusted community slots |
| L3 | Closed-loop ops without human | **Not planned** for money, bank, payroll, homepage Hero |

Industry parallel: HITL is the centerpiece, not a toggle someone can prompt around — encode Approve gates in **API routes**, not only in the model prompt.

### Phase D — Fundraising optional QA (parallel, not blockers)

From handoff — only if time / before large agent UI:

1. Multi-partner CR inbox isolation  
2. Grant history scoped vs Clear  
3. Live `/fundraising` personalised-sample checkbox (default off)

Do **not** re-run locked partner E2E unless agent/apply/bank paths change.

---

## 8. Data model sketch (A1)

### `outreach_targets` (new Supabase table)

Suggested columns (finalize in SQL doc at implement time):

- `id` (uuid / text pk)  
- `organization_name`, `contact_email`, `contact_name?`, `org_type?`, `state?`  
- `status`: `PENDING` \| `CONTACTED` \| `CONVERTED` \| `FAILED` \| `OPTED_OUT`  
- `last_sent_at`, `last_error?`  
- `converted_partner_id?`  
- `payload` jsonb (notes, template id, meta)  
- `created_at`, `updated_at`  

### Partner `payload.acquisition?` (optional)

```ts
acquisition?: {
  ref?: string        // e.g. 'ai_agent'
  targetId?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  capturedAt?: string // ISO
}
```

Organic apply: omit entirely.

---

## 9. Admin UX placement

**Now (v1):** Fundraising nav → **Agent** → `/admin/fundraising/agent`  
**Soon (v2):** Dashboard Quick Action → **AI Agent** → `/admin/agent` with sector tabs; Fundraising tab deep-links to same data  
**Never:** public homepage chat that mutates admin data without auth

---

## 10. Definition of done (Fundraising v1)

- [ ] Organic apply without query params succeeds  
- [ ] Apply with `?ref=ai_agent&target_id=<id>` stores `acquisition` and sets target `CONVERTED` once  
- [ ] Re-apply same target does not corrupt partner / does not spam-convert  
- [ ] Agent UI lists statuses; send requires `fundraising:write`  
- [ ] Resend failures recorded; activity log has send entries  
- [ ] Homepage Hero unchanged; no accounting-sandbox imports  
- [ ] Sample kit still opt-in only  

---

## 11. Explicit non-goals (until asked)

- Autopilot Mark Paid / bank Save / D16 send  
- Autopilot CMS publish or homepage redesign  
- Nodemailer / SendGrid  
- ORM layer  
- Merging newsletter consumer lists with school outreach_targets  
- Building production-platform “SalesAgent” settlement types (`lib/types/production-platform-extended.ts`) into this agent — different product lineage; ignore unless user asks to unify later  

---

## 12. Session checklist when starting build

1. Read this file + `.cursor/rules/fundraising-ai-sales-agent.mdc` + fundraising handoff  
2. Create/checkout `feature/ai-fundraising-agent`  
3. Implement **A1 only**  
4. Recommend commit message; wait for user before A2  
5. Commit / push / deploy **only when user asks**  

---

**End of plan.** Next user action: confirm vision, then **「개발 시작하자」** for Step A1.
