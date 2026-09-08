# Wave 4.5 Site Review — handoff (resume tomorrow)

**Updated:** 2026-09-08  
**Status:** **S0 in progress on `feature/agent-site-review-wave45`** — types, smoke checklist, config key, fingerprint/incremental helpers + tests. S1 not started.  
**Language:** Admin UI = English. Discuss in Korean with the user if they prefer.

---

## Already shipped (do not redo)

On `main` (prod https://www.selpic.com.au), 2026-09-07:

| Commit | What |
|--------|------|
| `6909207` | site-config transient `Failed to fetch` guard |
| `7e02a6b` | Agent OpenAI usage + hub declutter + `agent:run` wiring |
| `ed2182b` | Fundraising Agent daily-ops declutter |

Smoke if needed: `/admin/agent` Usage expand · `/admin/fundraising/agent` queue · Confirm Send on table toolbar.

---

## Product invariant (re-read before coding)

1. **“Search” = governed Site Review** — storefront URL smoke + catalog/sector heuristics + admin report.  
2. **Not** open-web scrape; **not** auto-edit `app/page.tsx` / Hero; **not** auto CMS publish.  
3. **HITL:** L0 report (+ L1 deep-links into existing sector tools).  
4. **Next quarter:** deep re-check **`open` / `regressed` only**; `fixed` needs Verify / Re-check or becomes `regressed`.  
5. Reuse Wave 4 Performance `site_upgrade` heuristics — do not invent a second coach.

---

## Tomorrow — start order (S0 → S4)

Say **「Wave 4.5 시작」** or **「개발 시작하자」**, then:

### S0 — Spec lock in code (half day)

- [x] Branch: `feature/agent-site-review-wave45` from latest `main`  
- [x] Types: finding fingerprint, status enum, `periodKey`, `trigger`  
- [x] Fixed **storefront smoke URL checklist** constant (home + key routes; read-only)  
- [x] `site_configs` key (or SQL doc) for report store — mirror `agent_openai_runs` / community queue pattern  
- [x] Unit tests: fingerprint stability; incremental filter (open/regressed only)

**Stop for review** after S0 unless told to continue.

### S1 — Manual Full + Sector review API + hub UI

- [ ] `POST/GET` admin API under `/api/admin/agent/site-review` (names flexible)  
- [ ] Permissions: run with `agent:read` (writes stay on sector pages)  
- [ ] Hub panel (collapsed by default): Run full review · pick sectors · latest report  
- [ ] `logAdminActivity` on complete  
- [ ] No cron yet

### S2 — Mark fixed + Re-check

- [ ] Admin marks finding `fixed` / `accepted` / `wontfix`  
- [ ] **Re-check this finding** → pass stays fixed, fail → `regressed`  
- [ ] Report body sorts: regressed/open first

### S3 — Quarterly cron + optional email

- [ ] Cron after AU FY quarter boundary (avoid colliding with fundraising 19–21 UTC slots)  
- [ ] Hobby: one scheduled job/day constraint in `vercel.json`  
- [ ] Optional Resend summary to admins  
- [ ] Default run mode: **incremental** if prior baseline exists

### S4 — Polish

- [ ] Wire Performance deep-links into findings  
- [ ] Optional LLM **summary paragraph only** (kill-switchable); heuristics must work without OpenAI  
- [ ] Admin test checklist doc  
- [ ] Commit / push / deploy **only when user asks**

---

## Explicit non-goals this wave

- Homepage Hero redesign or agent widgets on home  
- Accounting-sandbox imports  
- Auto-send / auto-publish from Site Review  
- Replacing live Performance cards (they stay)

---

## Files to open first tomorrow

1. `docs/selpic-unified-ai-agent-plan.md` → **Wave 4.5**  
2. This handoff  
3. `lib/agent/performanceCoachBuild.ts` (`site_upgrade`)  
4. `lib/agent/sectors.ts` + `app/admin/agent/page.tsx`  
5. `lib/fundraising/auFinancialQuarter.ts` (period keys / Sydney calendar — reuse carefully; Site Review period ≠ grant payout automation)

---

**Resume signal:** 「Wave 4.5 시작」 → **S0 only**, then stop for review.
