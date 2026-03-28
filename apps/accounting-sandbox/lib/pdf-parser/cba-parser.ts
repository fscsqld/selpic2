/**
 * CBA (Commonwealth Bank of Australia) PDF Parser
 * 
 * Detailed implementation for parsing CBA bank statements
 */

import { PDFParser, ParsedStatement, BankTransaction } from './types'
import pdfParse from 'pdf-parse'

export class CBAParser implements PDFParser {
  /**
   * Detect if this is a CBA bank statement
   * More flexible detection to handle various CBA statement formats
   */
  detectBank(pdfText: string): boolean {
    const cbaIndicators = [
      'COMMONWEALTH BANK',
      'CBA',
      'Commonwealth Bank of Australia',
      'NetBank',
      'CommBank',
      'COMMBANK', // All caps variant
      'Commonwealth', // Just the word Commonwealth
    ]

    const upperText = pdfText.toUpperCase()
    const hasIndicator = cbaIndicators.some(indicator => 
      upperText.includes(indicator.toUpperCase())
    )

    // Also check for common CBA account patterns
    const hasAccountPattern = /BSB\s*\d{3}[- ]?\d{3}/i.test(pdfText) || 
                             /Account\s*[:#]?\s*\d{4}[- ]?\d{4}/i.test(pdfText)

    console.log('[CBA-PARSER] Bank detection:', {
      hasIndicator,
      hasAccountPattern,
      textPreview: pdfText.substring(0, 200)
    })

    return hasIndicator || hasAccountPattern
  }

  /**
   * Parse CBA PDF statement
   */
  async parse(pdfBuffer: Buffer): Promise<ParsedStatement> {
    console.log('[CBA-PARSER] Starting PDF parsing...')
    console.log('[CBA-PARSER] PDF buffer size:', pdfBuffer.length, 'bytes')
    
    let pdfData
    try {
      console.log('[CBA-PARSER] Extracting text from PDF...')
      pdfData = await pdfParse(pdfBuffer)
      console.log('[CBA-PARSER] PDF text length:', pdfData.text.length, 'characters')
      console.log('[CBA-PARSER] PDF pages:', pdfData.numpages)
    } catch (error: any) {
      console.error('[CBA-PARSER] Error parsing PDF:', error)
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }

    const text = pdfData.text
    
    // 🔍 DEBUG: Dump full PDF text for debugging
    console.log('[CBA-PARSER] ========================================')
    console.log('[CBA-PARSER] 🔍 EXTRACTED PDF TEXT (FULL DUMP):')
    console.log('[CBA-PARSER] ========================================')
    console.log(text)
    console.log('[CBA-PARSER] ========================================')
    console.log('[CBA-PARSER] End of PDF text dump')
    console.log('[CBA-PARSER] ========================================')
    
    if (!text || text.trim().length === 0) {
      console.error('[CBA-PARSER] Error: PDF text is empty')
      throw new Error('PDF appears to be empty or contains no extractable text')
    }

    console.log('[CBA-PARSER] Extracting transactions...')
    const transactions = this.extractTransactions(text)
    console.log('[CBA-PARSER] Extracted', transactions.length, 'transactions')
    
    console.log('[CBA-PARSER] Extracting statement period...')
    const statementPeriod = this.extractStatementPeriod(text)
    console.log('[CBA-PARSER] Statement period:', statementPeriod)
    
    console.log('[CBA-PARSER] Extracting balances...')
    const balances = this.extractBalances(text)
    console.log('[CBA-PARSER] Opening balance:', balances.opening, 'Closing balance:', balances.closing)
    
    console.log('[CBA-PARSER] Extracting account number...')
    const accountNumber = this.extractAccountNumber(text)
    console.log('[CBA-PARSER] Account number:', accountNumber || 'Not found')

    // 🔍 Balance 대조 검증: 파서가 읽어들인 입/출금 합계가 Closing Balance와 일치하는지 확인
    console.log('[CBA-PARSER] Validating balance reconciliation...')
    const balanceValidation = this.validateBalanceReconciliation(
      transactions,
      balances.opening,
      balances.closing
    )
    
    if (!balanceValidation.isValid) {
      console.warn('[CBA-PARSER] ⚠️ Balance reconciliation mismatch:', balanceValidation)
      console.warn('[CBA-PARSER] Calculated closing balance:', balanceValidation.calculatedClosing)
      console.warn('[CBA-PARSER] Expected closing balance:', balances.closing)
      console.warn('[CBA-PARSER] Difference:', balanceValidation.difference)
    } else {
      console.log('[CBA-PARSER] ✅ Balance reconciliation successful')
    }

    return {
      bankName: 'CBA',
      accountNumber,
      statementPeriod,
      openingBalance: balances.opening,
      closingBalance: balances.closing,
      transactions,
      metadata: {
        statementDate: new Date().toISOString(),
        balanceValidation, // Balance 검증 결과 포함
      },
    }
  }

  /**
   * Extract transactions from CBA PDF text
   * 
   * CBA PDF format example:
   * "15/01/2026 PAYMENT FROM CUSTOMER ABC $1,500.00 $1,500.00"
   * "16/01/2026 OFFICEWORKS PURCHASE $250.00 $1,250.00"
   * 
   * Features:
   * 1. Transaction Fee 인식: 해외 결제 수수료 별도 처리
   * 2. Description 클렌징: 가맹점 이름만 깔끔하게 추출
   * 3. Balance 대조: Closing Balance 검증
   */
  private extractTransactions(text: string): BankTransaction[] {
    console.log('[CBA-PARSER] Extracting transactions with enhanced patterns...')
    const transactions: BankTransaction[] = []
    const lines = text.split('\n')
    console.log('[CBA-PARSER] Total lines to process:', lines.length)

    // Multiple date patterns to handle different formats (must be at start of line)
    const datePatterns = [
      /^(\d{2}\/\d{2}\/\d{4})/,           // dd/MM/yyyy (e.g., 15/01/2026)
      /^(\d{2}-\d{2}-\d{4})/,             // dd-MM-yyyy (e.g., 15-01-2026)
      /^(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i, // dd MMM yyyy (e.g., 01 Jan 2026)
      /^(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i, // dd MMMM yyyy
    ]

    let currentLine = ''
    let lastDate: string | null = null
    let transactionCount = 0
    let pendingFee: { date: string; amount: number; description: string } | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.length < 5) continue // Skip very short lines

      // Check if line starts with any date pattern
      let dateMatch: RegExpMatchArray | null = null
      let matchedPattern = -1
      
      for (let j = 0; j < datePatterns.length; j++) {
        const match = line.match(datePatterns[j])
        if (match) {
          dateMatch = match
          matchedPattern = j
          break
        }
      }
      
      if (dateMatch) {
        // Process previous transaction if exists
        if (currentLine && lastDate) {
          const transaction = this.parseTransactionLine(currentLine, lastDate)
          if (transaction) {
            // Check if this transaction has a pending fee to merge
            const mergedTransaction = this.mergeTransactionFee(transaction, pendingFee)
            if (mergedTransaction) {
              transactions.push(mergedTransaction)
              transactionCount++
              console.log(`[CBA-PARSER] Extracted transaction ${transactionCount}:`, {
                date: mergedTransaction.date,
                description: mergedTransaction.description.substring(0, 50),
                amount: mergedTransaction.debit || mergedTransaction.credit,
                hasFee: !!pendingFee
              })
              pendingFee = null // Clear pending fee after merge
            } else {
              transactions.push(transaction)
              transactionCount++
            }
          }
        }

        // Start new transaction
        lastDate = this.formatDateFromMatch(dateMatch[1], matchedPattern)
        currentLine = line
        
        // Check if this line is a transaction fee
        const feeInfo = this.detectTransactionFee(line, lastDate)
        if (feeInfo) {
          pendingFee = feeInfo
          currentLine = '' // Don't process fee as main transaction
        }
      } else if (lastDate && currentLine) {
        // Continuation of description (multi-line)
        // Only append if it doesn't look like a new transaction
        if (!this.looksLikeNewTransaction(line)) {
          currentLine += ' ' + line
        }
      } else if (lastDate && !currentLine && pendingFee) {
        // Check if continuation line is also a fee
        const feeInfo = this.detectTransactionFee(line, lastDate)
        if (feeInfo) {
          // Merge with existing pending fee
          pendingFee.amount += feeInfo.amount
          pendingFee.description += ' ' + feeInfo.description
        }
      }
    }

    // Process last transaction
    if (currentLine && lastDate) {
      const transaction = this.parseTransactionLine(currentLine, lastDate)
      if (transaction) {
        const mergedTransaction = this.mergeTransactionFee(transaction, pendingFee)
        if (mergedTransaction) {
          transactions.push(mergedTransaction)
          transactionCount++
          pendingFee = null
        } else {
          transactions.push(transaction)
          transactionCount++
        }
      }
    }

    // If there's a remaining pending fee without a main transaction, add it separately
    if (pendingFee && lastDate) {
      const feeTransaction: BankTransaction = {
        date: pendingFee.date,
        description: `Transaction Fee: ${pendingFee.description}`,
        debit: pendingFee.amount,
        credit: null,
        balance: null,
        reference: this.generateReference(pendingFee.date, `FEE_${pendingFee.description}`),
      }
      transactions.push(feeTransaction)
      transactionCount++
      console.log(`[CBA-PARSER] Added standalone transaction fee:`, feeTransaction)
    }

    console.log(`[CBA-PARSER] Total transactions extracted: ${transactions.length}`)
    return transactions
  }

  /**
   * Check if a line looks like a new transaction (has date pattern)
   */
  private looksLikeNewTransaction(line: string): boolean {
    const datePatterns = [
      /^\d{2}\/\d{2}\/\d{4}/,
      /^\d{2}-\d{2}-\d{4}/,
      /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i,
    ]
    return datePatterns.some(pattern => pattern.test(line))
  }

  /**
   * Format date from various formats to yyyy-MM-dd
   */
  private formatDateFromMatch(dateStr: string, patternIndex: number): string {
    try {
      if (patternIndex === 0 || patternIndex === 1) {
        // dd/MM/yyyy or dd-MM-yyyy
        const separator = patternIndex === 0 ? '/' : '-'
        const [day, month, year] = dateStr.split(separator)
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      } else if (patternIndex === 2 || patternIndex === 3) {
        // dd MMM yyyy or dd MMMM yyyy
        const months: Record<string, string> = {
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
        
        const parts = dateStr.trim().split(/\s+/)
        if (parts.length >= 3) {
          const day = parts[0].padStart(2, '0')
          const monthName = parts[1].toLowerCase()
          const year = parts[2]
          const month = months[monthName] || '01'
          return `${year}-${month}-${day}`
        }
      }
    } catch (error) {
      console.error('[CBA-PARSER] Error formatting date:', dateStr, error)
    }
    
    // Fallback: try to parse as-is
    try {
      return new Date(dateStr).toISOString().split('T')[0]
    } catch {
      return new Date().toISOString().split('T')[0]
    }
  }

  /**
   * Parse a single transaction line
   */
  private parseTransactionLine(line: string, date: string): BankTransaction | null {
    // Remove date from line
    const withoutDate = line.replace(/\d{2}\/\d{2}\/\d{4}/, '').trim()
    
    // Extract amounts (last two amounts are typically: transaction amount and balance)
    const amountMatches = Array.from(withoutDate.matchAll(/\$([\d,]+\.\d{2})/g))
    
    if (amountMatches.length < 1) {
      return null // No amount found
    }

    // Last amount is usually the balance
    const balance = this.parseAmount(amountMatches[amountMatches.length - 1][1])
    
    // Transaction amount (could be debit or credit)
    // If there are 2+ amounts, the second-to-last is usually the transaction amount
    let transactionAmount = 0
    let isDebit = false

    if (amountMatches.length >= 2) {
      transactionAmount = this.parseAmount(amountMatches[amountMatches.length - 2][1])
    } else if (amountMatches.length === 1) {
      transactionAmount = this.parseAmount(amountMatches[0][1])
    }

    // Determine if debit or credit based on description or amount position
    // CBA format: Debit amounts are typically negative or in a specific column
    // For now, we'll use heuristics: if description contains common debit keywords, it's a debit
    const description = this.extractDescription(withoutDate, amountMatches)
    const cleanedDescription = this.cleanDescription(description)

    // Heuristic: Check if it's likely a debit
    const debitKeywords = ['PURCHASE', 'PAYMENT', 'FEE', 'CHARGE', 'WITHDRAWAL', 'TRANSFER TO']
    const creditKeywords = ['DEPOSIT', 'PAYMENT FROM', 'TRANSFER FROM', 'INTEREST', 'CREDIT']

    const upperDesc = cleanedDescription.toUpperCase()
    if (debitKeywords.some(kw => upperDesc.includes(kw))) {
      isDebit = true
    } else if (creditKeywords.some(kw => upperDesc.includes(kw))) {
      isDebit = false
    } else {
      // Default: if amount is in typical debit position, assume debit
      // Otherwise, check balance change
      isDebit = amountMatches.length >= 2
    }

    return {
      date,
      description: cleanedDescription,
      debit: isDebit ? transactionAmount : null,
      credit: isDebit ? null : transactionAmount,
      balance,
      reference: this.generateReference(date, cleanedDescription),
    }
  }

  /**
   * Extract description from transaction line
   */
  private extractDescription(line: string, amountMatches: RegExpMatchArray[]): string {
    let description = line

    // Remove all amount patterns
    for (const match of amountMatches) {
      description = description.replace(match[0], '')
    }

    // Clean up extra spaces
    description = description.trim().replace(/\s+/g, ' ')

    return description
  }

  /**
   * Clean description: Extract merchant name from complex CBA descriptions
   * 
   * Examples:
   * "POS W'DRL CITY OF SYDNEY..." → "CITY OF SYDNEY"
   * "EFTPOS PURCHASE COLES SYDNEY..." → "COLES SYDNEY"
   * "BPAY PAYMENT TO TELSTRA..." → "TELSTRA"
   * "PAYMENT FROM CUSTOMER ABC" → "CUSTOMER ABC"
   */
  private cleanDescription(description: string): string {
    let cleaned = description.trim()
    
    // Remove common CBA prefixes and patterns
    const prefixesToRemove = [
      /^POS\s+W'?DRL\s+/i,           // POS W'DRL or POS WDRL
      /^EFTPOS\s+PURCHASE\s+/i,       // EFTPOS PURCHASE
      /^BPAY\s+PAYMENT\s+TO\s+/i,     // BPAY PAYMENT TO
      /^PAYMENT\s+FROM\s+/i,           // PAYMENT FROM
      /^PAYMENT\s+TO\s+/i,             // PAYMENT TO
      /^TRANSFER\s+TO\s+/i,            // TRANSFER TO
      /^TRANSFER\s+FROM\s+/i,          // TRANSFER FROM
      /^ATM\s+WITHDRAWAL\s+/i,         // ATM WITHDRAWAL
      /^ONLINE\s+PAYMENT\s+/i,         // ONLINE PAYMENT
      /^DIRECT\s+DEBIT\s+/i,           // DIRECT DEBIT
      /^DIRECT\s+CREDIT\s+/i,          // DIRECT CREDIT
      /^CHEQUE\s+DEPOSIT\s+/i,         // CHEQUE DEPOSIT
      /^INTERNET\s+BANKING\s+/i,       // INTERNET BANKING
      /^MOBILE\s+BANKING\s+/i,         // MOBILE BANKING
    ]
    
    for (const prefix of prefixesToRemove) {
      cleaned = cleaned.replace(prefix, '')
    }
    
    // Remove transaction codes and reference numbers
    // Pattern: Alphanumeric codes like "123456", "ABC123", "REF123456"
    cleaned = cleaned.replace(/\b[A-Z0-9]{6,}\s*(?=\w)/g, '')
    
    // Remove location codes and time stamps
    // Pattern: "SYDNEY 2000", "MELBOURNE 3000", "12:34:56"
    cleaned = cleaned.replace(/\b[A-Z]+\s+\d{4}\b/g, '') // City + Postcode
    cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2}/g, '') // Time stamps
    
    // Remove card numbers (masked: ****1234)
    cleaned = cleaned.replace(/\*{4}\d{4}/g, '')
    
    // Remove transaction IDs and reference numbers at the end
    // Pattern: "REF: 123456", "TXN: ABC123", "ID: 789"
    cleaned = cleaned.replace(/\b(REF|TXN|ID|REFERENCE)[:\s]+\w+\s*$/i, '')
    
    // Extract merchant name (usually the first meaningful words after prefix removal)
    // Take first 2-4 words that look like a business name
    const words = cleaned.split(/\s+/).filter(w => w.length > 0)
    
    // Find the merchant name (usually capitalized words)
    let merchantWords: string[] = []
    for (const word of words) {
      // Skip if it's all numbers or very short
      if (/^\d+$/.test(word) || word.length < 2) continue
      
      // Take capitalized words or mixed case (likely business names)
      if (/^[A-Z]/.test(word) || /^[A-Z][a-z]+/.test(word)) {
        merchantWords.push(word)
        // Usually merchant names are 1-4 words
        if (merchantWords.length >= 4) break
      } else if (merchantWords.length > 0) {
        // If we already have merchant words, stop at lowercase words (likely description)
        break
      }
    }
    
    // If we found merchant words, use them; otherwise use cleaned description
    if (merchantWords.length > 0) {
      cleaned = merchantWords.join(' ')
    }
    
    // Final cleanup: normalize spaces and remove special characters
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/[^\w\s\-.,()&]/g, '') // Remove special chars except common punctuation
      .trim()
    
    // If cleaned is too short or empty, return original (fallback)
    if (cleaned.length < 3) {
      return description.trim()
    }
    
    return cleaned
  }

  /**
   * Parse amount string to number
   * Handles formats like "1,500.00" or "1500.00"
   */
  private parseAmount(amountStr: string): number {
    return parseFloat(amountStr.replace(/,/g, ''))
  }

  /**
   * Format date from dd/MM/yyyy to yyyy-MM-dd
   */
  private formatDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  /**
   * Generate a unique reference for the transaction
   */
  private generateReference(date: string, description: string): string {
    const hash = description
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
      .toString(36)
      .substring(0, 8)
    
    return `${date}_${hash}`
  }

  /**
   * Extract statement period from PDF text
   */
  private extractStatementPeriod(text: string): {
    startDate: string
    endDate: string
  } {
    // Look for patterns like:
    // "Statement Period: 01/01/2026 to 31/01/2026"
    // "Period: 01 Jan 2026 to 31 Jan 2026"
    
    const periodPatterns = [
      /Statement\s+Period[:\s]+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i,
      /Period[:\s]+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i,
      /(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/,
    ]

    for (const pattern of periodPatterns) {
      const match = text.match(pattern)
      if (match) {
        return {
          startDate: this.formatDate(match[1]),
          endDate: this.formatDate(match[2]),
        }
      }
    }

    // Fallback: use current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return {
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
    }
  }

  /**
   * Extract opening and closing balances
   */
  private extractBalances(text: string): {
    opening: number
    closing: number
  } {
    // Look for patterns like:
    // "Opening Balance: $1,000.00"
    // "Closing Balance: $2,500.00"
    // "Balance: $1,000.00" (at start/end)

    const openingPatterns = [
      /Opening\s+Balance[:\s]+\$([\d,]+\.\d{2})/i,
      /Beginning\s+Balance[:\s]+\$([\d,]+\.\d{2})/i,
    ]

    const closingPatterns = [
      /Closing\s+Balance[:\s]+\$([\d,]+\.\d{2})/i,
      /Ending\s+Balance[:\s]+\$([\d,]+\.\d{2})/i,
      /Final\s+Balance[:\s]+\$([\d,]+\.\d{2})/i,
    ]

    let opening = 0
    let closing = 0

    for (const pattern of openingPatterns) {
      const match = text.match(pattern)
      if (match) {
        opening = this.parseAmount(match[1])
        break
      }
    }

    for (const pattern of closingPatterns) {
      const match = text.match(pattern)
      if (match) {
        closing = this.parseAmount(match[1])
        break
      }
    }

    // If not found, try to extract from transaction balances
    if (opening === 0 || closing === 0) {
      const transactions = this.extractTransactions(text)
      if (transactions.length > 0) {
        // Opening balance: first transaction's balance minus its amount
        const firstTx = transactions[0]
        const firstAmount = firstTx.debit || firstTx.credit || 0
        opening = (firstTx.balance || 0) - (firstTx.credit || 0) + (firstTx.debit || 0)

        // Closing balance: last transaction's balance
        const lastTx = transactions[transactions.length - 1]
        closing = lastTx.balance || 0
      }
    }

    return { opening, closing }
  }

  /**
   * Extract account number from PDF text
   */
  private extractAccountNumber(text: string): string | undefined {
    // Look for patterns like:
    // "Account: 1234-5678"
    // "Account Number: 1234 5678"
    // "BSB: 062-000 Account: 1234-5678"

    const accountPatterns = [
      /Account[:\s]+(\d{4}[- ]?\d{4})/i,
      /Account\s+Number[:\s]+(\d{4}[- ]?\d{4})/i,
      /BSB[:\s]+\d{3}[- ]?\d{3}[:\s]+Account[:\s]+(\d{4}[- ]?\d{4})/i,
    ]

    for (const pattern of accountPatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1].replace(/\s/g, '-')
      }
    }

    return undefined
  }

  /**
   * Transaction Fee 인식: 해외 결제 시 발생하는 수수료 감지
   * 
   * CBA에서 해외 결제 수수료는 보통 다음과 같은 패턴으로 나타남:
   * - "INTERNATIONAL TRANSACTION FEE"
   * - "FOREIGN CURRENCY FEE"
   * - "CURRENCY CONVERSION FEE"
   * - "OVERSEAS TRANSACTION FEE"
   * 
   * @param line 거래 라인
   * @param date 거래 날짜
   * @returns Transaction Fee 정보 또는 null
   */
  private detectTransactionFee(
    line: string,
    date: string
  ): { date: string; amount: number; description: string } | null {
    const upperLine = line.toUpperCase()
    
    // Transaction Fee 키워드 패턴
    const feeKeywords = [
      'INTERNATIONAL TRANSACTION FEE',
      'FOREIGN CURRENCY FEE',
      'CURRENCY CONVERSION FEE',
      'OVERSEAS TRANSACTION FEE',
      'FOREIGN TRANSACTION FEE',
      'FX FEE',
      'CROSS BORDER FEE',
    ]
    
    const hasFeeKeyword = feeKeywords.some(keyword => upperLine.includes(keyword))
    
    if (!hasFeeKeyword) {
      return null
    }
    
    // Extract fee amount
    const amountMatches = Array.from(line.matchAll(/\$([\d,]+\.\d{2})/g))
    if (amountMatches.length === 0) {
      return null
    }
    
    // Fee amount is usually the first or only amount
    const feeAmount = this.parseAmount(amountMatches[0][1])
    
    // Extract fee description
    let feeDescription = line
    for (const match of amountMatches) {
      feeDescription = feeDescription.replace(match[0], '')
    }
    feeDescription = feeDescription.trim().replace(/\s+/g, ' ')
    
    console.log('[CBA-PARSER] 💰 Transaction fee detected:', {
      date,
      amount: feeAmount,
      description: feeDescription.substring(0, 50)
    })
    
    return {
      date,
      amount: feeAmount,
      description: feeDescription,
    }
  }

  /**
   * Transaction Fee를 메인 거래와 병합하거나 별도로 처리
   * 
   * 전략:
   * 1. Fee가 작은 금액(보통 $2-5)이고 메인 거래와 같은 날짜면 병합
   * 2. Fee가 큰 금액이거나 다른 날짜면 별도 거래로 처리
   * 
   * @param transaction 메인 거래
   * @param pendingFee 대기 중인 Transaction Fee
   * @returns 병합된 거래 또는 원본 거래
   */
  private mergeTransactionFee(
    transaction: BankTransaction,
    pendingFee: { date: string; amount: number; description: string } | null
  ): BankTransaction | null {
    if (!pendingFee) {
      return transaction
    }
    
    // Fee가 같은 날짜이고 작은 금액이면 병합
    const isSameDate = transaction.date === pendingFee.date
    const isSmallFee = pendingFee.amount <= 10 // $10 이하
    const isDebitTransaction = transaction.debit !== null
    
    if (isSameDate && isSmallFee && isDebitTransaction) {
      // 메인 거래 금액에 Fee 추가
      const mergedDebit = (transaction.debit || 0) + pendingFee.amount
      const mergedDescription = `${transaction.description} (incl. ${pendingFee.description})`
      
      console.log('[CBA-PARSER] 🔗 Merged transaction fee with main transaction:', {
        original: transaction.debit,
        fee: pendingFee.amount,
        merged: mergedDebit,
        description: mergedDescription.substring(0, 50)
      })
      
      return {
        ...transaction,
        debit: mergedDebit,
        description: mergedDescription,
      }
    } else {
      // Fee를 별도 거래로 처리 (다음 거래로 추가될 예정)
      console.log('[CBA-PARSER] 📌 Transaction fee will be processed separately:', {
        reason: !isSameDate ? 'different date' : isSmallFee ? 'large fee' : 'credit transaction',
        fee: pendingFee.amount
      })
      
      // Fee는 별도로 처리되므로 원본 거래 반환
      return transaction
    }
  }

  /**
   * Balance 대조 검증: 파서가 읽어들인 입/출금 합계가 Closing Balance와 일치하는지 확인
   * 
   * 계산식:
   * Calculated Closing Balance = Opening Balance + Total Credits - Total Debits
   * 
   * @param transactions 추출된 거래 내역
   * @param openingBalance 기초 잔액
   * @param expectedClosingBalance PDF에서 추출한 기말 잔액
   * @returns 검증 결과
   */
  private validateBalanceReconciliation(
    transactions: BankTransaction[],
    openingBalance: number,
    expectedClosingBalance: number
  ): {
    isValid: boolean
    calculatedClosing: number
    expectedClosing: number
    difference: number
    totalCredits: number
    totalDebits: number
    transactionCount: number
  } {
    let totalCredits = 0
    let totalDebits = 0
    
    for (const tx of transactions) {
      if (tx.credit !== null) {
        totalCredits += tx.credit
      }
      if (tx.debit !== null) {
        totalDebits += tx.debit
      }
    }
    
    // Calculated closing balance = Opening + Credits - Debits
    const calculatedClosing = openingBalance + totalCredits - totalDebits
    
    // 허용 오차: $0.01 (반올림 오차 허용)
    const tolerance = 0.01
    const difference = Math.abs(calculatedClosing - expectedClosingBalance)
    const isValid = difference <= tolerance
    
    return {
      isValid,
      calculatedClosing,
      expectedClosing: expectedClosingBalance,
      difference,
      totalCredits,
      totalDebits,
      transactionCount: transactions.length,
    }
  }
}
