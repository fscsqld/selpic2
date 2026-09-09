# Site Review — admin test checklist (Wave 4.5)

Use on **https://www.selpic.com.au** (or local storefront) after deploy. Admin UI is English.

## Preconditions

- [ ] Admin login works (`agent:read` or `agent:run`)
- [ ] `OPENAI_API_KEY` set only if you want optional summary polish (heuristics work without it)
- [ ] `CRON_SECRET` set in Vercel (quarterly cron)

## Manual Site Review (S1–S2)

1. Open `/admin/agent` → expand **Site Review**
2. Leave all sectors checked → **Run full review**
3. Confirm:
   - [ ] Origin shown (usually `https://www.selpic.com.au`)
   - [ ] Findings list appears (smoke + sector + Performance cards with **Open** deep-links)
   - [ ] Summary line present (optional second LLM paragraph if key + kill-switch allow)
4. On an `open` finding:
   - [ ] **Mark fixed** → status updates
   - [ ] **Re-check** → stays `fixed` if evidence cleared / smoke OK; else `regressed`
5. Activity Log (`/admin/settings` → Activity Log):
   - [ ] Agent Site Review / Status / Re-check rows

## Performance deep-links (S4)

- [ ] A Performance-related finding **Open** goes to the card href (e.g. `/admin/products` or `/admin/agent/performance`), not a dead link
- [ ] Live Performance page cards still work independently (Site Review does not replace them)

## Quarterly cron (S3)

Normal days: cron hits `/api/cron/site-review-quarterly` at **22:00 UTC** and **skips** outside Sydney Jul/Oct/Jan/Apr day 1–2.

Ops force (once, with care):

```http
GET /api/cron/site-review-quarterly?force=1
Authorization: Bearer <CRON_SECRET>
```

- [ ] JSON `ok: true` (may create a report + optional email)
- [ ] Kill-switches: `SITE_REVIEW_CRON_ENABLED=0` · `SITE_REVIEW_CRON_EMAIL=0` · `AGENT_SITE_REVIEW_SUMMARY_LLM=0`

## Non-goals (must stay true)

- [ ] Homepage Hero unchanged after any Site Review run
- [ ] No auto CMS publish / auto outreach send from Site Review
- [ ] Accounting sandbox not imported into storefront

## Pass criteria

All checked boxes above for the environment under test; no console/server 500s on Site Review GET/POST/PATCH.
