/**
 * Universal CSV Parser for Australian Banks
 * 
 * Supports CSV exports from all major Australian banks (NAB, CBA, ANZ, Westpac, etc.)
 * Uses flexible column mapping to detect:
 * - Date: "Date", "Transaction Date", "Posted Date"
 * - Description: "Description", "Transaction Details", "Particulars", "Merchant"
 * - Amount: "Amount", "Value", or separate "Debit"/"Credit" columns
 * 
 * Money Flow Rule:
 * - If single Amount column: Negative = Debit, Positive = Credit
 * - If separate Debit/Credit columns: Map accordingly
 */

import { BankTransaction } from '../pdf-parser/types'

export interface ParsedCSVStatement {
  bankName: string
  accountNumber?: string
  period: {
    startDate: string
    endDate: string
  }
  openingBalance: number
  closingBalance: number
  transactions: BankTransaction[]
}

export class UniversalCSVParser {
  /**
   * Parse CSV file content with flexible column mapping
   */
  async parseCSV(csvContent: string): Promise<ParsedCSVStatement> {
    console.log('[UNIVERSAL-CSV-PARSER] Starting CSV parsing...')
    
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0)
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows')
    }

    // Parse header row
    const headerLine = lines[0]
    const headers = this.parseCSVLine(headerLine)
    console.log('[UNIVERSAL-CSV-PARSER] Headers:', headers)

    // Flexible column mapping - search for various possible column names
    const dateIndex = this.findColumnIndex(headers, [
      'date', 'transaction date', 'posted date', 'value date', 'effective date'
    ])
    
    const descriptionIndex = this.findColumnIndex(headers, [
      'description', 'transaction details', 'particulars', 'merchant', 
      'transaction description', 'details', 'narration', 'narrative', 'reference'
    ])
    
    const merchantIndex = this.findColumnIndex(headers, [
      'merchant', 'merchant name', 'merchant description'
    ])
    
    // Check for separate Debit/Credit columns first
    const debitIndex = this.findColumnIndex(headers, [
      'debit', 'debits', 'paid out', 'withdrawal', 'out'
    ])
    
    const creditIndex = this.findColumnIndex(headers, [
      'credit', 'credits', 'paid in', 'deposit', 'in'
    ])
    
    // If no separate columns, look for single Amount column
    const amountIndex = (debitIndex === -1 && creditIndex === -1) 
      ? this.findColumnIndex(headers, [
          'amount', 'value', 'transaction amount', 'balance change'
        ])
      : -1
    
    const balanceIndex = this.findColumnIndex(headers, [
      'balance', 'running balance', 'account balance', 'closing balance'
    ])

    console.log('[UNIVERSAL-CSV-PARSER] Column mapping:', {
      date: dateIndex,
      description: descriptionIndex,
      amount: amountIndex,
      debit: debitIndex,
      credit: creditIndex,
      merchant: merchantIndex,
      balance: balanceIndex
    })

    if (dateIndex === -1 || descriptionIndex === -1) {
      throw new Error('Required columns (Date, Description) not found in CSV')
    }

    if (amountIndex === -1 && (debitIndex === -1 || creditIndex === -1)) {
      throw new Error('Required columns (Amount or Debit/Credit) not found in CSV')
    }

    // Parse data rows
    const transactions: BankTransaction[] = []
    let openingBalance: number | null = null
    let closingBalance: number | null = null
    let minDate: string | null = null
    let maxDate: string | null = null

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = this.parseCSVLine(line)
      
      // Calculate minimum required columns (only count valid indices)
      const requiredIndices = [dateIndex, descriptionIndex]
      if (amountIndex >= 0) requiredIndices.push(amountIndex)
      if (debitIndex >= 0) requiredIndices.push(debitIndex)
      if (creditIndex >= 0) requiredIndices.push(creditIndex)
      const maxRequiredIndex = Math.max(...requiredIndices.filter(idx => idx >= 0), -1)
      
      if (maxRequiredIndex >= 0 && values.length < maxRequiredIndex + 1) {
        console.warn(`[UNIVERSAL-CSV-PARSER] Skipping incomplete row ${i}:`, line)
        continue
      }

      const dateStr = values[dateIndex]?.trim()
      const description = values[descriptionIndex]?.trim() || ''
      const merchant = merchantIndex >= 0 ? values[merchantIndex]?.trim() : ''
      const balanceStr = balanceIndex >= 0 ? values[balanceIndex]?.trim() : null

      // Skip "Opening Balance" or "Closing Balance" rows
      const descriptionUpper = description.toUpperCase()
      if (descriptionUpper.includes('OPENING BALANCE') || 
          descriptionUpper.includes('CLOSING BALANCE') ||
          descriptionUpper.includes('BALANCE BROUGHT FORWARD') ||
          descriptionUpper.includes('BALANCE CARRIED FORWARD')) {
        console.log(`[UNIVERSAL-CSV-PARSER] Skipping balance row: ${description}`)
        // Extract balance if available
        if (balanceStr && openingBalance === null) {
          openingBalance = this.parseAmount(balanceStr)
          if (isNaN(openingBalance)) openingBalance = null
        }
        continue
      }

      if (!dateStr) {
        console.warn(`[UNIVERSAL-CSV-PARSER] Skipping row ${i} with missing date`)
        continue
      }

      // Parse date
      const date = this.parseDate(dateStr)
      if (!date) {
        console.warn(`[UNIVERSAL-CSV-PARSER] Skipping row ${i} with invalid date:`, dateStr)
        continue
      }

      // Track date range
      if (!minDate || date < minDate) minDate = date
      if (!maxDate || date > maxDate) maxDate = date

      // Determine debit/credit based on column structure
      let debit: number | null = null
      let credit: number | null = null

      if (debitIndex >= 0 && creditIndex >= 0) {
        // Separate Debit/Credit columns
        const debitStr = values[debitIndex]?.trim()
        const creditStr = values[creditIndex]?.trim()
        
        if (debitStr) {
          const debitAmount = this.parseAmount(debitStr)
          if (!isNaN(debitAmount) && debitAmount > 0) {
            debit = debitAmount
          }
        }
        
        if (creditStr) {
          const creditAmount = this.parseAmount(creditStr)
          if (!isNaN(creditAmount)) {
            // CRITICAL: Credit must always be positive (remove minus sign if present)
            credit = Math.abs(creditAmount)
            if (creditAmount < 0) {
              console.warn(`[UNIVERSAL-CSV-PARSER] ⚠️ Negative value in Credit column converted to positive: ${creditAmount} → ${credit}`)
            }
          }
        }
      } else if (amountIndex >= 0) {
        // Single Amount column - CRITICAL: Use sign to determine debit/credit
        const amountStr = values[amountIndex]?.trim()
        if (!amountStr) {
          console.warn(`[UNIVERSAL-CSV-PARSER] Skipping row ${i} with missing amount`)
          continue
        }

        const amount = this.parseAmount(amountStr)
        if (isNaN(amount)) {
          console.warn(`[UNIVERSAL-CSV-PARSER] Skipping row ${i} with invalid amount:`, amountStr)
          continue
        }

        // CRITICAL LOGIC:
        // IF Amount is POSITIVE (+) -> Credit (Income)
        // IF Amount is NEGATIVE (-) -> Debit (Expense)
        // Store as absolute values for UI display
        if (amount > 0) {
          credit = Math.abs(amount) // Positive = Income
          console.log(`[UNIVERSAL-CSV-PARSER] Positive amount ${amount} → Credit (Income)`)
        } else if (amount < 0) {
          debit = Math.abs(amount) // Negative = Expense
          console.log(`[UNIVERSAL-CSV-PARSER] Negative amount ${amount} → Debit (Expense)`)
        }
      } else {
        console.warn(`[UNIVERSAL-CSV-PARSER] Skipping row ${i} - no amount/debit/credit found`)
        continue
      }

      // Parse balance if available
      let balance: number | null = null
      if (balanceStr) {
        balance = this.parseAmount(balanceStr)
        if (isNaN(balance)) balance = null
      }

      // Combine description and merchant
      const fullDescription = merchant 
        ? `${description} ${merchant}`.trim()
        : description

      const transaction: BankTransaction = {
        date,
        description: fullDescription,
        debit,
        credit,
        balance,
        reference: this.generateReference(date, fullDescription, i)
      }

      transactions.push(transaction)

      // Track opening/closing balance from first/last transaction
      if (i === 1 && balance !== null) {
        openingBalance = balance - (credit || -debit || 0)
      }
      if (i === lines.length - 1 && balance !== null) {
        closingBalance = balance
      }
    }

    // If we couldn't determine from balance column, calculate from transactions
    if (openingBalance === null || closingBalance === null) {
      let runningBalance = openingBalance || 0
      for (const tx of transactions) {
        if (tx.credit) runningBalance += tx.credit
        if (tx.debit) runningBalance -= tx.debit
        if (tx.balance !== null) {
          if (openingBalance === null) openingBalance = tx.balance - (tx.credit || -tx.debit || 0)
          closingBalance = tx.balance
        }
      }
      if (openingBalance === null) openingBalance = 0
      if (closingBalance === null) closingBalance = runningBalance
    }

    // Detect bank name from content or default to "Unknown"
    const bankName = this.detectBankName(csvContent, headers)

    console.log(`[UNIVERSAL-CSV-PARSER] ✅ Parsed ${transactions.length} transactions`)
    console.log('[UNIVERSAL-CSV-PARSER] Bank detected:', bankName)
    console.log('[UNIVERSAL-CSV-PARSER] Date range:', minDate, 'to', maxDate)
    console.log('[UNIVERSAL-CSV-PARSER] Balance:', openingBalance, 'to', closingBalance)

    return {
      bankName,
      period: {
        startDate: minDate || new Date().toISOString().split('T')[0],
        endDate: maxDate || new Date().toISOString().split('T')[0]
      },
      openingBalance: openingBalance || 0,
      closingBalance: closingBalance || 0,
      transactions
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current.trim())
    return values
  }

  /**
   * Parse date string to YYYY-MM-DD format
   * CRITICAL: Preserve exact date from CSV (no timezone shifting)
   * Supports multiple formats including "DD MMM YY" (e.g., "20 Nov 25")
   */
  private parseDate(dateStr: string): string | null {
    try {
      const trimmed = dateStr.trim()
      if (!trimmed) return null

      // Month name mapping (case-insensitive)
      const monthMap: Record<string, string> = {
        'jan': '01', 'january': '01',
        'feb': '02', 'february': '02',
        'mar': '03', 'march': '03',
        'apr': '04', 'april': '04',
        'may': '05',
        'jun': '06', 'june': '06',
        'jul': '07', 'july': '07',
        'aug': '08', 'august': '08',
        'sep': '09', 'september': '09',
        'oct': '10', 'october': '10',
        'nov': '11', 'november': '11',
        'dec': '12', 'december': '12',
      }

      // Format 1: "DD MMM YY" or "DD MMM YYYY" (e.g., "20 Nov 25", "20 Nov 2025")
      const monthNamePattern = /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/
      const monthNameMatch = trimmed.match(monthNamePattern)
      if (monthNameMatch) {
        const day = monthNameMatch[1].padStart(2, '0')
        const monthName = monthNameMatch[2].toLowerCase()
        const yearStr = monthNameMatch[3]
        
        const monthNum = monthMap[monthName]
        if (monthNum) {
          let fullYear = yearStr
          if (yearStr.length === 2) {
            // 2-digit year: assume 20xx if <= 50, 19xx if > 50
            fullYear = parseInt(yearStr) <= 50 ? `20${yearStr}` : `19${yearStr}`
          }
          return `${fullYear}-${monthNum}-${day}`
        }
      }

      // Format 2: "DD/MM/YYYY" or "DD-MM-YYYY"
      const numericFormats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // DD/MM/YYYY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,     // YYYY-MM-DD
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,     // DD-MM-YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,   // DD/MM/YY
      ]

      for (const format of numericFormats) {
        const match = trimmed.match(format)
        if (match) {
          if (format === numericFormats[0] || format === numericFormats[2]) {
            // DD/MM/YYYY or DD-MM-YYYY
            const day = match[1].padStart(2, '0')
            const month = match[2].padStart(2, '0')
            const year = match[3]
            // Handle 2-digit year
            const fullYear = year.length === 2 
              ? (parseInt(year) <= 50 ? `20${year}` : `19${year}`)
              : year
            return `${fullYear}-${month}-${day}`
          } else if (format === numericFormats[3]) {
            // DD/MM/YY
            const day = match[1].padStart(2, '0')
            const month = match[2].padStart(2, '0')
            const year = match[3]
            const fullYear = parseInt(year) <= 50 ? `20${year}` : `19${year}`
            return `${fullYear}-${month}-${day}`
          } else {
            // YYYY-MM-DD - use as-is (no timezone conversion)
            return trimmed
          }
        }
      }

      // Format 3: Try pattern matching for date components (avoid timezone issues)
      const dateMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0')
        const month = dateMatch[2].padStart(2, '0')
        let year = dateMatch[3]
        if (year.length === 2) {
          year = parseInt(year) <= 50 ? `20${year}` : `19${year}`
        }
        return `${year}-${month}-${day}`
      }

      // Format 4: Try native Date parsing as fallback (for other formats)
      // This handles formats like "20 Nov 25" that JavaScript can parse
      const nativeDate = new Date(trimmed)
      if (!isNaN(nativeDate.getTime())) {
        // Extract date components to avoid timezone issues
        const year = nativeDate.getFullYear()
        const month = String(nativeDate.getMonth() + 1).padStart(2, '0')
        const day = String(nativeDate.getDate()).padStart(2, '0')
        
        // Validate: if year is way off (e.g., 1901 for "20 Nov 25"), try manual parsing
        if (year < 2000 && trimmed.match(/\d{2}\s+[A-Za-z]+\s+\d{2}$/)) {
          // Likely "DD MMM YY" format that was parsed incorrectly
          const fallbackMatch = trimmed.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2})$/)
          if (fallbackMatch) {
            const day = fallbackMatch[1].padStart(2, '0')
            const monthName = fallbackMatch[2].toLowerCase()
            const yearStr = fallbackMatch[3]
            const monthNum = monthMap[monthName]
            if (monthNum) {
              const fullYear = parseInt(yearStr) <= 50 ? `20${yearStr}` : `19${yearStr}`
              return `${fullYear}-${monthNum}-${day}`
            }
          }
        }
        
        return `${year}-${month}-${day}`
      }
    } catch (error) {
      console.error('[UNIVERSAL-CSV-PARSER] Date parsing error:', error, 'Input:', dateStr)
    }

    console.warn('[UNIVERSAL-CSV-PARSER] ⚠️ Could not parse date:', dateStr)
    return null
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number {
    // Remove currency symbols, commas, and whitespace
    const cleaned = amountStr.replace(/[$,]/g, '').trim()
    return parseFloat(cleaned)
  }

  /**
   * Find column index by searching for multiple possible names
   */
  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim())
    for (const name of possibleNames) {
      const index = lowerHeaders.findIndex(h => h.includes(name.toLowerCase()))
      if (index !== -1) return index
    }
    return -1
  }

  /**
   * Detect bank name from CSV content
   */
  private detectBankName(csvContent: string, headers: string[]): string {
    const content = csvContent.toUpperCase()
    const headerStr = headers.join(' ').toUpperCase()

    if (content.includes('NAB') || content.includes('NATIONAL AUSTRALIA BANK')) {
      return 'NAB'
    }
    if (content.includes('COMMONWEALTH') || content.includes('CBA') || content.includes('COMMBANK')) {
      return 'CBA'
    }
    if (content.includes('ANZ') || content.includes('AUSTRALIA AND NEW ZEALAND')) {
      return 'ANZ'
    }
    if (content.includes('WESTPAC') || content.includes('WBC')) {
      return 'Westpac'
    }
    if (content.includes('BANK OF MELBOURNE')) {
      return 'Bank of Melbourne'
    }
    if (content.includes('ST GEORGE')) {
      return 'St George'
    }

    return 'Australian Bank'
  }

  /**
   * Generate unique reference for transaction
   */
  private generateReference(date: string, description: string, index: number): string {
    const descHash = description.substring(0, 10).replace(/\s+/g, '').toUpperCase()
    return `CSV_${date}_${descHash}_${index}`
  }
}

