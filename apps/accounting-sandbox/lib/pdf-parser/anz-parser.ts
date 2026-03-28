/**
 * ANZ (Australia and New Zealand Banking Group) PDF Parser
 * 
 * Implementation for parsing ANZ bank statements
 */

import { PDFParser, ParsedStatement, BankTransaction } from './types'
import pdfParse from 'pdf-parse'

export class ANZParser implements PDFParser {
  /**
   * Detect if this is an ANZ bank statement
   */
  detectBank(pdfText: string): boolean {
    const upperText = pdfText.toUpperCase()
    
    // ANZ-specific indicators (우선순위: 더 구체적인 패턴 먼저)
    const anzIndicators = [
      'ANZ ACCESS BASIC STATEMENT',  // 가장 구체적인 패턴
      'ANZ ACCESS STATEMENT',
      'ANZ ACCESS',
      'AUSTRALIA AND NEW ZEALAND BANKING GROUP',
      'AUSTRALIA AND NEW ZEALAND',
      'ANZ BANK',
      'ANZ',  // 마지막에 확인 (너무 일반적)
    ]

    const hasIndicator = anzIndicators.some(indicator => 
      upperText.includes(indicator.toUpperCase())
    )

    // ANZ-specific pattern: ANZ ACCESS + Account Number + Transaction Details
    // ⚠️ 모든 조건이 충족되어야 함 (더 엄격한 검증)
    const hasANZPattern = (
      /ANZ\s+ACCESS/i.test(pdfText) || 
      /ANZ\s+ACCESS\s+BASIC\s+STATEMENT/i.test(pdfText)
    ) && 
    /Account\s+Number/i.test(pdfText) &&
    /Transaction\s+Details/i.test(pdfText)

    // 추가 검증: NAB 패턴이 없어야 함
    const hasNABPattern = /TRANSACTION\s+LISTING/i.test(pdfText) && 
                          /BSB\s*Number/i.test(pdfText)
    
    const isANZ = (hasIndicator || hasANZPattern) && !hasNABPattern

    console.log('[ANZ-PARSER] Bank detection:', {
      hasIndicator,
      hasANZPattern,
      hasNABPattern,
      isANZ,
      textPreview: pdfText.substring(0, 500)
    })

    return isANZ
  }

  /**
   * Parse ANZ PDF statement
   */
  async parse(pdfBuffer: Buffer): Promise<ParsedStatement> {
    console.log('[ANZ-PARSER] Starting PDF parsing...')
    console.log('[ANZ-PARSER] PDF buffer size:', pdfBuffer.length, 'bytes')
    
    let pdfData
    try {
      console.log('[ANZ-PARSER] Extracting text from PDF...')
      pdfData = await pdfParse(pdfBuffer)
      console.log('[ANZ-PARSER] PDF text length:', pdfData.text.length, 'characters')
      console.log('[ANZ-PARSER] PDF pages:', pdfData.numpages)
    } catch (error: any) {
      console.error('[ANZ-PARSER] Error parsing PDF:', error)
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }

    const text = pdfData.text
    
    if (!text || text.trim().length === 0) {
      console.error('[ANZ-PARSER] Error: PDF text is empty')
      throw new Error('PDF appears to be empty or contains no extractable text')
    }

    console.log('[ANZ-PARSER] Extracting transactions...')
    const transactions = this.extractTransactions(text)
    console.log('[ANZ-PARSER] Extracted', transactions.length, 'transactions')
    
    console.log('[ANZ-PARSER] Extracting statement period...')
    const statementPeriod = this.extractStatementPeriod(text)
    console.log('[ANZ-PARSER] Statement period:', statementPeriod)
    
    console.log('[ANZ-PARSER] Extracting balances...')
    const balances = this.extractBalances(text)
    console.log('[ANZ-PARSER] Opening balance:', balances.opening, 'Closing balance:', balances.closing)
    
    console.log('[ANZ-PARSER] Extracting account number...')
    const accountNumber = this.extractAccountNumber(text)
    console.log('[ANZ-PARSER] Account number:', accountNumber || 'Not found')

    return {
      bankName: 'ANZ',
      accountNumber,
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
   * Extract transactions from ANZ PDF text
   * 
   * ANZ PDF format example:
   * "04 FEB VISA DEBIT PURCHASE CARD 6934 HANARO TRADING PTY LTD UNDERWOOD EFFECTIVE DATE 01 FEB 2025 3.60 blank 94.21"
   * "10 FEB PAYMENT FROM QUEENS GIMBAP QLD PTY LTD QUEENS GIMBAP blank 1,344.00 1,369.75"
   * 
   * Format: Date | Transaction Details | Withdrawals ($) | Deposits ($) | Balance ($)
   */
  private extractTransactions(text: string): BankTransaction[] {
    console.log('[ANZ-PARSER] Extracting transactions with ANZ patterns...')
    console.log('[ANZ-PARSER] Text preview (first 2000 chars):', text.substring(0, 2000))
    const transactions: BankTransaction[] = []
    const lines = text.split('\n')
    console.log('[ANZ-PARSER] Total lines to process:', lines.length)

    // ANZ date pattern: "03 FEB", "04 FEB" (DD MMM format)
    const datePattern = /^(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})?/i

    const monthMap: Record<string, number> = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
    }

    let currentYear = new Date().getFullYear() // Default to current year
    let lastDate: string | null = null
    let currentLine = ''
    let inTransactionBlock = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip header lines
      if (line.includes('Transaction Details') || 
          line.includes('Withdrawals') || 
          line.includes('Deposits') ||
          line.includes('Balance') ||
          line.includes('OPENING BALANCE') ||
          line.includes('TOTALS AT END OF PAGE') ||
          line.includes('Page') && line.includes('of')) {
        continue
      }

      // Check if line starts with a date
      const dateMatch = line.match(datePattern)
      if (dateMatch) {
        // Save previous transaction if exists
        if (currentLine && inTransactionBlock) {
          const tx = this.parseTransactionLine(currentLine, lastDate, currentYear)
          if (tx) {
            transactions.push(tx)
          }
        }

        // Start new transaction
        const day = parseInt(dateMatch[1], 10)
        const month = monthMap[dateMatch[2].toUpperCase()]
        const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : currentYear
        
        // Update current year if found
        if (dateMatch[3]) {
          currentYear = parseInt(dateMatch[3], 10)
        }

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        lastDate = dateStr
        currentLine = line
        inTransactionBlock = true
        continue
      }

      // Continue building transaction line if we're in a transaction block
      if (inTransactionBlock && line.length > 0) {
        // Check if this line contains amounts (indicating end of description)
        const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|blank)\s+(blank|\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
        if (amountPattern.test(line)) {
          // This line contains the amounts, append and parse
          currentLine += ' ' + line
          const tx = this.parseTransactionLine(currentLine, lastDate, currentYear)
          if (tx) {
            transactions.push(tx)
          }
          currentLine = ''
          inTransactionBlock = false
        } else {
          // Continue building description (merchant name might be on continuation line)
          // Only append if it looks like part of the description (not a new date or header)
          if (!line.match(/^\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i) &&
              !line.includes('Transaction Details') &&
              !line.includes('Page')) {
            currentLine += ' ' + line
          } else {
            // This looks like a new transaction or header, save current and start new
            if (currentLine) {
              const tx = this.parseTransactionLine(currentLine, lastDate, currentYear)
              if (tx) {
                transactions.push(tx)
              }
            }
            currentLine = ''
            inTransactionBlock = false
          }
        }
      }
    }

    // Handle last transaction
    if (currentLine && inTransactionBlock) {
      const tx = this.parseTransactionLine(currentLine, lastDate, currentYear)
      if (tx) {
        transactions.push(tx)
      }
    }

    console.log('[ANZ-PARSER] ✅ Extracted', transactions.length, 'transactions')
    
    if (transactions.length === 0) {
      console.error('[ANZ-PARSER] ⚠️ No transactions extracted!')
      console.error('[ANZ-PARSER] Sample lines for debugging:')
      const sampleLines = lines.slice(0, 50).filter(line => line.trim().length > 0)
      sampleLines.forEach((line, idx) => {
        console.error(`[ANZ-PARSER] Line ${idx}:`, line.substring(0, 150))
      })
    }
    
    return transactions
  }

  /**
   * Parse a single transaction line
   * 
   * Format: "04 FEB VISA DEBIT PURCHASE CARD 6934 HANARO TRADING PTY LTD UNDERWOOD EFFECTIVE DATE 01 FEB 2025 3.60 blank 94.21"
   * Or: "10 FEB PAYMENT FROM QUEENS GIMBAP QLD PTY LTD QUEENS GIMBAP blank 1,344.00 1,369.75"
   */
  private parseTransactionLine(
    line: string,
    date: string | null,
    year: number
  ): BankTransaction | null {
    if (!date) {
      console.warn('[ANZ-PARSER] No date available for transaction line')
      return null
    }

    // Extract amounts: Withdrawals, Deposits, Balance
    // Pattern: "3.60 blank 94.21" or "blank 1,344.00 1,369.75"
    const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|blank)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|blank)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
    const amountMatch = line.match(amountPattern)
    
    if (!amountMatch) {
      console.warn('[ANZ-PARSER] Could not extract amounts from line:', line.substring(0, 100))
      return null
    }

    const withdrawalStr = amountMatch[1]
    const depositStr = amountMatch[2]
    const balanceStr = amountMatch[3]

    // Parse amounts
    const withdrawal = withdrawalStr === 'blank' ? null : this.parseAmount(withdrawalStr)
    const deposit = depositStr === 'blank' ? null : this.parseAmount(depositStr)
    const balance = this.parseAmount(balanceStr)

    // Extract description (everything between date and amounts)
    // Save original line for fallback
    const originalLine = line
    
    let rawDescription = line
      .replace(/^\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}?\s*/i, '') // Remove date
      .replace(/\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|blank)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|blank)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?).*$/, '') // Remove amounts
      .trim()

    console.log('[ANZ-PARSER] Raw description before cleaning:', rawDescription.substring(0, 150))

    // Clean description: remove "EFFECTIVE DATE ..." patterns
    rawDescription = rawDescription.replace(/\s+EFFECTIVE\s+DATE\s+\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}.*$/i, '')
      .trim()

    // Clean description further to extract merchant name
    // Pass original line as fallback in case we need to re-extract
    const description = this.cleanDescription(rawDescription, originalLine)
    
    console.log('[ANZ-PARSER] Cleaned description:', description)

    // Determine debit/credit
    const debit = withdrawal
    const credit = deposit

    console.log('[ANZ-PARSER] Parsed transaction:', {
      date,
      description: description.substring(0, 50),
      debit,
      credit,
      balance
    })

    return {
      date,
      description,
      debit,
      credit,
      balance,
    }
  }

  /**
   * Clean transaction description - Extract merchant name accurately
   * 
   * Goal: Extract the actual merchant/business name from ANZ transaction descriptions
   * Example: "VISA DEBIT PURCHASE CARD 6934 HANARO TRADING PTY LTD UNDERWOOD" 
   *          → "Hanaro Trading"
   * Example: "PAYMENT FROM QUEENS GIMBAP QLD PTY LTD QUEENS GIMBAP"
   *          → "Queens Gimbap"
   * 
   * @param description - The cleaned description (date and amounts removed)
   * @param originalLine - Original transaction line (for fallback extraction)
   * @param isRecursive - Internal flag to prevent infinite recursion
   */
  private cleanDescription(description: string, originalLine?: string, isRecursive: boolean = false): string {
    if (!description) {
      // If description is empty, try to extract from original line (only if not recursive)
      if (originalLine && !isRecursive) {
        return this.extractMerchantFromOriginalLine(originalLine)
      }
      return ''
    }

    const desc = description.trim()
    const descLower = desc.toLowerCase()
    
    // Check if description only contains transaction type (e.g., "VISA DEBIT PURCHASE")
    // If so, try to extract merchant name from original line (only if not recursive)
    const transactionTypeOnly = /^(VISA\s+DEBIT\s+PURCHASE|VISA\s+DEBIT|EFTPOS|PAYMENT\s+FROM|PAYMENT\s+TO|ANZ\s+MOBILE\s+BANKING\s+PAYMENT|FAMILY\s+PAYMENT\s+FROM)\s*$/i.test(desc)
    if (transactionTypeOnly && originalLine && !isRecursive) {
      console.log('[ANZ-PARSER] ⚠️ Description only contains transaction type, extracting from original line')
      return this.extractMerchantFromOriginalLine(originalLine)
    }

    // Step 1: Known merchant name mappings (priority order - most specific first)
    // This ensures common merchants are correctly identified
    const merchantMap: Array<{ pattern: RegExp | string, name: string }> = [
      { pattern: /queens\s+gimbap/i, name: 'Queens Gimbap' },
      { pattern: /hanaro\s+trading/i, name: 'Hanaro Trading' },
      { pattern: /associated\s+cleaning?|associatedclean/i, name: 'Associated Cleaning' },
      { pattern: /jason\s+family(?:\s+shine)?/i, name: 'Jason Family Shine' },
      { pattern: /ak\s+innovation/i, name: 'AK Innovation' },
      { pattern: /aseeos(?:\s+homes)?/i, name: 'Aseeos Homes' },
      { pattern: /7[- ]?eleven|7eleven/i, name: '7-Eleven' },
      { pattern: /kleenhub/i, name: 'KleenHub' },
      { pattern: /ampol/i, name: 'Ampol' },
      { pattern: /bunnings/i, name: 'Bunnings' },
      { pattern: /malatang/i, name: 'Malatang' },
      { pattern: /mjr\s+enterprise/i, name: 'MJR Enterprise' },
      { pattern: /tpg(?:\s+(?:internet|telecom))?/i, name: 'TPG Internet' },
      { pattern: /alinta\s+energy/i, name: 'Alinta Energy' },
      { pattern: /brisbane\s+city\s+council/i, name: 'Brisbane City Council' },
      { pattern: /allianz/i, name: 'Allianz' },
      { pattern: /racq/i, name: 'RACQ' },
      { pattern: /nrma/i, name: 'NRMA' },
      { pattern: /supercheap\s+auto/i, name: 'Supercheap Auto' },
      { pattern: /coles/i, name: 'Coles' },
      { pattern: /woolworths/i, name: 'Woolworths' },
      { pattern: /aldi/i, name: 'Aldi' },
      { pattern: /bp\b/i, name: 'BP' },
      { pattern: /shell\b/i, name: 'Shell' },
      { pattern: /liberty\b/i, name: 'Liberty' },
      { pattern: /united\b/i, name: 'United' },
      { pattern: /club\s+dynamite/i, name: 'Club Dynamite' },
      { pattern: /medibank/i, name: 'Medibank' },
      { pattern: /optus/i, name: 'Optus' },
      { pattern: /chouette\s+cake/i, name: 'Chouette Cake' },
      { pattern: /big\s+w/i, name: 'Big W' },
      { pattern: /yuens\s+fm/i, name: 'Yuens FM' },
      { pattern: /lucky\s+asian\s+mart/i, name: 'Lucky Asian Mart' },
      { pattern: /js\s+fresh\s+fruit/i, name: 'JS Fresh Fruit' },
      { pattern: /mandu\s+place/i, name: 'Mandu Place' },
      { pattern: /msp\s+photography/i, name: 'MSP Photography' },
      { pattern: /alh\s+venues/i, name: 'ALH Venues' },
      { pattern: /moa\s+mart/i, name: 'Moa Mart' },
      { pattern: /oomenrgy/i, name: 'Oomenrgy' },
      { pattern: /when\s+harry\s+met\s+sally/i, name: 'When Harry Met Sally' },
      { pattern: /eg\s+group/i, name: 'EG Group' },
      { pattern: /eg\s+group\s*\/\s*\d+/i, name: 'EG Group' }, // Handle "EG GROUP/3215"
    ]
    
    // Check for known merchant patterns first
    for (const { pattern, name } of merchantMap) {
      if (typeof pattern === 'string') {
        if (descLower.includes(pattern)) {
          return name
        }
      } else {
        if (pattern.test(desc)) {
          return name
        }
      }
    }

    // Step 2: Remove date patterns (if any remain)
    let cleaned = desc.replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\s*/g, '')
    
    // Step 3: Remove time patterns
    cleaned = cleaned.replace(/\d{1,2}:\d{2}\s*/g, '')
    
    // Step 4: Remove "EFFECTIVE DATE ..." patterns (already done in parseTransactionLine, but keep for safety)
    cleaned = cleaned.replace(/\s+EFFECTIVE\s+DATE\s+\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}.*$/i, '')
    
    // Step 5: Remove transaction type prefixes (VISA DEBIT PURCHASE, EFTPOS, etc.)
    // Handle "PAYMENT FROM" and "PAYMENT TO" specially - keep the merchant name after "FROM" or "TO"
    if (cleaned.match(/PAYMENT\s+FROM/i)) {
      cleaned = cleaned.replace(/PAYMENT\s+FROM\s+/i, '')
    } else if (cleaned.match(/PAYMENT\s+TO/i)) {
      cleaned = cleaned.replace(/PAYMENT\s+TO\s+/i, '')
    } else {
      // Remove other transaction type prefixes
      // More aggressive: also remove "CARD 6934" pattern that might remain
      cleaned = cleaned.replace(/^(VISA\s+DEBIT\s+PURCHASE|VISA\s+DEBIT|EFTPOS|ANZ\s+MOBILE\s+BANKING\s+PAYMENT|FAMILY\s+PAYMENT\s+FROM)\s+/i, '')
      // Remove "CARD 6934" pattern (can appear after VISA DEBIT PURCHASE)
      cleaned = cleaned.replace(/^CARD\s+\d{4,5}\s+/i, '')
      cleaned = cleaned.replace(/\s+CARD\s+\d{4,5}\s+/i, ' ') // Also remove if it appears in the middle
    }
    
    // Step 6: Remove card numbers (CARD 6934, CARD 1234, etc.)
    cleaned = cleaned.replace(/CARD\s+\d{4,5}/gi, '')
    
    // Step 7: Remove long numeric strings (transaction IDs, reference numbers)
    cleaned = cleaned.replace(/\s+\d{8,}/g, '')
    cleaned = cleaned.replace(/\b\d{10,}\b/g, '')
    
    // Step 8: Remove location codes and store numbers (4-5 digits with optional letter)
    cleaned = cleaned.replace(/\b\d{4,5}[A-Z]?\b/g, '')
    
    // Step 9: Remove address patterns like "/3215 LOGAN ROAD" or "3215 LOGAN ROAD"
    // Handle patterns like "EG GROUP/3215 LOGAN ROAD" - extract merchant before "/"
    const slashAddressPattern = /^(.+?)\/\d+\s+.*$/i
    const slashAddressMatch = cleaned.match(slashAddressPattern)
    if (slashAddressMatch && slashAddressMatch[1]) {
      cleaned = slashAddressMatch[1].trim()
    } else {
      cleaned = cleaned.replace(/\s*\/\d+\s+.*$/i, '') // Remove "/3215 LOGAN ROAD" patterns
    }
    
    // Remove address patterns with numbers (e.g., "3215 LOGAN ROAD")
    cleaned = cleaned.replace(/\s+\d+\s+(LOGAN|UNDERWOOD|MOUNT\s+GRAVATT|CARINDALE|SUNNYBANK|EIGHT\s+MILE\s+PL|SPRINGWOOD|MOOROOKA|BRISBANE)\s+(ROAD|RD|STREET|ST|DRIVE|DR|AVENUE|AVE)\s*/i, '')
    
    // Step 9b: Remove location suffixes (UNDERWOOD, MOUNT GRAVATT, etc.)
    // But keep business names that might contain location words
    cleaned = cleaned.replace(/\s+(UNDERWOOD|MOUNT\s+GRAVATT|MOUNT\s+GR|CARINDALE|SUNNYBANK|EIGHT\s+MILE\s+PL|SPRINGWOOD|MOOROOKA|LOGAN|BRISBANE)\s*(AU|QLD)?$/i, '')
    
    // Step 10: Remove state abbreviations
    cleaned = cleaned.replace(/\b(QLD|NSW|VIC|SA|WA|NT|ACT|TAS|AU)\b/gi, '')
    
    // Step 11: Remove common location words (but preserve if part of business name)
    cleaned = cleaned.replace(/\b(MOUNT|MT|ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|BOULEVARD|PL|PLACE|CNR)\b/gi, '')
    
    // Step 12: Remove "PTY LTD", "PTY", "LTD" but keep the business name before it
    // Example: "HANARO TRADING PTY LTD" → "Hanaro Trading"
    cleaned = cleaned.replace(/\s+(PTY\s+)?LTD\.?$/i, '')
    cleaned = cleaned.replace(/\s+PTY\.?$/i, '')
    
    // Step 13: Clean up multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    
    // Step 14: Extract meaningful merchant name (first 2-4 words, excluding common words)
    const words = cleaned.split(/\s+/).filter(word => 
      word.length > 2 && 
      !/^\d+$/.test(word) && 
      !['THE', 'AND', 'FOR', 'FROM', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY', 'AUS', 'GOV', 'QLD', 'PTY'].includes(word.toUpperCase())
    )
    
    // Take first 2-4 meaningful words as merchant name
    if (words.length > 0) {
      const merchantName = words.slice(0, 4).join(' ')
      
      // Capitalize properly (Title Case)
      const capitalized = merchantName.split(/\s+/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      
      return capitalized
    }
    
    // Fallback: return cleaned description (truncated if too long)
    if (cleaned.length > 50) {
      return cleaned.substring(0, 50).trim()
    }
    
    // Capitalize first letter of each word for better display
    return cleaned.split(/\s+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  /**
   * Extract merchant name from original transaction line when description is incomplete
   * This is a fallback method when the initial extraction fails
   */
  private extractMerchantFromOriginalLine(originalLine: string): string {
    console.log('[ANZ-PARSER] Extracting merchant from original line:', originalLine.substring(0, 150))
    
    // Remove date
    let cleaned = originalLine.replace(/^\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}?\s*/i, '')
    
    // Remove amounts (more aggressive pattern)
    cleaned = cleaned.replace(/\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|blank)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|blank)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?).*$/, '')
    
    // Remove EFFECTIVE DATE patterns
    cleaned = cleaned.replace(/\s+EFFECTIVE\s+DATE\s+\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}.*$/i, '')
    
    // Now try to extract merchant name after transaction type
    // Pattern: "VISA DEBIT PURCHASE CARD 6934 [MERCHANT NAME] ..."
    // More flexible pattern to catch various formats like "EG GROUP/3215 LOGAN ROAD"
    const visaPattern = /VISA\s+DEBIT\s+PURCHASE\s+CARD\s+\d{4,5}\s+(.+?)(?:\s+EFFECTIVE\s+DATE|\s+blank|\s+\d|$)/i
    const visaMatch = cleaned.match(visaPattern)
    if (visaMatch && visaMatch[1]) {
      let merchantPart = visaMatch[1].trim()
      
      // Handle patterns like "EG GROUP/3215 LOGAN ROAD" - extract "EG GROUP" before "/"
      const slashPattern = /^(.+?)\/\d+/
      const slashMatch = merchantPart.match(slashPattern)
      if (slashMatch && slashMatch[1]) {
        merchantPart = slashMatch[1].trim()
      }
      
      // Remove common address patterns (ROAD, STREET, etc.)
      merchantPart = merchantPart.replace(/\s+\/\d+\s*.*$/i, '') // Remove "/3215 LOGAN ROAD" part
      merchantPart = merchantPart.replace(/\s+(LOGAN|UNDERWOOD|MOUNT\s+GRAVATT|CARINDALE|SUNNYBANK|EIGHT\s+MILE\s+PL|SPRINGWOOD|MOOROOKA|BRISBANE)\s+(ROAD|RD|STREET|ST|DRIVE|DR|AVENUE|AVE)\s*(UNDERWOOD|AU|QLD)?$/i, '')
      
      // Remove location suffixes before cleaning
      const withoutLocation = merchantPart.replace(/\s+(UNDERWOOD|MOUNT\s+GRAVATT|CARINDALE|SUNNYBANK|EIGHT\s+MILE\s+PL|SPRINGWOOD|MOOROOKA|LOGAN|BRISBANE)\s*(AU|QLD)?$/i, '').trim()
      
      if (withoutLocation) {
        return this.cleanDescription(withoutLocation, undefined, true) // Recursively clean with flag
      }
    }
    
    // Pattern: "EFTPOS [MERCHANT NAME] ..."
    const eftposPattern = /EFTPOS\s+(.+?)(?:\s+AU|\s+QLD|\s+blank|\s+\d|$)/i
    const eftposMatch = cleaned.match(eftposPattern)
    if (eftposMatch && eftposMatch[1]) {
      const merchantPart = eftposMatch[1].trim()
      // Remove location suffixes before cleaning
      const withoutLocation = merchantPart.replace(/\s+(UNDERWOOD|MOUNT\s+GRAVATT|CARINDALE|SUNNYBANK|EIGHT\s+MILE\s+PL|SPRINGWOOD|MOOROOKA|LOGAN|BRISBANE)\s*(AU|QLD)?$/i, '').trim()
      return this.cleanDescription(withoutLocation, undefined, true) // Recursively clean with flag
    }
    
    // Pattern: "PAYMENT FROM [MERCHANT NAME] ..."
    const paymentFromPattern = /PAYMENT\s+FROM\s+(.+?)(?:\s+blank|\s+\d|$)/i
    const paymentFromMatch = cleaned.match(paymentFromPattern)
    if (paymentFromMatch && paymentFromMatch[1]) {
      const merchantPart = paymentFromMatch[1].trim()
      return this.cleanDescription(merchantPart, undefined, true) // Recursively clean with flag
    }
    
    // If all patterns fail, try the standard cleanDescription (with recursive flag to prevent infinite loop)
    return this.cleanDescription(cleaned.trim(), undefined, true)
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number {
    if (!amountStr || amountStr === 'blank') return 0
    return parseFloat(amountStr.replace(/,/g, ''))
  }

  /**
   * Extract statement period
   */
  private extractStatementPeriod(text: string): { startDate: string; endDate: string } {
    // Try to find date range in text
    // ANZ statements may have "Statement Period: 01 FEB 2025 - 28 FEB 2025"
    const periodPattern = /(\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})\s*[-–]\s*(\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})/i
    const match = text.match(periodPattern)
    
    if (match) {
      const startDate = this.parseANZDate(match[1])
      const endDate = this.parseANZDate(match[3])
      if (startDate && endDate) {
        return { startDate, endDate }
      }
    }

    // Fallback: use first and last transaction dates
    const transactions = this.extractTransactions(text)
    if (transactions.length > 0) {
      const dates = transactions.map(tx => tx.date).sort()
      return {
        startDate: dates[0],
        endDate: dates[dates.length - 1]
      }
    }

    // Default: current month
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }
  }

  /**
   * Parse ANZ date format (e.g., "03 FEB 2025" or "03 FEB")
   */
  private parseANZDate(dateStr: string): string | null {
    const monthMap: Record<string, number> = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
    }

    const pattern = /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})?/i
    const match = dateStr.match(pattern)
    
    if (!match) return null

    const day = parseInt(match[1], 10)
    const month = monthMap[match[2].toUpperCase()]
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear()

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  /**
   * Extract opening and closing balances
   */
  private extractBalances(text: string): { opening: number; closing: number } {
    let opening = 0
    let closing = 0

    // Look for "OPENING BALANCE" line
    const openingPattern = /OPENING\s+BALANCE\s+blank\s+blank\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
    const openingMatch = text.match(openingPattern)
    if (openingMatch) {
      opening = this.parseAmount(openingMatch[1])
    }

    // Extract from transactions
    const transactions = this.extractTransactions(text)
    if (transactions.length > 0) {
      // Opening balance is the first transaction's balance minus the transaction amount
      const firstTx = transactions[0]
      if (firstTx.balance !== null) {
        if (firstTx.debit) {
          opening = firstTx.balance + firstTx.debit
        } else if (firstTx.credit) {
          opening = firstTx.balance - firstTx.credit
        } else {
          opening = firstTx.balance
        }
      }

      // Closing balance is the last transaction's balance
      const lastTx = transactions[transactions.length - 1]
      if (lastTx.balance !== null) {
        closing = lastTx.balance
      }
    }

    return { opening, closing }
  }

  /**
   * Extract account number
   */
  private extractAccountNumber(text: string): string | undefined {
    // Pattern: "Account Number 4856-37076"
    const pattern = /Account\s+Number\s+(\d{4}[- ]?\d{5})/i
    const match = text.match(pattern)
    return match ? match[1].replace(/\s+/g, '-') : undefined
  }
}

