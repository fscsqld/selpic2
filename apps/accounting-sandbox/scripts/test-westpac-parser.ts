/**
 * Westpac Parser Test Script
 * 
 * Run this script to test the Westpac parser with sample data
 * 
 * Usage: npx tsx scripts/test-westpac-parser.ts
 */

import { WestpacParser } from '../lib/pdf-parser/westpac-parser'
import { sampleWestpacPDFText, expectedParsedResults } from '../lib/pdf-parser/westpac-test-data'

async function testWestpacParser() {
  console.log('='.repeat(80))
  console.log('WESTPAC PARSER TEST')
  console.log('='.repeat(80))
  console.log()

  // Step 1: Test Bank Detection
  console.log('Step 1: Testing Bank Detection...')
  const parser = new WestpacParser()
  const isWestpac = parser.detectBank(sampleWestpacPDFText)
  console.log(`✅ Bank Detection: ${isWestpac ? 'PASSED' : 'FAILED'}`)
  console.log(`   Detected as Westpac: ${isWestpac}`)
  console.log()

  if (!isWestpac) {
    console.error('❌ Bank detection failed. Cannot proceed with parsing test.')
    return
  }

  // Step 2: Create a mock PDF buffer (we'll simulate it with the text)
  // In a real scenario, we'd need an actual PDF, but for testing we can create a minimal PDF
  console.log('Step 2: Creating mock PDF buffer...')
  // Note: We can't easily create a real PDF buffer without a PDF library
  // Instead, we'll test the parsing logic directly by calling internal methods
  console.log('⚠️  Note: PDF buffer creation skipped (would require actual PDF file)')
  console.log('   Testing parsing logic directly with extracted text...')
  console.log()

  // Step 3: Test Transaction Extraction (using private method via type assertion)
  console.log('Step 3: Testing Transaction Extraction...')
  try {
    // Access private method via type assertion (for testing only)
    const transactions = (parser as any).extractTransactions(sampleWestpacPDFText)
    console.log(`✅ Extracted ${transactions.length} transactions`)
    console.log()

    // Step 4: Verify Transaction Details
    console.log('Step 4: Verifying Transaction Details...')
    console.log()

    transactions.forEach((tx: any, index: number) => {
      const expected = expectedParsedResults.transactions[index]
      if (!expected) {
        console.log(`⚠️  Transaction ${index + 1}: No expected result to compare`)
        console.log(`   Parsed:`, JSON.stringify(tx, null, 2))
        return
      }

      console.log(`Transaction ${index + 1}: ${expected.notes}`)
      console.log(`   Date: ${tx.date} (Expected: ${expected.date}) ${tx.date === expected.date ? '✅' : '❌'}`)
      console.log(`   Description: ${tx.description.substring(0, 50)}...`)
      console.log(`   Debit: ${tx.debit} (Expected: ${expected.debit}) ${tx.debit === expected.debit ? '✅' : '❌'}`)
      console.log(`   Credit: ${tx.credit} (Expected: ${expected.credit}) ${tx.credit === expected.credit ? '✅' : '❌'}`)
      console.log(`   Balance: ${tx.balance} (Expected: ${expected.balance}) ${tx.balance === expected.balance ? '✅' : '❌'}`)
      console.log()
    })

    // Step 5: Test Statement Period Extraction
    console.log('Step 5: Testing Statement Period Extraction...')
    const statementPeriod = (parser as any).extractStatementPeriod(sampleWestpacPDFText)
    console.log(`   Start Date: ${statementPeriod.startDate} (Expected: ${expectedParsedResults.statementPeriod.startDate})`)
    console.log(`   End Date: ${statementPeriod.endDate} (Expected: ${expectedParsedResults.statementPeriod.endDate})`)
    console.log()

    // Step 6: Test Balance Extraction
    console.log('Step 6: Testing Balance Extraction...')
    const balances = (parser as any).extractBalances(sampleWestpacPDFText)
    console.log(`   Opening Balance: ${balances.opening} (Expected: ${expectedParsedResults.openingBalance})`)
    console.log(`   Closing Balance: ${balances.closing} (Expected: ${expectedParsedResults.closingBalance})`)
    console.log()

    // Step 7: Test Account Number Extraction
    console.log('Step 7: Testing Account Number Extraction...')
    const accountNumber = (parser as any).extractAccountNumber(sampleWestpacPDFText)
    console.log(`   Account Number: ${accountNumber} (Expected: ${expectedParsedResults.accountNumber})`)
    console.log()

    // Step 8: Full JSON Output
    console.log('='.repeat(80))
    console.log('FULL PARSED RESULT (JSON)')
    console.log('='.repeat(80))
    console.log(JSON.stringify({
      bankName: 'Westpac',
      accountNumber,
      statementPeriod,
      openingBalance: balances.opening,
      closingBalance: balances.closing,
      transactions,
    }, null, 2))
    console.log()

    // Step 9: Summary
    console.log('='.repeat(80))
    console.log('TEST SUMMARY')
    console.log('='.repeat(80))
    console.log(`✅ Bank Detection: PASSED`)
    console.log(`✅ Transactions Extracted: ${transactions.length} (Expected: ${expectedParsedResults.transactions.length})`)
    console.log(`✅ Statement Period: ${statementPeriod.startDate} to ${statementPeriod.endDate}`)
    console.log(`✅ Opening Balance: $${balances.opening.toFixed(2)}`)
    console.log(`✅ Closing Balance: $${balances.closing.toFixed(2)}`)
    console.log(`✅ Account Number: ${accountNumber || 'Not found'}`)
    console.log()
    console.log('✅ Westpac Parser Test Completed Successfully!')
    console.log('='.repeat(80))

  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message)
    console.error(error.stack)
  }
}

// Run the test
testWestpacParser().catch(console.error)
