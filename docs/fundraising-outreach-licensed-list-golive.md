# Fundraising Agent — Licensed list go-live checklist

Use this when a vendor contract is signed. The product already supports HTTPS CSV/JSON auto-collect → PENDING → Sydney ≤10 send. **No open-web scrape.**

## 1. Before you buy / sign

Ask the vendor (in writing) for:

- [ ] Commercial / marketing **email outreach** licence for AU early learning / schools / daycares
- [ ] Confirmation the list is **not** ACARA / gov open data restricted to non-marketing use
- [ ] Export format: **CSV or JSON** over **https://** (static file or authenticated download)
- [ ] Column mapping for at least **organisation name** + **email** (see aliases below)
- [ ] Auth method if required: `Authorization: Bearer …` (or Basic), or token in query string
- [ ] Refresh cadence (daily/weekly) and max file size (our collector caps ~2 MB / 200 rows per parse batch)

## 2. Feed format SELPIC accepts

### CSV (recommended header)

```text
Organisation,Email,Contact,Type,State,Notes
```

Also recognised (examples): `School Name`, `Centre`, `Email Address`, `Office Email`, `Primary Email`, `Contact Person`, `Org Type`, `State Code`.

### JSON

Array of objects with the same field aliases, e.g. `{ "organisation": "…", "email": "…" }`.

### Samples (after deploy)

- `/samples/fundraising-outreach-feed-sample.csv`
- `/samples/fundraising-outreach-feed-sample.json`

Absolute test URL (production): `https://www.selpic.com.au/samples/fundraising-outreach-feed-sample.csv`

## 3. Contract day — Agent UI steps

Path: `/admin/fundraising/agent` (needs `fundraising:write`)

1. Paste vendor **HTTPS feed URL**
2. Enter **list / vendor name** + licence / contract reference note
3. Paste auth token if needed (stored server-side; never shown again after save)
4. Click **Test feed** — confirm `wouldInsert` / sample rows look correct (**no DB write**)
5. **Save collect settings** → **Collect now** (writes PENDING only; does not email)
6. **Build today’s queue** → **Confirm Send** for 1–2 real licensed rows (smoke test)
7. Only then **Enable daily collect** and (optional) **Enable daily auto-send**

Cron (Vercel Hobby, once daily each): collect `19:00` UTC · send `21:00` UTC.

## 4. Ops guards already built

| Guard | Behaviour |
|--------|-----------|
| HTTPS + SSRF block | No http, localhost, private IPs, embedded URL credentials |
| Email + org required | Invalid rows skipped |
| Dedupe | Same email in batch / DB; locked statuses (CONTACTED / CONVERTED / FAILED / OPTED_OUT) not overwritten |
| Daily insert cap | Default 50 new inserts/Sydney day (configurable 1–200) |
| Daily send cap | ≤10 / Sydney day |
| Unsubscribe | OPTED_OUT never re-mailed |
| Provenance | `licensed_list_upload` + list name on target payload |
| Audit | Activity Log on import / send / collect / target save |

## 5. If Test feed fails

| Symptom | Check |
|---------|--------|
| Feed URL must use https | Host file on HTTPS CDN / vendor portal |
| Feed host is not allowed | Not a private/internal host |
| Feed HTTP 401/403 | Auth header / token / IP allowlist with vendor |
| No importable rows | Header names; ensure email + organisation columns |
| Truncated to 200 | Split export or raise via multiple Collect runs across days |
| Would insert 0 but parsed > 0 | Already in DB or status-locked |

## 6. Not in scope (do not ask engineering for these without legal sign-off)

- Open-web scraping / address harvesting
- ACARA or similar gov directories for cold marketing email
- Raising send volume above Spam Act / Resend risk appetite without review
