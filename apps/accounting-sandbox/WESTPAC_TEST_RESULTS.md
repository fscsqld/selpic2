# Westpac Parser Test Results

## Sample CSV Data

You can use this CSV file for manual testing: `public/sample-westpac-statement.csv`

```csv
Date,Narrative,Debit,Credit,Balance
01/01/2025,Opening Balance,,,5000.00
05/01/2025,EFTPOS PURCHASE OFFICE WORKS BRISBANE,150.00,,4850.00
10/01/2025,TRANSFER FROM JOHN SMITH CLIENT PAYMENT,,2500.00,7350.00
15/01/2025,VISA DEBIT PURCHASE RESTAURANT QUAY SYDNEY,450.00,,6900.00
20/01/2025,TRANSFER TO JINSOO KIM PERSONAL,2000.00,,4900.00
25/01/2025,PAYMENT FROM ABC CLEANING SERVICES PTY LTD,,3500.00,8400.00
30/01/2025,EFTPOS PURCHASE COLES SUPERMARKET,85.50,,8314.50
```

## Sample PDF Text (Simulated)

This is what the Westpac parser would receive after PDF text extraction:

```
WESTPAC BANKING CORPORATION
Account Statement
Account Number: 12345678
BSB: 032-000

Statement Period: 01/01/2025 to 31/01/2025

Opening Balance: $5,000.00

Date        Transaction Details                    Debit      Credit     Balance
01/01/2025  Opening Balance                                        5,000.00
05/01/2025  EFTPOS PURCHASE OFFICE WORKS BRISBANE   150.00              4,850.00
10/01/2025  TRANSFER FROM JOHN SMITH CLIENT PAYMENT         2,500.00    7,350.00
15/01/2025  VISA DEBIT PURCHASE RESTAURANT QUAY SYDNEY      450.00      6,900.00
20/01/2025  TRANSFER TO JINSOO KIM PERSONAL         2,000.00            4,900.00
25/01/2025  PAYMENT FROM ABC CLEANING SERVICES PTY LTD             3,500.00    8,400.00
30/01/2025  EFTPOS PURCHASE COLES SUPERMARKET        85.50              8,314.50

Closing Balance: $8,314.50
```

## Expected Parsed Results

### Transaction 1: Office Works (Business Expense)
- **Date**:**: 2025-01-05
- **Description**: OFFICE WORKS BRISBANE
- **Debit**: $150.00
- **Credit**: null
- **Balance**: $4,850.00
- **Expected Category**: EXPENSE_OFFICE_SUPPLIES
- **Expected Department**: cleaning
- **Notes**: Regular business expense

### Transaction 2: Client Payment (Income)
- **Date**: 2025-01-10
- **Description**: JOHN SMITH CLIENT PAYMENT
- **Debit**: null
- **Credit**: $2,500.00
- **Balance**: $7,350.00
- **Expected Category**: INCOME_SALES_CLEANING
- **Expected Department**: cleaning
- **Notes**: Client payment (income)

### Transaction 3: Restaurant Quay (FBT Potential)
- **Date**: 2025-01-15
- **Description**: RESTAURANT QUAY SYDNEY
- **Debit**: $450.00
- **Credit**: null
- **Balance**: $6,900.00
- **Expected Category**: EXPENSE_MEALS_ENTERTAINMENT
- **Expected Department**: cleaning
- **Expected FBT**: true (Luxury restaurant over $300)
- **Notes**: FBT potential: Luxury restaurant over $300

### Transaction 4: Director's Loan (Personal Transfer)
- **Date**: 2025-01-20
- **Description**: JINSOO KIM PERSONAL
- **Debit**: $2,000.00
- **Credit**: null
- **Balance**: $4,900.00
- **Expected Category**: NON_TAXABLE_TRANSFER
- **Expected Department**: personal
- **Expected Director's Loan**: true (if director name "Jinsoo Kim" is configured)
- **Notes**: Director's Loan withdrawal (if director name matches)

### Transaction 5: Business Income
- **Date**: 2025-01-25
- **Description**: ABC CLEANING SERVICES PTY LTD
- **Debit**: null
- **Credit**: $3,500.00
- **Balance**: $8,400.00
- **Expected Category**: INCOME_SALES_CLEANING
- **Expected Department**: cleaning
- **Notes**: Business income

### Transaction 6: Personal Expense
- **Date**: 2025-01-30
- **Description**: COLES SUPERMARKET
- **Debit**: $85.50
- **Credit**: null
- **Balance**: $8,314.50
- **Expected Category**: UNCATEGORIZED
- **Expected Department**: personal
- **Notes**: Personal expense

## Verification Checklist

### Parser Logic
- [x] Bank detection correctly identifies Westpac statements
- [x] Dates are correctly formatted (DD/MM/YYYY → YYYY-MM-DD)
- [x] Amounts are correctly assigned (Debit vs Credit)
- [x] Header and summary lines are ignored
- [x] Multi-line descriptions are handled
- [x] Statement period is extracted
- [x] Opening and closing balances are extracted
- [x] Account number is extracted

### AI Classification (After Parsing)
- [ ] ATO Categories are automatically assigned
- [ ] FBT items are detected (Restaurant Quay over $300)
- [ ] Director's Loan tags are detected (if director name matches)
- [ ] Business vs Personal expenses are correctly classified

## How to Test

### Option 1: Upload CSV File
1. Go to SELPIC A dashboard
2. Upload `public/sample-westpac-statement.csv`
3. The Universal CSV Parser will handle it
4. Check if transactions are correctly parsed

### Option 2: Test PDF Parser (Requires Actual PDF)
1. Create a PDF with the sample text above
2. Upload to SELPIC A dashboard
3. The Westpac PDF Parser will detect and parse it
4. Verify the results match expected output

### Option 3: Run Test Script
```bash
cd apps/accounting-sandbox
npx tsx scripts/test-westpac-parser.ts
```

## Notes

- The CSV file uses the Universal CSV Parser (not the Westpac-specific parser)
- The PDF parser is specifically for Westpac PDF statements
- FBT and Director's Loan detection happens during AI classification, not during parsing
- The parser only extracts raw transaction data; AI classification happens afterward
