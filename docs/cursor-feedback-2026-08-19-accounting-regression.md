# Cursor feedback — agent regression on accounting sandbox (19 Aug 2026)

Report prepared for Cursor support / product team. Copy this file into
`Help → Report Issue` (or forum.cursor.com) and attach the chat link.

- Workspace: `selpic2` (Next.js monorepo, Windows 11, PowerShell)
- Affected app: `apps/accounting-sandbox` (own Next dev server, port 3001)
- Model in use during the regression: **Grok** (switched from the previously used model)
- Chat transcript id: `ba869bec-f671-461a-8969-bb51af2a139f`

## Summary

Over a single session on the accounting app, the agent produced a chain of edits
that each looked plausible in isolation but compounded into wrong ledger output
and an apparent loss of the user's saved data. The user's data lives in browser
IndexedDB (`selpic-accounting`), so agent edits that *write* to storage are not
reversible by `git checkout`. Recovery was further blocked because the affected
files were never committed, so no Git history existed for them.

## Concrete failure modes observed

1. **Incomplete search-and-replace left undefined references.**
   `repairUsMisparsedAustralianDates` was called after its import had been
   removed, producing `ReferenceError` at runtime, a 500 page, and a Next.js
   Fast Refresh full-reload loop. The agent reported the fix as complete.

2. **Verification on the wrong port.**
   The accounting app runs on `3001`; the agent repeatedly reasoned about
   `3005` (storefront) output, so "fix applied" claims did not match the
   screen the user was looking at.

3. **A repo cleanup script killed the app being debugged.**
   Root `scripts/clean.mjs` terminated the listener on port 3001, silently
   stopping the accounting dev server during storefront work. Symptom to the
   user: "my accounting changes never apply."

4. **Speculative data migration written to the user's database.**
   `persistRepairedDatesToStatements` wrote heuristic date corrections
   (US MM/DD swap, month ±3 fold) back into IndexedDB on every load. From then
   on, source-code fixes could not reproduce the user's state, because the
   stored data itself had been rewritten. This is the most damaging class of
   error: an agent mutating user data as a side effect of a read path.

5. **Compounding heuristics instead of one correct rule.**
   Three date "heal" layers were added on top of each other
   (`repairStatementDateAnomalies`, `repairUsMisparsedAustralianDates`,
   `restoreFoldedQ3BankDates`/`healCompanyLedgerDates`). They fought each other:
   Q3 Jan–Mar 2026 showed 32 transactions where 13 were correct, and real Q3
   bank rows were folded into Q4.

6. **A load path that hid saved records.**
   A loader filter (`statementsForLedgerLoad`) excluded, and in a first version
   deleted, `recovered_*.cache` statements. Combined with a UI hint that said
   "safe to delete this row", the user deleted a History row and then saw an
   empty Statement History — indistinguishable from total data loss.

7. **A cleanup `return` inserted mid-effect turned the data load into dead code.**
   In `hooks/useAccountingDashboard.ts` the mount `useEffect` hydrated state from a
   small `localStorage` cache, registered an event listener, then returned its
   cleanup function — leaving `indexedDBStorage.init() → loadAllTransactions() →
   loadStatementHistory()` below it unreachable. The dashboard therefore rendered
   14 cached rows instead of the 69 rows in IndexedDB: one quarter looked correct
   by coincidence, another showed 0 of 50 transactions, and Statement History
   looked empty. Critically, **no source-code fix could change what the user saw**,
   which is what turned a small bug into a full day of misdiagnosis on both sides.
   An agent that edits a React effect should verify that code after an inserted
   `return` is still reachable, and a lint rule for unreachable code would have
   caught this instantly.

8. **Silent catch blocks presented as empty state.**
   IndexedDB read failures were logged to console only, so the UI rendered
   "No saved statements found" instead of an error. The user reasonably
   concluded the data was destroyed.

## What we would ask Cursor to improve

- **Treat user-data mutation as a distinct, high-risk action.** Writes to
  IndexedDB/localStorage/DB migrations inside a read path should require an
  explicit user confirmation, the same way destructive shell commands do.
- **Post-edit reference validation.** After a search-and-replace, statically
  check that every referenced symbol still resolves before reporting success.
- **Verify against the port/app actually being edited.** The agent should bind
  its verification to the dev server for the edited workspace folder.
- **Warn when editing files with no Git history.** If a file is untracked,
  rollback is impossible; the agent should say so before rewriting logic, and
  prefer proposing a commit/snapshot first.
- **Discourage stacked heuristics.** When a third overlapping "repair" layer is
  added to the same field, that is a signal to stop and ask, not to continue.

## Remediation applied in the repo (19 Aug 2026)

- Deleted `lib/utils/restore-folded-q3-bank-dates.ts` (+ tests) and removed all
  cross-statement date folding.
- Removed `statementsForLedgerLoad` — `loadAllTransactions` again reads every
  saved statement and all cash expenses; nothing is skipped or deleted.
- Date repair is per-file and display-only; `persistDateRepairs` defaults to
  `false` and is no longer triggered by normal loads.
- `syncLegacyTransactionCache` refuses to overwrite a non-empty cache with `[]`.
- Statement History read failures now raise a visible error banner.
- `scripts/clean.mjs` no longer kills port 3001.
- Guardrails written to `.cursor/rules/accounting-stable-edits.mdc` and
  `.cursor/rules/accounting-app-independence.mdc`.
- Sandbox unit tests: 82 passing.
