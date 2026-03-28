# SELPIC A - File Structure Documentation

## 📁 Project Structure

```
apps/accounting-sandbox/
├── app/
│   ├── page.tsx                    # Main dashboard page (uses centralized calculations)
│   └── api/
│       └── analyze/
│           └── route.ts            # Bank statement analysis API
│
├── components/
│   ├── BusinessSummaryCards.tsx   # Top summary cards (receives calculated values)
│   ├── TransactionTable.tsx       # Transaction history table (already extracted)
│   ├── GSTSummary.tsx             # GST Summary section (receives calculated values)
│   ├── CashExpenseForm.tsx         # Manual cash expense entry
│   ├── ExpenseCharts.tsx           # Pie/Bar charts
│   ├── FBTMonitor.tsx              # FBT risk monitoring
│   ├── PAYGSummary.tsx             # PAYG withholding summary
│   ├── TaxDeadlineTracker.tsx     # Tax deadline tracking
│   └── Settings/
│       ├── ApiBalanceDashboard.tsx
│       ├── ApiKeyForm.tsx
│       ├── BusinessProfileForm.tsx
│       ├── DataBackupRestore.tsx
│       └── PAYGConfigForm.tsx
│
├── lib/
│   ├── utils/
│   │   ├── business-calculations.ts  # ⭐ SINGLE SOURCE OF TRUTH for all calculations
│   │   ├── currency-format.ts
│   │   ├── date-format.ts
│   │   └── financial-summary.ts      # Legacy (for backward compatibility)
│   │
│   ├── storage/
│   │   ├── indexed-db.ts            # IndexedDB operations
│   │   └── user-mappings.ts         # User correction learning
│   │
│   ├── excel-export.ts              # Excel export functions
│   ├── gst-settlement/              # GST calculation modules
│   └── payg-withholding/            # PAYG withholding modules
│
└── docs/
    └── file-structure.md            # This file
```

## 🔄 Data Flow

### 1. **Single Source of Truth**
- **File**: `lib/utils/business-calculations.ts`
- **Function**: `calculateBusinessMetrics(transactions, openingDirectorLoanBalance)`
- **Returns**: All business metrics (income, expenses, GST, Director's Loan, etc.)

### 2. **Calculation Flow**
```
app/page.tsx
  ↓
calculateBusinessMetrics() [business-calculations.ts]
  ↓
Extract metrics (totalIncome, gstPayable, gstClaimable, etc.)
  ↓
Pass to components:
  - BusinessSummaryCards (top cards)
  - GSTSummary (bottom section)
  - TransactionTable (filtered transactions)
```

### 3. **Opening Balance**
- **Variable**: `openingDirectorLoanBalance` (default: $1,000)
- **Location**: `app/page.tsx` (line ~1069)
- **Future**: Will be loaded from IndexedDB or Settings

## ✅ Key Features

### **Consistent Calculations**
- ✅ All components use the same calculation function
- ✅ Officeworks Refund logic applied consistently
- ✅ Director Loan Repayment logic applied consistently
- ✅ GST calculations match across all sections

### **Component Extraction**
- ✅ `TransactionTable.tsx` - Already extracted
- ✅ `BusinessSummaryCards.tsx` - Top summary cards
- ✅ `GSTSummary.tsx` - Receives calculated values via props

### **Data Continuity**
- ✅ Opening Director's Loan Balance: $1,000 (configurable)
- ✅ All calculations include opening balance
- ✅ Director's Loan balance carries forward correctly

## 📊 Calculation Logic

### **Total Income**
- Includes: Business income (cleaning, sticker, general)
- Excludes: Personal transactions, REFUNDS, Non-taxable deposits

### **Total Expenses**
- Includes: Business expenses (debits)
- Subtracts: REFUNDS (Officeworks, etc.)
- Excludes: Director Loan Repayment, Personal expenses

### **GST Payable**
- Formula: `totalIncome / 11`
- Displayed in: BusinessSummaryCards, GSTSummary

### **GST Claimable**
- Formula: `taxableExpenses / 11`
- Excludes: Director Loan Repayment
- Subtracts: REFUND GST amounts
- Displayed in: BusinessSummaryCards, GSTSummary

### **Director's Loan Balance**
- Opening Balance: $1,000
- Adds: Personal credits, Loan injections
- Subtracts: Personal debits, Loan repayments, Director Loan Repayment category
- Auto-synced with Personal transactions

## 🔍 Verification Checklist

- [x] Opening Balance added ($1,000)
- [x] Single source of truth function created
- [x] All components use same calculation
- [x] Officeworks Refund logic consistent
- [x] Director Loan Repayment logic consistent
- [x] GST Summary matches top cards ($2.77)
- [x] TransactionTable already extracted
- [x] No calculation mismatches

## 🚀 Next Steps (Future)

1. **Load Opening Balance from IndexedDB**
   - Save closing balance at end of period
   - Load as opening balance for next period

2. **Settings Integration**
   - Add Opening Balance input in Settings
   - Persist to IndexedDB

3. **Period Management**
   - Track financial periods (monthly/quarterly)
   - Carry forward balances automatically
