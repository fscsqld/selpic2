/**
 * Westpac Parser Test Data
 * 
 * Sample data for testing Westpac parser logic
 */

/**
 * Sample Westpac CSV data (for manual upload testing)
 */
export const sampleWestpacCSV = `Date,Narrative,Debit,Credit,Balance
01/01/2025,Opening Balance,,,5000.00
05/01/2025,EFTPOS PURCHASE OFFICE WORKS BRISBANE,150.00,,4850.00
10/01/2025,TRANSFER FROM JOHN SMITH CLIENT PAYMENT,,2500.00,7350.00
15/01/2025,VISA DEBIT PURCHASE RESTAURANT QUAY SYDNEY,450.00,,6900.00
20/01/2025,TRANSFER TO JINSOO KIM PERSONAL,2000.00,,4900.00
25/01/2025,PAYMENT FROM ABC CLEANING SERVICES PTY LTD,,3500.00,8400.00
30/01/2025,EFTPOS PURCHASE COLES SUPERMARKET,85.50,,8314.50`

/**
 * Sample Westpac PDF text (simulated extracted text)
 * This simulates what would be extracted from a Westpac PDF statement
 */
export const sampleWestpacPDFText = `WESTPAC BANKING CORPORATION
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

TOTAL DEBITS: $2,685.50
TOTAL CREDITS: $6,000.00`

/**
 * Expected parsed results for verification
 */
export const expectedParsedResults = {
  bankName: 'Westpac',
  accountNumber: '12345678',
  statementPeriod: {
    startDate: '2025-01-01',
    endDate: '2025-01-31',
  },
  openingBalance: 5000.00,
  closingBalance: 8314.50,
  transactions: [
    {
      date: '2025-01-05',
      description: 'OFFICE WORKS BRISBANE',
      debit: 150.00,
      credit: null,
      balance: 4850.00,
      expectedCategory: 'EXPENSE_OFFICE_SUPPLIES',
      expectedDepartment: 'cleaning',
      notes: 'Regular business expense',
    },
    {
      date: '2025-01-10',
      description: 'JOHN SMITH CLIENT PAYMENT',
      debit: null,
      credit: 2500.00,
      balance: 7350.00,
      expectedCategory: 'INCOME_SALES_CLEANING',
      expectedDepartment: 'cleaning',
      notes: 'Client payment (income)',
    },
    {
      date: '2025-01-15',
      description: 'RESTAURANT QUAY SYDNEY',
      debit: 450.00,
      credit: null,
      balance: 6900.00,
      expectedCategory: 'EXPENSE_MEALS_ENTERTAINMENT',
      expectedDepartment: 'cleaning',
      expectedFBT: true,
      notes: 'FBT potential: Luxury restaurant over $300',
    },
    {
      date: '2025-01-20',
      description: 'JINSOO KIM PERSONAL',
      debit: 2000.00,
      credit: null,
      balance: 4900.00,
      expectedCategory: 'NON_TAXABLE_TRANSFER',
      expectedDepartment: 'personal',
      expectedDirectorsLoan: true,
      notes: "Director's Loan withdrawal (if director name matches)",
    },
    {
      date: '2025-01-25',
      description: 'ABC CLEANING SERVICES PTY LTD',
      debit: null,
      credit: 3500.00,
      balance: 8400.00,
      expectedCategory: 'INCOME_SALES_CLEANING',
      expectedDepartment: 'cleaning',
      notes: 'Business income',
    },
    {
      date: '2025-01-30',
      description: 'COLES SUPERMARKET',
      debit: 85.50,
      credit: null,
      balance: 8314.50,
      expectedCategory: 'UNCATEGORIZED',
      expectedDepartment: 'personal',
      notes: 'Personal expense',
    },
  ],
}
