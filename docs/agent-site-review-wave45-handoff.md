# Wave 4.5 Site Review — handoff

**Updated:** 2026-09-08  
**Status:** **S4 done on `feature/agent-site-review-wave45`** — Wave 4.5 complete pending review/merge.  
**Shipped to prod:** S0–S3 on `main` (`3155a97`) → https://www.selpic.com.au  
**Language:** Admin UI = English.

---

## Already shipped (prod)

| Commit | What |
|--------|------|
| `3155a97` | Site Review S3 quarterly cron + optional email |
| `be298a4` | Site Review S1+S2 |
| `6b46fd0` | Site Review S0 |

---

## Product invariant

1. Governed Site Review only — no open-web scrape; no Hero auto-edit; no auto CMS publish.  
2. HITL L0 report + deep-links.  
3. Incremental deep-check **open / regressed**; fixed needs Re-check.  
4. Reuse Performance coach cards — do not invent a second coach.

---

## Progress (S0 → S4)

### S0–S3 — done (prod)

### S4 — Polish — done (branch; deploy when asked)

- [x] Performance opportunities → findings with each card’s `href` deep-link (`catalog_heuristic|performance|<id>`)  
- [x] Cleared coach cards auto-mark prior open/regressed as `fixed` on next run  
- [x] Optional LLM summary paragraph (`AGENT_SITE_REVIEW_SUMMARY_LLM`); heuristics always work without OpenAI  
- [x] Admin checklist: `docs/agent-site-review-admin-checklist.md`  
- [x] Tests: `siteReview.s4.test.ts`

---

## Key S4 files

| Path | Role |
|------|------|
| `lib/agent/siteReview/performanceFindings.ts` | Coach → findings |
| `lib/agent/siteReview/summaryLlm.ts` | Optional summary paragraph |
| `docs/agent-site-review-admin-checklist.md` | Manual QA |

---

**Next:** User review → commit / push / deploy when asked. Wave 4.5 then closed unless follow-ups.
