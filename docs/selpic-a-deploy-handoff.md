# Selpic A — deploy handoff (internal vs public)

Last updated: 2026-08-28  
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

### A2 — Storefront points at deployed Selpic A ✅ (2026-08-28)

1. Vercel → project **`selpic2`** — `NEXT_PUBLIC_ACCOUNTING_URL=https://selpic-accounting.vercel.app` (**Production**, verified via `vercel env pull`)
2. **Redeploy** Production for `selpic2` — deployment `dpl_5T4ky3gxLSYW4RvFi2QrWQRaVNZe` → https://www.selpic.com.au
3. **You verify (browser):** https://www.selpic.com.au/admin/dashboard → **Selpic A** → **Admin Access** → tab URL must be **`selpic-accounting.vercel.app`** (not `localhost:3001`) and show the same ledger as prod History

**Pass:** Admin opens protected production accounting with data.

### A3 — Role smoke (same production URL) ✅ partial

- [x] Super / accounting → full workspace  
- [x] Staff Access → `/employee/login` (Employee Login form shown; no employee account yet — login itself deferred)  
- [ ] Payroll-only → My Payroll only — **deferred** until a payroll-only admin (or employee) test account exists  

### A4 — Ops agreement (written 2026-08-28)

**Canonical ledger origin:** https://selpic-accounting.vercel.app only.  
Do **not** treat `localhost:3001` or long preview URLs (`*-fscsqlds-projects.vercel.app`) as the company books — each origin has its own IndexedDB.

| Rule | Detail |
|------|--------|
| **Primary browser** | One agreed Chrome/Edge profile on the company PC for daily accounting |
| **Weekly backup** | Settings → Data Management → **Download Backup** (JSON v4); store off-machine |
| **Admin entry** | https://www.selpic.com.au/admin → Selpic A → Admin Access (SSO token) |
| **Deployment Protection** | Keep Vercel SSO **on** for `selpic-accounting` prod + preview |
| **Restore** | Import backup only on `selpic-accounting.vercel.app` (or agreed recovery PC on same origin) |
| **Staff phones** | No company backup import on personal devices — Track B for server-backed My Payroll |

### A5 — Optional polish (not blockers for “deploy done”)

- Add `OPENAI_API_KEY` to **Preview** env if preview URLs will be used  
- Commit + push remaining local fixes (History dead-code, import error surfacing, DataBackupRestore counts) if not already on remote  
- Soft: Period Management deeper verify  

### Agreed next tech work (after A + Cash delete) — 2026-08-27

- [x] **Cash Expense single-delete UI** (local + prod verified)
- [x] **`tsc` debt cleanup** — **0 errors**; `ignoreBuildErrors` removed from `next.config.js` (2026-08-27)
- [x] **ESLint during builds** — **0 errors** (~61 warnings); `ignoreDuringBuilds` removed (2026-08-27)
- Rule: `.cursor/rules/accounting-tsc-debt.mdc`, `.cursor/rules/accounting-eslint-debt.mdc`

### Definition: “Deploy-related work complete”

- [x] A1 pass  
- [x] A2 env + redeploy (user browser check: Admin Access → `selpic-accounting.vercel.app`)  
- [ ] A3 pass (payroll-only — deferred until test account)  
- [x] A4 written  
- [x] Homepage production healthy (`selpic2` / www.selpic.com.au redeployed 2026-08-28)  

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
2. **Auth** — real accounts (Supabase/Clerk/etc.); replace unsigned SSO; include **employee** role (not only tenant admin)  
3. **Employee mobile My Payroll** — **required** (learned 2026-08-27): staff check own payslips/timesheets on personal phone via server; **no** Import Backup on phones; least privilege (no full ledger). Spec: `.cursor/rules/accounting-track-b-employee-mobile-payroll.mdc`  
4. **Onboarding B** — empty Setup → profile → first statement; no Selpic-internal HR defaults required  
5. **Hardening** — rate-limit `/api/analyze`, keyed API usage, no open analyze  
6. **Billing / limits** (if needed)  
7. **Remove** internal-only paths or gate behind `internal` flag  
8. **QA** — fresh browser, two users, wipe/restore, no cross-tenant leak; **phone employee login without Import**

### Explicit non-goals for B until designed

- Auto factory reset on user switch without confirmation  
- Sharing one Vercel SSO–protected company DB as “public SaaS”  
- Coupling public app into homepage webpack  
- Telling employees to Import the company backup onto personal phones (Track A workaround must not become B design)  

---

## Next agent / next session opener

Track A deploy + Cash delete are done. Remaining work is **not only** public Track B.

**Priority (learned 2026-08-27):** see `.cursor/rules/accounting-roadmap-priority.mdc`

| Resume phrase | Work |
|---------------|------|
| **「ATO GST-ex 정렬」** / **「1순위부터」** | Priority 1 handoff: `.cursor/rules/accounting-priority1-gst-ex-handoff.mdc` |
| **「Track B 시작」** | Public multi-tenant + employee mobile My Payroll — only when explicit |

Do **not** assume “only public left.” Export History / Excel GST / BAS quarter UX are already deployed.
