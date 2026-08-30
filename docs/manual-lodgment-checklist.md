# Manual lodgment checklist (E2E)

Use this checklist when validating SELPIC A before copying amounts into **myTax** (individual / sole trader) or **OSB** (company). SELPIC does not lodge electronically.

## Prerequisites

- [ ] Account type set correctly (Individual, Company, or Sole Trader)
- [ ] Business profile saved (ABN, GST registration, company tax rate if applicable)
- [ ] Bank CSV uploaded and transactions categorised (or rules-only mode used without API key)
- [ ] No uncategorised transactions remain in scope

## Individual (myTax)

1. **Reports**
   - [ ] Open **Reports → Personal Tax Summary** for the financial year
   - [ ] Figures align with bank data and manual overrides

2. **Payment summary** (if employed)
   - [ ] Journey does not skip payment summary, or skip is intentional
   - [ ] Salary and tax withheld entered from employer income statement

3. **Worksheets**
   - [ ] Rental worksheet completed if rental income &gt; 0
   - [ ] CGT worksheet completed if capital gains &gt; 0

4. **ATO Lodgment**
   - [ ] Pre-lodge checklist shows **Ready to lodge**
   - [ ] All SELPIC fields marked “entered in myTax”
   - [ ] **Complete in myTax (outside SELPIC)** sections all checked
   - [ ] Copy each amount into myTax using field paths shown
   - [ ] Save snapshot before lodging; finalize when complete

5. **Portal-only items** (myTax, not in field sheet)
   - [ ] Medicare levy, HECS/HELP if applicable
   - [ ] Foreign income/assets if applicable
   - [ ] Franking credits if dividends
   - [ ] PHI rebate & MLS if high income

## Sole trader (myTax + optional BAS)

1. **Reports**
   - [ ] Compliance reports reviewed
   - [ ] BAS reconcile panel matches lodgment (if GST registered)

2. **GST not registered**
   - [ ] BAS tab hidden; annual myTax schedule used
   - [ ] Pre-lodge does not require BAS snapshots

3. **GST registered**
   - [ ] Each BAS quarter saved as snapshot
   - [ ] BAS pre-lodge: G1/1A, GST net, PAYG if payroll

4. **Annual myTax schedule**
   - [ ] All editable annual fields marked entered
   - [ ] Contractor payments reviewed if &gt; 0

## Company (OSB)

1. **Reports**
   - [ ] P&amp;L, balance sheet, tax provision reviewed
   - [ ] CTR reconcile panel matches lodgment fields

2. **BAS** (if GST registered)
   - [ ] Quarterly/monthly BAS pre-lodge passes
   - [ ] Periods locked before finalize

3. **CTR**
   - [ ] Company tax rate 25% or 30% confirmed in profile
   - [ ] Taxable income and estimated tax reviewed
   - [ ] Manual adjustments documented if used

4. **Snapshot**
   - [ ] Save snapshot with pre-lodge state
   - [ ] Finalize locks open months

## Pre-lodge “Ready to lodge” rules

- All **required** items must pass (uncategorised, validation, reports reviewed when tracked)
- **Blocking** recommendations must pass (fields entered, payment summary when applicable, myTax outside sections, etc.)
- At most **one** soft recommendation may remain (e.g. period lock preference)

## Regression smoke test

```bash
cd apps/accounting-sandbox
npx tsc --noEmit
npm test
```

- [ ] Dev server on port 3001 loads dashboard
- [ ] ATO Lodgment tab shows pre-lodge banner (green or amber)
- [ ] Snapshot save includes pre-lodge summary when viewing saved snapshot
