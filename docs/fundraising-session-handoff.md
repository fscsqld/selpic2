# Fundraising session handoff

**Updated:** 2026-08-07 (end of day)  
**Branch:** typically `cursor/fundraising-b2b-partner-program` (confirm with `git branch`)  
**Dev server:** often `http://localhost:3005` (`npm run dev` at repo root)  
**Commit / push / deploy:** still **hold** until explicit user ask + QA

Language: **UI/copy = English**; chat with user may be Korean.

---

## How to resume (checklist)

1. Read this file + `.cursor/rules/fundraising-change-request-intake.mdc`
2. Confirm Supabase SQL already applied (see SQL section below)
3. `npm run dev` → open `/admin/fundraising/partners` and `/fundraising/lookup`
4. Sync partners; pick a partner → verify **inbox** vs **partner-scoped** change requests
5. Continue from **Next work** below (do not re-litigate closed product decisions)

---

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Partner bank edit in Lookup | **Forbidden.** `PUT /api/fundraising/lookup/bank` → **405**. Masked read-only + change request intake. |
| Change request intake | Message + kind only (no bank fields on submit). |
| D22 delivery | **Email = HTML instructions only** (no PDF attachment). Fillable D22 lives in Lookup **Documents**. |
| Apply registry changes | Admin **Load/edit partner → Save** (triggers D16/D17 + grant audit if bank changes). **Mark applied** closes ticket only — does **not** send D16. |
| Admin CR UX | **Inbox** (triage) → **Open partner workspace** → full actions on **that partner only**. Grant history focuses when a partner is open in the editor. |
| Vocabulary (UI) | Total Community Support; Fundraising Cashback Grant; Partner Community Code; Official Grant Account; Community Cashback Grant Tracker |

---

## Done this arc (change requests + Partner Registry UX)

### Controlled updates + D22 ops

1. Partner Lookup: submit change request (kinds: `grant_account` \| `contact` \| `other`)
2. Statuses: `submitted` → `under_review` → `awaiting_partner` → `partner_replied` → `applied` \| `declined` \| `closed`
3. Admin emails **D22 notice** (instructions); fillable PDF via `lib/fundraising/d22FillablePdf.ts` in Documents
4. Partner downloads D22, uploads reply + files → admin verifies → Save partner → Mark applied
5. Storage MIME: `selpic-contents` allows PDF/Word (see SQL note)

### Bugs fixed along the way

- Admin send pack omitted `requestId` → fixed; card-level feedback
- Email/PDF Unicode + non-fillable PDF → fillable AcroForm D22; D22 removed from email attachments
- Lookup Documents “Download” opening HTML → PDF download path
- D22 signature overlapping section 2 → page break after signature; sections 3–6 compact (not one-section-per-page)
- Reply upload MIME blocked → bucket MIME update
- Soft dashboard reload clearing `replyFiles` while native input still showed files → `loadDashboard({ soft: true })` + clearer attach UI

### Partner Registry — per-partner workspace (2026-08-07)

- **Change request inbox** (top): compact cross-partner list; **Open partner workspace** only
- **Partner-scoped panel** under editor: full actions for selected org only
- List badges: `N open request(s)`; selected row highlight
- **Official Grant Account history**: filtered to open partner when editor has `form.id`; Clear form → all partners

---

## Key paths

| Area | Path |
|------|------|
| Partner Lookup UI | `app/fundraising/lookup/LookupClient.tsx` |
| Partner CR API | `app/api/fundraising/lookup/change-requests/route.ts` |
| Bank API (405 on PUT) | `app/api/fundraising/lookup/bank/route.ts` |
| Admin Partners page | `app/admin/fundraising/partners/page.tsx` |
| CR panel (inbox \| partner) | `components/admin/FundraisingChangeRequestsPanel.tsx` |
| Admin CR API | `app/api/admin/fundraising/change-requests/route.ts` |
| Admin fundraising sync/save | `app/api/admin/fundraising/route.ts` |
| D22 fillable PDF | `lib/fundraising/d22FillablePdf.ts` |
| Docs / issue email helpers | `lib/fundraising/documents.ts`, `lib/fundraising/issueDocuments.ts` |
| Attachments upload | `lib/fundraising/uploadChangeRequestAttachments.ts` |
| Persistence | `lib/fundraising/persistence.ts` |
| Copy / vocabulary | `lib/fundraising/copy.ts` |
| Ops rule | `.cursor/rules/fundraising-change-request-intake.mdc` |
| Controlled bank rule | `.cursor/rules/fundraising-grant-account-controlled-update.mdc` |

### SQL (apply in Supabase if missing)

| File | Purpose |
|------|---------|
| `docs/fundraising-supabase.sql` | Core fundraising tables |
| `docs/fundraising-change-requests.sql` | `fundraising_change_requests` |
| `docs/fundraising-change-request-storage-mime.sql` | Allow PDF/Word on `selpic-contents` |
| `docs/fundraising-grant-account-events.sql` | Grant-account audit events |

---

## Admin button meanings (CRs)

| Action | Meaning |
|--------|---------|
| Mark under review | Internal reviewing |
| Email / Resend D22 notice | Instructions email; status → `awaiting_partner` |
| Mark applied | Close ticket only (no D16) |
| Decline / Close | Close without apply / other close |
| Load partner form / Open partner workspace | Open that org in editor (+ proposed hints if any) |

---

## Earlier foundation (still in place)

From prior handoff (2026-08-04 and related rules):

- English partnership copy (landing, Lookup, many D-docs, admin labels)
- Lookup Official Grant Account self-register **then superseded** by controlled-update model (admin-only save)
- Payout / Grant Tracker: Mark Paid blocked without bank; Copy Bank / CSV
- Lookup session length shortened (12h → 2h); D2/D4 access guide
- Partner approve/save flow, ABN validation, grant-account emails (D16/D17), audit events
- AU FY quarterly payout / settlement eligibility rules (see related `.cursor/rules/fundraising-*.mdc`)
- D9/D10 statement layout, promo end-date optional, lookup 404 predeploy notes

---

## Caps / scale (current)

| Surface | Behavior |
|---------|----------|
| Partner list | Search, filters, sort, **25/page**, scroll |
| CR inbox | All open (API ~200), compact |
| Partner CR panel | That partner only; closed ~25 |
| Grant history | Scoped when partner open; API ~500 |

---

## Next work (priority order)

### Manual QA (do before commit)

1. E2E: apply → admin approve/activate → Lookup OTP → change request → D22 notice → Documents download → reply upload → admin Save → Mark applied → confirm D16 only on Save (bank change), not on Mark applied
2. Multi-partner: two orgs with open CRs → inbox jumps correctly; actions only affect selected partner
3. Grant history filter toggles with Clear · new partner
4. Regression: payout Mark Paid still blocked without Official Grant Account

### Product / UX backlog

1. Optional: attention filter “has open change request”
2. Optional: server-side pagination for CRs / grant events if volume grows
3. Phase 2 bank: recognised BSB list block on Save (noted in controlled-update rule)
4. Dispute archive: browse closed CRs beyond recent slice / API mix

### Release

1. User-requested commit (group fundraising files; exclude `.next`, secrets)
2. Push + deploy only when asked
3. Confirm production Supabase SQL + storage MIME match docs

---

## Do not reopen without ask

- Putting D22 PDF back on the email as attachment
- Letting partners PUT bank details from Lookup
- Mixing full CR action cards in a global list again (inbox triage only)
- Coupling storefront to `apps/accounting-sandbox` imports

---

## Smoke commands

```bash
# root
npm run dev
# Admin: /admin/fundraising/partners
# Partner: /fundraising/lookup
```

---

**End of day note (2026-08-07):** Per-partner workspace shipped in working tree; may still be **uncommitted**. Check `git status` before next session.
