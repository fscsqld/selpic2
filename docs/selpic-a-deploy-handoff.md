# Selpic A — deploy handoff (internal vs public)

Last updated: 2026-08-26  
Branch with accounting WIP: `cursor/fundraising-b2b-partner-program`  
Accounting Vercel project: **`selpic-accounting`** (separate from homepage **`selpic2`**)

---

## Goal split (do not mix)

| Track | Who | When |
|-------|-----|------|
| **A — Internal deploy** | Company admins only | **Finish first** (this checklist) |
| **B — Public accounting** | Future multi-user / empty Setup → personal use | **Later**, after A is stable |

Public (B) must **not** block finishing A. Keep B as a backlog only.

---

## What is already done (A)

- [x] Order import retired (bank PDF = revenue SSOT); homepage bridge no-op
- [x] Data Management: export / import (`replaceExisting`), wipe / factory reset aligned
- [x] Setup Wizard: homepage URL optional / skippable
- [x] Selpic A access roles (full vs My Payroll vs Staff) + SSO helpers
- [x] Accounting build passes (with temporary `ignoreBuildErrors` / `ignoreDuringBuilds`)
- [x] Commits on feature branch (incl. `cb7c279`, `8bc22b2`, History fix deploy)
- [x] Separate Vercel project `selpic-accounting` (not `selpic2`)
- [x] Production URL: https://selpic-accounting.vercel.app
- [x] Deployment Protection: **SSO ON** (prod + preview)
- [x] Env on accounting: `NEXT_PUBLIC_STOREFRONT_URL=https://www.selpic.com.au`
- [x] Env on accounting: `OPENAI_API_KEY` (Production) + Redeploy
- [x] Local API key in Settings UI (browser); local `.env.local` may still lack `OPENAI_API_KEY`
- [x] Local JSON backup exists:  
  `c:\Users\fscsq\Downloads\selpic-accounting-backup-v4-2026-08-26.json`  
  (~220 KB, schema v4, **2 statements / 55 txs / 9 cash / 2 employees**)
- [x] Backup restored onto Vercel origin (IndexedDB has data — confirmed via **Run audit** + HR employees)
- [x] **Bug fixed & redeployed:** History list stayed empty because `loadStatementHistory()` was **dead code** after an early `return` in `useAccountingDashboard` mount effect. Fix: load history before cleanup; also reload when opening History tab. Deploy aliased to https://selpic-accounting.vercel.app

---

## Resume here — Track A only (internal deploy)

Do these **in order**. One item at a time.

### A1 — Confirm History after fix (5 min) ✅

Done (user confirmed fix reflected, 2026-08-26).

### A2 — Storefront points at deployed Selpic A

1. Vercel → project **`selpic2`** (homepage)  
2. Settings → Environment Variables  
3. Set **Production** (and Preview if used):  
   `NEXT_PUBLIC_ACCOUNTING_URL=https://selpic-accounting.vercel.app`  
4. **Redeploy** Production for `selpic2`  
5. https://www.selpic.com.au/admin/dashboard → **Selpic A** → Admin Access (super)  
6. Opened tab address must be **`selpic-accounting.vercel.app`** (not `localhost:3001`)  
7. Same ledger as Vercel History  

**Pass:** Admin opens protected production accounting with data.

### A3 — Role smoke (same production URL) ✅ partial

- [x] Super / accounting → full workspace  
- [x] Staff Access → `/employee/login` (Employee Login form shown; no employee account yet — login itself deferred)  
- [ ] Payroll-only → My Payroll only — **deferred** until a payroll-only admin (or employee) test account exists  

### A4 — Ops agreement (write down)

- Primary browser/profile for the company ledger  
- Weekly **Settings → Data Management → Download Backup**  
- Never rely on preview `*-fscsqlds-projects.vercel.app` URLs for the “real” ledger (different IndexedDB origin)  
- Keep Deployment Protection SSO on  

### A5 — Optional polish (not blockers for “deploy done”)

- Add `OPENAI_API_KEY` to **Preview** env if preview URLs will be used  
- Commit + push remaining local fixes (History dead-code, import error surfacing, DataBackupRestore counts) if not already on remote  
- Soft: Period Management deeper verify  

### Agreed next tech work (after A + Cash delete) — 2026-08-27

- [x] **Cash Expense single-delete UI** (local + prod verified)
- [x] **`tsc` debt cleanup** — **0 errors**; `ignoreBuildErrors` removed from `next.config.js` (2026-08-27)
- [ ] Optional: clear `eslint.ignoreDuringBuilds` after lint debt
- Rule: `.cursor/rules/accounting-tsc-debt.mdc`

### Definition: “Deploy-related work complete”

- [ ] A1 pass  
- [ ] A2 pass  
- [ ] A3 pass  
- [ ] A4 written  
- [ ] Homepage production still healthy (`selpic2` / www.selpic.com.au)  

Then stop Track A and only then start Track B.

---

## Important invariants (always)

- Accounting data = **browser IndexedDB per origin** (`localhost:3001` ≠ `selpic-accounting.vercel.app`)  
- Do **not** import `apps/accounting-sandbox` into storefront webpack  
- Revenue SSOT = **bank statement deposits**, not homepage order import  
- Verify accounting on **3001** or **selpic-accounting.vercel.app**, never homepage port alone  
- Homepage project Root = repo root; accounting Root = `apps/accounting-sandbox`  

### Key URLs / projects

| Item | Value |
|------|--------|
| Homepage prod | https://www.selpic.com.au |
| Homepage Vercel | `selpic2` |
| Accounting prod | https://selpic-accounting.vercel.app |
| Accounting Vercel | `selpic-accounting` |
| Local accounting | http://localhost:3001 |
| Local storefront (often) | http://localhost:3005 |

---

## Track B — Public accounting (backlog only; develop later)

Do **not** start until Track A checklist is done.

### Product intent

- Empty Setup → personal/business details → use  
- Multi-tenant / multi-browser safe  
- No shared company ledger in one unprotected browser DB  

### Why current app is not public-ready

- One IndexedDB per browser origin (no server ledger)  
- Unsigned SSO token (admin → accounting)  
- Weak PIN; `/api/analyze` needs auth hardening for public  
- Factory reset / wipe are dangerous without backups and tenancy  
- Temporary build ignores for types/eslint  

### Suggested build order (when starting B)

1. **Tenancy & storage** — server-side or synced ledger; never “one PC IndexedDB = product”  
2. **Auth** — real accounts (Supabase/Clerk/etc.); replace unsigned SSO  
3. **Onboarding B** — empty Setup → profile → first statement; no Selpic-internal HR defaults required  
4. **Hardening** — rate-limit `/api/analyze`, keyed API usage, no open analyze  
5. **Billing / limits** (if needed)  
6. **Remove** internal-only paths or gate behind `internal` flag  
7. **QA** — fresh browser, two users, wipe/restore, no cross-tenant leak  

### Explicit non-goals for B until designed

- Auto factory reset on user switch without confirmation  
- Sharing one Vercel SSO–protected company DB as “public SaaS”  
- Coupling public app into homepage webpack  

---

## Next agent / next session opener

Track A deploy + Cash delete are done. Remaining work is **not only** public Track B.

**Priority (learned 2026-08-27):** see `.cursor/rules/accounting-roadmap-priority.mdc`

| Resume phrase | Work |
|---------------|------|
| **「Period Management 확인부터」** | Confirm Jul/Aug cash/DL fixture (handoff 2026-08-25) |
| **「tsc 정리부터」** | Type debt → then remove `ignoreBuildErrors` |
| **「Track B 시작」** | Public multi-tenant — only when user explicitly wants B |

Do **not** assume “only public left.”
