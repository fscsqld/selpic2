/**
 * Westpac Banking Corporation PDF Parser
 * 
 * Implementation for parsing Westpac bank statements
 */

import { PDFParser, ParsedStatement, BankTransaction } from './types'
import * as pdfParse from 'pdf-parse'

export class WestpacParser implements PDFParser {
  /**
   * Detect if this is a Westpac bank statement
   */
  detectBank(pdfText: string): boolean {
    const upperText = pdfText.toUpperCase()
    
    // ⚠️ CRITICAL: 다른 은행들을 먼저 제외
    // ANZ 명세서 확인
    const anzIndicators = [
      'ANZ ACCESS BASIC STATEMENT',
      'ANZ ACCESS',
      'AUSTRALIA AND NEW ZEALAND BANKING GROUP',
      'ANZ BANK'
    ]
    const isANZ = anzIndicators.some(indicator => upperText.includes(indicator))
    if (isANZ) {
      console.log('[WESTPAC-PARSER] ⚠️ ANZ statement detected - skipping Westpac detection')
      return false
    }
    
    // NAB 명세서 확인
    const nabIndicators = [
      'TRANSACTION LISTING',
      'BSB NUMBER',
      'NATIONAL AUSTRALIA BANK'
    ]
    const isNAB = nabIndicators.some(indicator => upperText.includes(indicator)) &&
                  /BSB\s*Number/i.test(pdfText) && 
                  /Transaction\s*Listing/i.test(pdfText)
    if (isNAB) {
      console.log('[WESTPAC-PARSER] ⚠️ NAB statement detected - skipping Westpac detection')
      return false
    }
    
    // CBA 명세서 확인
    const cbaIndicators = [
      'COMMONWEALTH BANK OF AUSTRALIA',
      'COMMBANK',
      'CBA STATEMENT'
    ]
    const isCBA = cbaIndicators.some(indicator => upperText.includes(indicator))
    if (isCBA) {
      console.log('[WESTPAC-PARSER] ⚠️ CBA statement detected - skipping Westpac detection')
      return false
    }
    
    // Westpac-specific indicators (더 구체적인 패턴 우선)
    const westpacIndicators = [
      'WESTPAC BANKING CORPORATION',
      'WESTPAC BANK',
      'WESTPAC STATEMENT',
      'WESTPAC ACCOUNT STATEMENT',
      'WESTPAC',
    ]

    const hasIndicator = westpacIndicators.some(indicator => 
      upperText.includes(indicator.toUpperCase())
    )

    // Westpac-specific pattern: Westpac + Account Statement
    const hasWestpacPattern = (
      /WESTPAC/i.test(pdfText) && 
      (/Account\s+Statement/i.test(pdfText) || 
       /Statement\s+of\s+Account/i.test(pdfText) ||
       /Account\s+Summary/i.test(pdfText))
    ) && !isANZ && !isNAB && !isCBA

    console.log('[WESTPAC-PARSER] Bank detection:', {
      hasIndicator,
      hasWestpacPattern,
      isANZ,
      isNAB,
      isCBA,
      textPreview: pdfText.substring(0, 500)
    })

    return hasIndicator || hasWestpacPattern
  }

  /**
   * Parse Westpac PDF statement
   */
  async parse(pdfBuffer: Buffer): Promise<ParsedStatement> {
    console.log('[WESTPAC-PARSER] Starting PDF parsing...')
    console.log('[WESTPAC-PARSER] PDF buffer size:', pdfBuffer.length, 'bytes')
    
    let pdfData
    try {
      console.log('[WESTPAC-PARSER] Extracting text from PDF...')
      pdfData = await pdfParse(pdfBuffer)
      console.log('[WESTPAC-PARSER] PDF text length:', pdfData.text.length, 'characters')
      console.log('[WESTPAC-PARSER] PDF pages:', pdfData.numpages)
    } catch (error: any) {
      console.error('[WESTPAC-PARSER] Error parsing PDF:', error)
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }

    const text = pdfData.text
    
    if (!text || text.trim().length === 0) {
      console.error('[WESTPAC-PARSER] Error: PDF text is empty')
      throw new Error('PDF appears to be empty or contains no extractable text')
    }

    console.log('[WESTPAC-PARSER] Extracting transactions...')
    const transactions = this.extractTransactions(text)
    console.log('[WESTPAC-PARSER] Extracted', transactions.length, 'transactions')
    
    console.log('[WESTPAC-PARSER] Extracting statement period...')
    const statementPeriod = this.extractStatementPeriod(text)
    console.log('[WESTPAC-PARSER] Statement period:', statementPeriod)
    
    console.log('[WESTPAC-PARSER] Extracting balances...')
    const balances = this.extractBalances(text)
    console.log('[WESTPAC-PARSER] Opening balance:', balances.opening, 'Closing balance:', balances.closing)
    
    console.log('[WESTPAC-PARSER] Extracting account number...')
    const accountNumber = this.extractAccountNumber(text)
    console.log('[WESTPAC-PARSER] Account number:', accountNumber || 'Not found')

    return {
      bankName: 'Westpac',
      accountNumber: accountNumber ?? undefined,
      statementPeriod,
      openingBalance: balances.opening,
      closingBalance: balances.closing,
      transactions,
      metadata: {
        statementDate: new Date().toISOString().split('T')[0],
      },
    }
  }

  /**
   * Extract transactions from Westpac PDF text
   * 
   * Westpac PDF format examples:
   * "01/01/2025 TRANSFER FROM JOHN SMITH 1,000.00 5,000.00"
   * "15/01/2025 EFTPOS PURCHASE COLES 50.00 4,950.00"
   * 
   * Format: Date | Description | Debit | Credit | Balance
   */
  private extractTransactions(text: string): BankTransaction[] {
    console.log('[WESTPAC-PARSER] Extracting transactions with Westpac patterns...')
    console.log('[WESTPAC-PARSER] Text preview (first 2000 chars):', text.substring(0, 2000))
    const transactions: BankTransaction[] = []
    const lines = text.split('\n')
    console.log('[WESTPAC-PARSER] Total lines to process:', lines.length)

    // Westpac date patterns:
    // - DD/MM/YYYY (e.g., "01/01/2025")
    // - DD MMM YYYY (e.g., "01 Jan 2025")
    // - DD-MM-YYYY (e.g., "01-01-2025")
    const datePattern1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/  // DD/MM/YYYY
    const datePattern2 = /^(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})/i  // DD MMM YYYY
    const datePattern3 = /^(\d{1,2})-(\d{1,2})-(\d{4})/  // DD-MM-YYYY

    const monthMap: Record<string, number> = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
    }

    let currentYear = new Date().getFullYear()
    let lastDate: string | null = null
    let currentLine = ''
    let inTransactionBlock = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip header lines
      if (line.includes('Transaction Details') || 
          line.includes('Date') && line.includes('Description') ||
          line.includes('Debit') && line.includes('Credit') ||
          line.includes('Balance') ||
          line.includes('Opening Balance') ||
          line.includes('Closing Balance') ||
          line.includes('TOTAL') ||
          line.includes('Page') ||
          line.includes('WESTPAC') && !inTransactionBlock) {
        continue
      }

      // Check if we're entering transaction block
      if (line.includes('Transaction') || line.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
        inTransactionBlock = true
      }

      if (!inTransactionBlock) {
        continue
      }

      // Try to match date patterns
      let dateMatch = line.match(datePattern1) || 
                      line.match(datePattern2) || 
                      line.match(datePattern3)
      
      if (dateMatch) {
        // Process previous transaction if exists
        if (currentLine && lastDate) {
          const transaction = this.parseTransactionLine(currentLine, lastDate)
          if (transaction) {
            transactions.push(transaction)
          }
        }

        // Extract date
        let day: number, month: number, year: number
        
        if (dateMatch[0].includes('/')) {
          // DD/MM/YYYY format
          day = parseInt(dateMatch[1], 10)
          month = parseInt(dateMatch[2], 10)
          year = parseInt(dateMatch[3], 10)
        } else if (dateMatch[0].includes('-')) {
          // DD-MM-YYYY format
          day = parseInt(dateMatch[1], 10)
          month = parseInt(dateMatch[2], 10)
          year = parseInt(dateMatch[3], 10)
        } else {
          // DD MMM YYYY format
          day = parseInt(dateMatch[1], 10)
          month = monthMap[dateMatch[2].toUpperCase()]
          year = parseInt(dateMatch[3], 10)
        }

        // Handle 2-digit years (e.g., "25" -> "2025")
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year
        }

        lastDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        currentYear = year

        // Extract rest of the line (description and amounts)
        const restOfLine = line.substring(dateMatch[0].length).trim()
        currentLine = restOfLine
      } else if (lastDate && line.length > 0 && !line.match(/^\d+$/)) {
        // Continuation line (multi-line description)
        currentLine += ' ' + line
      }
    }

    // Process last transaction
    if (currentLine && lastDate) {
      const transaction = this.parseTransactionLine(currentLine, lastDate)
      if (transaction) {
        transactions.push(transaction)
      }
    }

    console.log('[WESTPAC-PARSER] Final transaction count:', transactions.length)
    return transactions
  }

  /**
   * Parse a single transaction line
   * Format: Description | Debit | Credit | Balance
   */
  private parseTransactionLine(line: string, date: string): BankTransaction | null {
    // Remove extra spaces and clean up
    line = line.replace(/\s+/g, ' ').trim()
    
    if (!line || line.length < 3) {
      return null
    }

    // Extract amounts (numbers with commas and decimals)
    // Pattern: matches numbers like "1,234.56" or "1234.56"
    const amountPattern = /([\d,]+\.?\d*)/g
    const amounts: number[] = []
    let match
    
    while ((match = amountPattern.exec(line)) !== null) {
      const amountStr = match[1].replace(/,/g, '')
      const amount = parseFloat(amountStr)
      if (!isNaN(amount)) {
        amounts.push(amount)
      }
    }

    if (amounts.length === 0) {
      return null
    }

    // Westpac typically has: Description | Debit | Credit | Balance
    // Or: Description | Amount | Balance (where Amount sign indicates debit/credit)
    let debit: number | null = null
    let credit: number | null = null
    let balance: number | null = null
    let description = line

    if (amounts.length >= 3) {
      // Format: Description | Debit | Credit | Balance
      debit = amounts[0] > 0 ? amounts[0] : null
      credit = amounts[1] > 0 ? amounts[1] : null
      balance = amounts[2] > 0 ? amounts[2] : null
      
      // Remove amounts from description
      description = line.replace(amountPattern, '').trim()
    } else if (amounts.length === 2) {
      // Format: Description | Amount | Balance
      // Amount sign or position determines debit/credit
      const amount = amounts[0]
      balance = amounts[1]
      
      // Check if amount appears before or after description
      const amountIndex = line.indexOf(amounts[0].toString())
      const balanceIndex = line.indexOf(amounts[1].toString())
      
      if (amountIndex < balanceIndex) {
        // Amount is debit (expense)
        debit = amount
        credit = null
      } else {
        // Amount is credit (income)
        credit = amount
        debit = null
      }
      
      // Remove amounts from description
      description = line.replace(amountPattern, '').trim()
    } else if (amounts.length === 1) {
      // Single amount - try to determine if debit or credit based on context
      const amount = amounts[0]
      balance = amount
      
      // Heuristic: if description contains keywords suggesting income, it's credit
      const upperDesc = description.toUpperCase()
      if (upperDesc.includes('DEPOSIT') || 
          upperDesc.includes('CREDIT') ||
          upperDesc.includes('TRANSFER FROM') ||
          upperDesc.includes('PAYMENT FROM')) {
        credit = amount
        debit = null
      } else {
        debit = amount
        credit = null
      }
    }

    // Clean description
    description = this.cleanDescription(description)

    return {
      date,
      description,
      debit,
      credit,
      balance: balance || null,
      reference: `${date}_${description.substring(0, 20)}_${Date.now()}`,
    }
  }

  /**
   * Clean transaction description
   */
  private cleanDescription(description: string): string {
    if (!description) return ''

    // Remove common prefixes and suffixes
    let cleaned = description
      .replace(/^EFTPOS\s+/i, '')
      .replace(/^VISA\s+DEBIT\s+PURCHASE\s+/i, '')
      .replace(/^VISA\s+CREDIT\s+/i, '')
      .replace(/^MASTERCARD\s+/i, '')
      .replace(/CARD\s+\d+/gi, '')
      .replace(/EFFECTIVE\s+DATE\s+\d{1,2}\/\d{1,2}\/\d{4}/gi, '')
      .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove dates
      .replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '') // Remove dates
      .replace(/AU\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Extract merchant name if possible
    // Look for common patterns like "MERCHANT NAME LOCATION"
    const merchantMatch = cleaned.match(/^([A-Z][A-Z\s&]+?)(?:\s+[A-Z]{2,}\s*)?$/)
    if (merchantMatch && merchantMatch[1].length > 3) {
      cleaned = merchantMatch[1].trim()
    }

    return cleaned || 'Transaction'
  }

  /**
   * Extract statement period from Westpac PDF
   */
  private extractStatementPeriod(text: string): { startDate: string; endDate: string } {
    // Westpac period patterns:
    // "Statement Period: 01/01/2025 to 31/01/2025"
    // "Period: 01 Jan 2025 - 31 Jan 2025"
    // "From: 01/01/2025 To: 31/01/2025"
    
    const patterns = [
      /Statement\s+Period[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /Period[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s+[-–]\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /From[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s+To[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const startDate = this.formatDate(match[1])
        const endDate = this.formatDate(match[2])
        if (startDate && endDate) {
          return { startDate, endDate }
        }
      }
    }

    // Fallback: use first and last transaction dates
    const dateMatches = Array.from(
      text.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)
    )
    const dates: string[] = []
    for (const match of dateMatches) {
      const formatted = this.formatDate(match[1])
      if (formatted) dates.push(formatted)
    }

    if (dates.length >= 2) {
      dates.sort()
      return {
        startDate: dates[0],
        endDate: dates[dates.length - 1],
      }
    }

    // Default: current month
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
  }

  /**
   * Extract balances from Westpac PDF
   */
  private extractBalances(text: string): { opening: number; closing: number } {
    // Westpac balance patterns:
    // "Opening Balance: $1,234.56"
    // "Closing Balance: $2,345.67"
    // "Balance: $1,234.56"
    
    const openingPatterns = [
      /Opening\s+Balance[:\s]+[\$]?([\d,]+\.?\d*)/i,
      /Beginning\s+Balance[:\s]+[\$]?([\d,]+\.?\d*)/i,
    ]

    const closingPatterns = [
      /Closing\s+Balance[:\s]+[\$]?([\d,]+\.?\d*)/i,
      /Ending\s+Balance[:\s]+[\$]?([\d,]+\.?\d*)/i,
      /Final\s+Balance[:\s]+[\$]?([\d,]+\.?\d*)/i,
    ]

    let opening = 0
    let closing = 0

    for (const pattern of openingPatterns) {
      const match = text.match(pattern)
      if (match) {
        opening = parseFloat(match[1].replace(/,/g, ''))
        break
      }
    }

    for (const pattern of closingPatterns) {
      const match = text.match(pattern)
      if (match) {
        closing = parseFloat(match[1].replace(/,/g, ''))
        break
      }
    }

    // Fallback: extract from transaction balances
    if (opening === 0 || closing === 0) {
      const balanceMatches = Array.from(
        text.matchAll(/([\d,]+\.?\d*)\s*$/gm)
      )
      const balances: number[] = []
      for (const match of balanceMatches) {
        const balance = parseFloat(match[1].replace(/,/g, ''))
        if (!isNaN(balance)) {
          balances.push(balance)
        }
      }
      
      if (balances.length > 0) {
        if (opening === 0) opening = balances[0]
        if (closing === 0) closing = balances[balances.length - 1]
      }
    }

    return { opening, closing }
  }

  /**
   * Extract account number from Westpac PDF
   */
  private extractAccountNumber(text: string): string | null {
    // Westpac account number patterns:
    // "Account Number: 12345678"
    // "Account: 1234-5678"
    // "BSB: 123-456 Account: 12345678"
    
    const patterns = [
      /Account\s+Number[:\s]+(\d{4,12})/i,
      /Account[:\s]+(\d{4,12})/i,
      /BSB[:\s]+\d{3}[-\s]?\d{3}\s+Account[:\s]+(\d{4,12})/i,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1].replace(/\s+/g, '')
      }
    }

    return null
  }

  /**
   * Format date from DD/MM/YYYY to YYYY-MM-DD
   */
  private formatDate(dateStr: string): string | null {
    if (!dateStr) return null

    const parts = dateStr.split('/')
    if (parts.length !== 3) return null

    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    let year = parseInt(parts[2], 10)

    // Handle 2-digit years
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
}
