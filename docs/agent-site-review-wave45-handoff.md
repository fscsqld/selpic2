# Wave 4.5 Site Review — handoff

**Updated:** 2026-09-08  
**Status:** **S2 done on `feature/agent-site-review-wave45`** — stop for review before S3.  
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

## Progress (S0 → S4)

### S0 — Spec lock in code — done

- [x] Branch / types / smoke checklist / config key / fingerprint tests

### S1 — Manual Full + Sector review API + hub UI — done

- [x] `GET/POST` `/api/admin/agent/site-review`  
- [x] Hub panel · `logAdminActivity` on complete · no cron

### S2 — Mark fixed + Re-check — done

- [x] `PATCH` `/api/admin/agent/site-review` — `set_status` (`fixed` / `accepted` / `wontfix`) · `recheck`  
- [x] Hub buttons per finding: Mark fixed / Accept / Won't fix / Re-check  
- [x] Re-check: pass → `fixed`; fail after fixed/accepted → `regressed`  
- [x] Findings sorted regressed → open → rest (runner + GET + store update)  
- [x] Activity: `agent_site_review_finding_status` · `agent_site_review_finding_rechecked`  
- [x] Tests: `siteReview.s2.test.ts`

**Manual smoke:** latest report → Mark fixed on an open finding → Re-check (expect stay fixed if smoke OK) · Activity Log filters.

### S3 — Quarterly cron + optional email — next

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

## Key files

| Path | Role |
|------|------|
| `lib/agent/siteReview/findingStatus.ts` | Mark + sort |
| `lib/agent/siteReview/recheckFinding.ts` | Single-finding re-check |
| `lib/server/siteReviewStore.ts` | Persist finding updates |
| `app/api/admin/agent/site-review/route.ts` | GET/POST/PATCH |
| `app/admin/agent/page.tsx` | Hub HITL controls |

Do **not** commit `data/agent/*.json` local caches.

---

**Resume signal:** 「S3 시작」 → quarterly cron (+ optional email), then stop for review.
