# Wave 4.5 Site Review — handoff

**Updated:** 2026-09-08  
**Status:** **S3 done on `feature/agent-site-review-wave45`** — stop for review before S4.  
**Shipped to prod:** S0–S2 on `main` (`be298a4`) → https://www.selpic.com.au  
**Language:** Admin UI = English. Discuss in Korean with the user if they prefer.

---

## Already shipped (do not redo)

On `main` / prod:

| Commit | What |
|--------|------|
| `be298a4` | Site Review S1+S2 (manual run, mark fixed, re-check) |
| `6b46fd0` | Site Review S0 types / fingerprint helpers |
| (earlier) | Agent usage, Fundraising declutter, image provider W1 |

Smoke: `/admin/agent` → Site Review → Run full · Mark fixed · Re-check · Activity Log.

---

## Product invariant (re-read before coding)

1. **“Search” = governed Site Review** — storefront URL smoke + catalog/sector heuristics + admin report.  
2. **Not** open-web scrape; **not** auto-edit `app/page.tsx` / Hero; **not** auto CMS publish.  
3. **HITL:** L0 report (+ L1 deep-links into existing sector tools).  
4. **Next quarter:** deep re-check **`open` / `regressed` only**; `fixed` needs Verify / Re-check or becomes `regressed`.  
5. Reuse Wave 4 Performance `site_upgrade` heuristics — do not invent a second coach.

---

## Progress (S0 → S4)

### S0–S2 — done (prod)

- [x] Types, smoke checklist, manual API, hub HITL mark/re-check

### S3 — Quarterly cron + optional email — done (branch; deploy when asked)

- [x] Daily Hobby-safe cron `0 22 * * *` → `/api/cron/site-review-quarterly`  
- [x] Gates to Sydney Jul/Oct/Jan/Apr **day 1–2** only; skip if quarterly report already exists for `periodKey`  
- [x] Default **incremental** when any prior baseline exists  
- [x] Optional Resend summary to `ADMIN_NOTIFICATION_EMAIL` / fallbacks  
- [x] Kill-switches: `SITE_REVIEW_CRON_ENABLED` · `SITE_REVIEW_CRON_EMAIL`  
- [x] Ops: `?force=1` + `CRON_SECRET` to run outside window  
- [x] `scripts/verify-vercel-crons-hobby.ts` updated · `siteReview.s3.test.ts`

### S4 — Polish — next

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

## Key files (S3)

| Path | Role |
|------|------|
| `app/api/cron/site-review-quarterly/route.ts` | Cron entry |
| `lib/agent/siteReview/quarterlyCron.ts` | Window + kill switches |
| `lib/agent/siteReview/runQuarterlySiteReview.ts` | Run + optional email |
| `vercel.json` | `0 22 * * *` schedule |

Do **not** commit `data/agent/*.json` local caches.

---

**Resume signal:** 「S4 시작」 → polish (Performance links, optional LLM summary, checklist), then stop for review.
