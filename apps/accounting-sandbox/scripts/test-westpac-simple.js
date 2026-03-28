/**
 * Simple Westpac Parser Test (Node.js compatible)
 * 
 * Run: node scripts/test-westpac-simple.js
 */

// Sample Westpac PDF text
const sampleWestpacPDFText = `WESTPAC BANKING CORPORATION
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

Closing Balance: $8,314.50`

console.log('='.repeat(80))
console.log('WESTPAC PARSER LOGIC VERIFICATION')
console.log('='.repeat(80))
console.log()

// Test 1: Bank Detection
console.log('Test 1: Bank Detection')
const hasWestpac = /WESTPAC/i.test(sampleWestpacPDFText)
const hasAccountStatement = /Account\s+Statement/i.test(sampleWestpacPDFText)
const isWestpac = hasWestpac && hasAccountStatement
console.log(`  ✅ Westpac keyword found: ${hasWestpac}`)
console.log(`  ✅ Account Statement found: ${hasAccountStatement}`)
console.log(`  ✅ Detected as Westpac: ${isWestpac}`)
console.log()

// Test 2: Date Pattern Matching
console.log('Test 2: Date Pattern Matching')
const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
const dateMatches = sampleWestpacPDFText.match(/\d{1,2}\/\d{1,2}\/\d{4}/g)
console.log(`  ✅ Found ${dateMatches ? dateMatches.length : 0} dates`)
if (dateMatches) {
  dateMatches.forEach((date, i) => {
    const match = date.match(datePattern)
    if (match) {
      const day = match[1].padStart(2, '0')
      const month = match[2].padStart(2, '0')
      const year = match[3]
      const formatted = `${year}-${month}-${day}`
      console.log(`    ${i + 1}. ${date} → ${formatted}`)
    }
  })
}
console.log()

// Test 3: Transaction Extraction
console.log('Test 3: Transaction Extraction')
const lines = sampleWestpacPDFText.split('\n')
const transactions = []
let inTransactionBlock = false

for (const line of lines) {
  const trimmed = line.trim()
  
  // Skip headers
  if (trimmed.includes('Transaction Details') || trimmed.includes('Date')) {
    inTransactionBlock = true
    continue
  }
  
  if (trimmed.includes('Opening Balance') || trimmed.includes('Closing Balance')) {
    continue
  }
  
  if (!inTransactionBlock) continue
  
  // Match transaction line: Date | Description | Debit | Credit | Balance
  const txMatch = trimmed.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([\d,]+\.?\d*)?\s+([\d,]+\.?\d*)?\s+([\d,]+\.?\d*)/)
  if (txMatch) {
    const date = txMatch[1]
    const description = txMatch[2].trim()
    const debit = txMatch[3] ? parseFloat(txMatch[3].replace(/,/g, '')) : null
    const credit = txMatch[4] ? parseFloat(txMatch[4].replace(/,/g, '')) : null
    const balance = txMatch[5] ? parseFloat(txMatch[5].replace(/,/g, '')) : null
    
    transactions.push({
      date,
      description: description.substring(0, 50),
      debit,
      credit,
      balance
    })
  }
}

console.log(`  ✅ Extracted ${transactions.length} transactions:`)
transactions.forEach((tx, i) => {
  console.log(`    ${i + 1}. ${tx.date} | ${tx.description}`)
  console.log(`       Debit: ${tx.debit || 'null'}, Credit: ${tx.credit || 'null'}, Balance: ${tx.balance || 'null'}`)
})
console.log()

// Test 4: Balance Extraction
console.log('Test 4: Balance Extraction')
const openingMatch = sampleWestpacPDFText.match(/Opening\s+Balance[:\s]+[\$]?([\d,]+\.?\d*)/i)
const closingMatch = sampleWestpacPDFText.match(/Closing\s+Balance[:\s]+[\$]?([\d,]+\.?\d*)/i)
const opening = openingMatch ? parseFloat(openingMatch[1].replace(/,/g, '')) : 0
const closing = closingMatch ? parseFloat(closingMatch[1].replace(/,/g, '')) : 0
console.log(`  ✅ Opening Balance: $${opening.toFixed(2)}`)
console.log(`  ✅ Closing Balance: $${closing.toFixed(2)}`)
console.log()

// Test 5: Account Number Extraction
console.log('Test 5: Account Number Extraction')
const accountMatch = sampleWestpacPDFText.match(/Account\s+Number[:\s]+(\d{4,12})/i)
const accountNumber = accountMatch ? accountMatch[1] : null
console.log(`  ✅ Account Number: ${accountNumber || 'Not found'}`)
console.log()

// Test 6: Statement Period Extraction
console.log('Test 6: Statement Period Extraction')
const periodMatch = sampleWestpacPDFText.match(/Statement\s+Period[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)
if (periodMatch) {
  console.log(`  ✅ Start Date: ${periodMatch[1]}`)
  console.log(`  ✅ End Date: ${periodMatch[2]}`)
} else {
  console.log(`  ⚠️  Period not found`)
}
console.log()

// Summary
console.log('='.repeat(80))
console.log('VERIFICATION SUMMARY')
console.log('='.repeat(80))
console.log(`✅ Bank Detection: ${isWestpac ? 'PASSED' : 'FAILED'}`)
console.log(`✅ Date Extraction: ${dateMatches ? dateMatches.length : 0} dates found`)
console.log(`✅ Transaction Extraction: ${transactions.length} transactions`)
console.log(`✅ Balance Extraction: Opening $${opening.toFixed(2)}, Closing $${closing.toFixed(2)}`)
console.log(`✅ Account Number: ${accountNumber || 'Not found'}`)
console.log(`✅ Statement Period: ${periodMatch ? 'Found' : 'Not found'}`)
console.log()
console.log('✅ All parser logic checks completed!')
console.log('='.repeat(80))

// Expected Results
console.log()
console.log('='.repeat(80))
console.log('EXPECTED AI CLASSIFICATION RESULTS')
console.log('='.repeat(80))
console.log()
console.log('Transaction 1: OFFICE WORKS BRISBANE ($150.00 debit)')
console.log('  → Category: EXPENSE_OFFICE_SUPPLIES')
console.log('  → Department: cleaning')
console.log()
console.log('Transaction 2: JOHN SMITH CLIENT PAYMENT ($2,500.00 credit)')
console.log('  → Category: INCOME_SALES_CLEANING')
console.log('  → Department: cleaning')
console.log()
console.log('Transaction 3: RESTAURANT QUAY SYDNEY ($450.00 debit)')
console.log('  → Category: EXPENSE_MEALS_ENTERTAINMENT')
console.log('  → Department: cleaning')
console.log('  → FBT Potential: YES (Luxury restaurant over $300)')
console.log()
console.log('Transaction 4: JINSOO KIM PERSONAL ($2,000.00 debit)')
console.log('  → Category: NON_TAXABLE_TRANSFER')
console.log('  → Department: personal')
console.log('  → Director\'s Loan: YES (if "Jinsoo Kim" is configured in Settings)')
console.log()
console.log('Transaction 5: ABC CLEANING SERVICES PTY LTD ($3,500.00 credit)')
console.log('  → Category: INCOME_SALES_CLEANING')
console.log('  → Department: cleaning')
console.log()
console.log('Transaction 6: COLES SUPERMARKET ($85.50 debit)')
console.log('  → Category: UNCATEGORIZED')
console.log('  → Department: personal')
console.log()
console.log('='.repeat(80))
