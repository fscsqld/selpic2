/**
 * NAB (National Australia Bank) PDF Parser
 * 
 * Implementation for parsing NAB bank statements
 */

import { PDFParser, ParsedStatement, BankTransaction } from './types'
import pdfParse from 'pdf-parse'

export class NABParser implements PDFParser {
  /**
   * Detect if this is a NAB bank statement
   */
  detectBank(pdfText: string): boolean {
    const upperText = pdfText.toUpperCase()
    
    // ⚠️ CRITICAL: ANZ를 먼저 제외 (ANZ 파서가 이미 확인했어야 함)
    // ANZ 명세서는 "ANZ ACCESS BASIC STATEMENT" 같은 명확한 패턴이 있음
    const anzIndicators = [
      'ANZ ACCESS BASIC STATEMENT',
      'ANZ ACCESS',
      'AUSTRALIA AND NEW ZEALAND BANKING GROUP',
      'ANZ BANK'
    ]
    const isANZ = anzIndicators.some(indicator => upperText.includes(indicator))
    if (isANZ) {
      console.log('[NAB-PARSER] ⚠️ ANZ statement detected - skipping NAB detection')
      return false
    }
    
    // NAB-specific indicators (더 구체적인 패턴 우선)
    const nabIndicators = [
      'TRANSACTION LISTING',  // NAB 특유의 헤더
      'Transaction Listing',
      'NATIONAL AUSTRALIA BANK',
      'NAB TRANSACTION LISTING',  // 더 구체적인 패턴
    ]

    const hasIndicator = nabIndicators.some(indicator => 
      upperText.includes(indicator.toUpperCase())
    )

    // NAB-specific pattern: BSB Number + Transaction Listing (둘 다 있어야 함)
    // ⚠️ "Account Number"만으로는 판단하지 않음 (ANZ에도 있음)
    const hasNABPattern = /BSB\s*Number/i.test(pdfText) && 
                          /Transaction\s*Listing/i.test(pdfText) &&
                          !isANZ  // ANZ가 아닌 경우에만

    console.log('[NAB-PARSER] Bank detection:', {
      hasIndicator,
      hasNABPattern,
      isANZ,
      textPreview: pdfText.substring(0, 300)
    })

    return hasIndicator || hasNABPattern
  }

  /**
   * Parse NAB PDF statement
   */
  async parse(pdfBuffer: Buffer): Promise<ParsedStatement> {
    console.log('[NAB-PARSER] Starting PDF parsing...')
    console.log('[NAB-PARSER] PDF buffer size:', pdfBuffer.length, 'bytes')
    
    let pdfData
    try {
      console.log('[NAB-PARSER] Extracting text from PDF...')
      pdfData = await pdfParse(pdfBuffer)
      console.log('[NAB-PARSER] PDF text length:', pdfData.text.length, 'characters')
      console.log('[NAB-PARSER] PDF pages:', pdfData.numpages)
    } catch (error: any) {
      console.error('[NAB-PARSER] Error parsing PDF:', error)
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }

    const text = pdfData.text
    
    // 🔍 DEBUG: Dump full PDF text for debugging
    console.log('[NAB-PARSER] ========================================')
    console.log('[NAB-PARSER] 🔍 EXTRACTED PDF TEXT (FULL DUMP):')
    console.log('[NAB-PARSER] ========================================')
    console.log(text)
    console.log('[NAB-PARSER] ========================================')
    console.log('[NAB-PARSER] End of PDF text dump')
    console.log('[NAB-PARSER] ========================================')
    
    if (!text || text.trim().length === 0) {
      console.error('[NAB-PARSER] Error: PDF text is empty')
      throw new Error('PDF appears to be empty or contains no extractable text')
    }

    console.log('[NAB-PARSER] Extracting transactions...')
    const transactions = this.extractTransactions(text)
    console.log('[NAB-PARSER] Extracted', transactions.length, 'transactions')
    
    console.log('[NAB-PARSER] Extracting statement period...')
    const statementPeriod = this.extractStatementPeriod(text)
    console.log('[NAB-PARSER] Statement period:', statementPeriod)
    
    console.log('[NAB-PARSER] Extracting balances...')
    const balances = this.extractBalances(text)
    console.log('[NAB-PARSER] Opening balance:', balances.opening, 'Closing balance:', balances.closing)
    
    console.log('[NAB-PARSER] Extracting account number...')
    const accountNumber = this.extractAccountNumber(text)
    console.log('[NAB-PARSER] Account number:', accountNumber || 'Not found')

    // 🔍 Balance 대조 검증: 파서가 읽어들인 입/출금 합계가 Closing Balance와 일치하는지 확인
    console.log('[NAB-PARSER] Validating balance reconciliation...')
    const balanceValidation = this.validateBalanceReconciliation(
      transactions,
      balances.opening,
      balances.closing
    )
    
    if (!balanceValidation.isValid) {
      console.warn('[NAB-PARSER] ⚠️ Balance reconciliation mismatch:', balanceValidation)
      console.warn('[NAB-PARSER] Calculated closing balance:', balanceValidation.calculatedClosing)
      console.warn('[NAB-PARSER] Expected closing balance:', balances.closing)
      console.warn('[NAB-PARSER] Difference:', balanceValidation.difference)
    } else {
      console.log('[NAB-PARSER] ✅ Balance reconciliation successful')
    }

    return {
      bankName: 'NAB',
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
   * Extract transactions from NAB PDF text
   * 
   * NAB format examples:
   * "02 Oct 25 EFTPOS 02/10 13:15RACQ $252.00 $3,041.25 CR"
   * "03 Oct 25 V8656 02/10 SECURE PARKING 800140 BRISBANE\n74229855275\n$25.25 $3,016.00 CR"
   * "07 Oct 25 V8656 06/10 INTL TXN FEE-MC 24011345279 $1.06 $7,150.74 CR"
   * "07 Oct 25 ASSOCIATEDCLEANING ASSOCIATED CLEAN JINSOO KIM $3,498.00 $5,743.80 CR"
   * 
   * Format: Date | Particulars (description) | Debits (비어있거나 값) | Credits (비어있거나 값) | Balance [CR/DR]
   * 
   * Features:
   * 1. Transaction Fee 인식: 해외 결제 수수료 별도 처리
   * 2. Description 클렌징: 가맹점 이름만 깔끔하게 추출
   * 3. Balance 대조: Closing Balance 검증
   * 4. 멀티라인 설명 처리
   */
  private extractTransactions(text: string): BankTransaction[] {
    console.log('[NAB-PARSER] Extracting transactions with enhanced NAB patterns...')
    const transactions: BankTransaction[] = []
    const lines = text.split('\n')
    console.log('[NAB-PARSER] Total lines to process:', lines.length)

    // NAB date pattern: "02 Oct 25" or "02 Oct 2025" (dd MMM yy or dd MMM yyyy)
    // Must be at the start of the line
    const datePattern = /^(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i

    let transactionCount = 0
    let inTransactionSection = false
    let headerFound = false
    let currentLine = ''
    let lastDate: string | null = null
    let pendingFee: { date: string; amount: number; description: string } | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.length < 5) continue

      // Check if we're entering the transaction section
      if (!inTransactionSection) {
        if (/Date\s+Particulars/i.test(line) || 
            /Transaction\s+Listing/i.test(line) ||
            /^\s*Date\s+Particulars\s+Debits\s+Credits\s+Balance/i.test(line)) {
          inTransactionSection = true
          headerFound = true
          console.log('[NAB-PARSER] Found transaction section header at line', i)
          console.log('[NAB-PARSER] Header line:', line)
          continue
        }
      }

      // If we haven't found the header yet, skip until we do
      if (!inTransactionSection && !headerFound) {
        // Try to detect if we're in transaction section by finding a date pattern
        if (datePattern.test(line)) {
          inTransactionSection = true
          console.log('[NAB-PARSER] Entered transaction section (date pattern found) at line', i)
        } else {
          continue
        }
      }

      // Check if line starts with a date
      const dateMatch = line.match(datePattern)
      
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
            console.log(`[NAB-PARSER] ✅ Extracted transaction ${transactionCount}:`, {
                date: mergedTransaction.date,
                description: mergedTransaction.description.substring(0, 50),
                debit: mergedTransaction.debit,
                credit: mergedTransaction.credit,
                balance: mergedTransaction.balance,
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
        lastDate = this.formatDate(dateMatch[1])
        currentLine = line
        
        // Check if this line is a transaction fee
        const feeInfo = this.detectTransactionFee(line, lastDate)
        if (feeInfo) {
          pendingFee = feeInfo
          currentLine = '' // Don't process fee as main transaction
        }
      } else if (lastDate && currentLine) {
        // Continuation of description (multi-line)
        // Only append if it doesn't look like a new transaction or amount
        if (!this.looksLikeNewTransaction(line) && !this.looksLikeAmountLine(line)) {
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
      console.log(`[NAB-PARSER] Added standalone transaction fee:`, feeTransaction)
    }

    console.log(`[NAB-PARSER] Total transactions extracted: ${transactions.length}`)
    
    // Validation: If no transactions found, log text for debugging
    if (transactions.length === 0) {
      console.error('[NAB-PARSER] ❌ No transactions found!')
      console.error('[NAB-PARSER] First 1000 characters of text for debugging:')
      console.error('[NAB-PARSER] ========================================')
      console.error(text.substring(0, 1000))
      console.error('[NAB-PARSER] ========================================')
    }

    return transactions
  }

  /**
   * Check if a line looks like a new transaction (has date pattern)
   */
  private looksLikeNewTransaction(line: string): boolean {
    const datePattern = /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}/i
    return datePattern.test(line)
  }

  /**
   * Check if a line looks like it contains only amounts (likely continuation of previous transaction's amounts)
   */
  private looksLikeAmountLine(line: string): boolean {
    // If line contains only amounts and CR/DR, it's likely a continuation of amounts
    const amountOnlyPattern = /^[\s\$]*[\d,]+\.\d{2}[\s]*(?:CR|DR)?$/i
    return amountOnlyPattern.test(line.trim())
  }

  /**
   * Parse a single transaction line
   * 
   * NAB 실제 형식:
   * - "02 Oct 25 EFTPOS 02/10 13:15RACQ\ $252.00 $3,041.25 CR"
   *   → Debits: 비어있음, Credits: $252.00, Balance: $3,041.25 CR
   * - "07 Oct 25 V8656 06/10 INTL TXN FEE-MC 24011345279 $1.06 $7,150.74 CR"
   *   → Debits: $1.06, Credits: 비어있음, Balance: $7,150.74 CR
   * 
   * 즉, 2개의 금액만 있음: (Debits 또는 Credits 중 하나), Balance
   */
  private parseTransactionLine(
    line: string,
    date: string
  ): BankTransaction | null {
    console.log('[NAB-PARSER] Parsing transaction line:', {
      date,
      line: line.substring(0, 80)
    })

    // Extract all amounts (with optional $ signs and CR/DR suffixes)
    const amountMatches = Array.from(line.matchAll(/\$?([\d,]+\.\d{2})(?:\s+(CR|DR))?/g))
    
    if (amountMatches.length === 0) {
      console.warn('[NAB-PARSER] No amounts found, skipping transaction')
      return null
    }

    // NAB format: Date | Description | Debits (비어있거나 값) | Credits (비어있거나 값) | Balance CR/DR
    // 실제로는 2개의 금액만 있음: (Debits 또는 Credits), Balance
    const amounts: string[] = []
    let balanceSuffix: string | undefined
    
    for (const match of amountMatches) {
      const amountValue = match[1]
      const suffix = match[2] // CR or DR
      amounts.push(amountValue)
      if (suffix) {
        balanceSuffix = suffix
      }
    }

    // Last amount is always the balance
    const balance = amounts.length > 0 
      ? this.parseAmount(amounts[amounts.length - 1])
      : null

    // Extract description (everything between date and first amount)
    const datePattern = /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}/i
    let description = line.replace(datePattern, '').trim()
    
    // Remove all amounts and suffixes from description
    for (const match of amountMatches) {
      description = description.replace(match[0], '').trim()
    }
    description = description.replace(/\s+(CR|DR)\s*$/i, '').trim()

    // Determine debit/credit
    // If there are 2 amounts: First is Debit or Credit, Second is Balance
    // If there's 1 amount: It's the Balance (transaction amount must be inferred)
    
    let debit: number | null = null
    let credit: number | null = null

    if (amounts.length >= 2) {
      // Format: (Debits 또는 Credits), Balance
      // First amount is the transaction amount (Debit or Credit)
      // Second amount is the balance
      const transactionAmount = this.parseAmount(amounts[0])
      const absAmount = Math.abs(transactionAmount)
      
      // CRITICAL: Determine if it's Debit or Credit based on:
      // 1. Description keywords (more reliable for NAB)
      // 2. Balance suffix (CR = positive balance, doesn't directly indicate transaction type)
      const isDebit = this.isDebitTransaction(description, amounts[0])
      
      if (isDebit) {
        debit = absAmount
        credit = null
        console.log('[NAB-PARSER] Classified as DEBIT:', absAmount)
      } else {
        credit = absAmount
        debit = null
        console.log('[NAB-PARSER] Classified as CREDIT:', absAmount)
      }
    } else if (amounts.length === 1) {
      // Only balance found - transaction amount must be inferred from description
      // This is rare but possible
      const isDebit = this.isDebitTransaction(description, '')
      // We can't determine the amount, so we'll need to calculate from balance change
      // For now, mark as unknown and let the system handle it
      console.warn('[NAB-PARSER] Only balance found, transaction amount unknown')
    }

    const cleanedDescription = this.cleanDescription(description)

    // 🔍 기본 카테고리 설정 (AI 분류 전에 미리 설정)
    let category: string | undefined = undefined
    
    const upperDesc = cleanedDescription.toUpperCase()
    
    // ATM 현금 입금은 NON_TAXABLE_CASH_DEPOSIT로 설정
    // 패턴: "NABATM DEP ... CARINDALE" (ATM 입금만 감지)
    // CARINDALE만으로는 판단하지 않음 (개인 지출 거래에도 CARINDALE이 포함될 수 있음)
    const isATMCashDeposit = upperDesc.includes('NABATM DEP') || 
                            upperDesc.includes('NAB ATM DEP') ||
                            upperDesc.includes('ATM DEPOSIT')
    
    if (isATMCashDeposit) {
      category = 'NON_TAXABLE_CASH_DEPOSIT'
      console.log('[NAB-PARSER] 🏷️ Category set to NON_TAXABLE_CASH_DEPOSIT for ATM cash deposit')
    }
    
    // 계좌간 이체 및 개인간 거래는 NON_TAXABLE_TRANSFER로 설정 (ATM 입금이 아닌 경우에만)
    if (!category) {
      const isAccountTransfer = upperDesc.includes('LINKED ACC TRNS') || 
                               upperDesc.includes('LINKED ACC') ||
                               (upperDesc.includes('ONLINE') && (upperDesc.includes('TRNS') || upperDesc.includes('TRANSFER')))
      
      // 개인간 거래 (가족 이름 포함)
      const isPersonalTransfer = upperDesc.includes('MRS HEE KIM') ||
                                 upperDesc.includes('HEE KIM') ||
                                 upperDesc.includes('KIM J') ||
                                 upperDesc.includes('JINSOO KIM')
      
      // 환불금 (개인간 환불)
      const isRefund = (upperDesc.includes('REFUND FEES') || upperDesc.includes('REFUND')) &&
                      (upperDesc.includes('JINSOO KIM') || upperDesc.includes('KIM'))
      
      if (isAccountTransfer || isPersonalTransfer || isRefund) {
        category = 'NON_TAXABLE_TRANSFER'
        console.log('[NAB-PARSER] 🏷️ Category set to NON_TAXABLE_TRANSFER for account transfer/personal transfer/refund')
      }
    }
    
    // 고객 수입 거래는 INCOME_SALES_CLEANING으로 설정 (ATM 입금이나 계좌간 이체가 아닌 경우)
    if (!category && credit !== null) {
      const isCustomerIncome = upperDesc.includes('AK INNOVATION') ||
                               upperDesc.includes('ASSOCIATEDCLEANING') ||
                               upperDesc.includes('ASSOCIATED CLEAN') ||
                               upperDesc.includes('JASON FAMILY SHINE') ||
                               upperDesc.includes('JASON FAMILY') ||
                               upperDesc.includes('COMMON ROOM') ||
                               upperDesc.includes('MALATANG') ||
                               upperDesc.includes('ASEEOS HOMES') ||
                               upperDesc.includes('ASEEOS')
      
      if (isCustomerIncome) {
        category = 'INCOME_SALES_CLEANING'
        console.log('[NAB-PARSER] 🏷️ Category set to INCOME_SALES_CLEANING for customer income')
      }
    }

    const transaction: BankTransaction = {
      date,
      description: cleanedDescription,
      debit,
      credit,
      balance,
      reference: this.generateReference(date, cleanedDescription),
      category, // 기본 카테고리 설정
    }

    console.log('[NAB-PARSER] Parsed transaction:', {
      date: transaction.date,
      description: transaction.description.substring(0, 40),
      debit: transaction.debit,
      credit: transaction.credit,
      balance: transaction.balance,
      category: transaction.category
    })

    return transaction
  }

  /**
   * Determine if transaction is a debit (expense/money out) based on description and amount
   * CRITICAL: This function must correctly identify money flow direction
   * 
   * 규칙:
   * 1. 고객으로부터의 수입 → CREDIT (ASSOCIATEDCLEANING, JASON FAMILY SHINE 등)
   * 2. 계좌간 이체 → DEBIT (LINKED ACC TRNS, ONLINE 등)
   * 3. 지출/비용 → DEBIT (EFTPOS, V8656 등)
   */
  private isDebitTransaction(description: string, amountStr?: string): boolean {
    const upperDesc = description.toUpperCase()
    
    // DEBIT (Expense/Money Out) Keywords
    const debitKeywords = [
      // 일반 지출
      'PAYMENT', 'PURCHASE', 'FEE', 'CHARGE', 'WITHDRAWAL',
      'TRANSFER TO', 'DEBIT', 'WITHDRAW', 'PAY', 'SPEND',
      'PAYMENT TO', 'DIRECT DEBIT',
      // 계좌간 이체 (DEBIT으로 처리) - ONLINE은 다른 맥락에서도 사용되므로 주의
      'LINKED ACC TRNS', 'LINKED ACC', 
      // ONLINE은 "ONLINE ... TRNS" 또는 "ONLINE ... TRANSFER" 패턴일 때만 DEBIT
      // 비즈니스 지출 (서브컨트랙터에게 지급)
      'MJR ENTERPRISE', 'FSCS PAYMENT', // 서브컨트랙터 지급은 DEBIT
      // 개인 지출
      '7-ELEVEN', '7ELEVEN', 'BP', 'AMPOL', 'SHELL', 'RACQ',
      'BUNNINGS', 'KLEENHUB', 'SUPERCHEAP AUTO',
      'ALDI', 'COLES', 'WOOLWORTHS', 'SCHOOL24', 'MYPLACEFDC',
      'NETFLIX', 'RESTAURANT', 'CAFE', 'TICKETEK',
      'EFTPOS', 'V8656', // 카드 결제는 일반적으로 DEBIT
      // 보험료 지출 (비즈니스 보험)
      'ALLIANZ', // 보험회사 - DEBIT으로 처리
      // 개인 지출 추가 키워드
      'HURRIKANE', 'HURRIKANE PTY', 'HANARO TRADING', 'HANARO',
      'MR TOYS', 'TOYWORLD', 'TOY WORLD', 'BENTLEYS', 'BENTLEYS CAMERA',
      'METROPOL', 'METROPOL PHARMACY',
    ]
    
    // CREDIT (Income/Money In) Keywords
    // ⚠️ 중요: 더 구체적인 키워드를 먼저 배치 (긴 키워드 우선)
    const creditKeywords = [
      // 고객으로부터의 수입 (청소업 수입) - 구체적인 키워드 우선
      'ASSOCIATEDCLEANING', 'ASSOCIATED CLEAN', // 고객으로부터의 수입 → CREDIT
      'JASON FAMILY SHINE', 'JASON FAMILY', // 고객으로부터의 수입 → CREDIT (반드시 CREDIT)
      'COMMON ROOM JASON FAMILY SHINE', 'COMMON ROOM', // COMMON ROOM도 고객 수입 → CREDIT
      'MALATANG', // 고객으로부터의 수입 → CREDIT
      'AK INNOVATION BUILDING', 'AK INNOVATION', // 고객으로부터의 수입 → CREDIT
      'ASEEOS HOMES', 'ASEEOS', // 고객으로부터의 수입 → CREDIT
      // 일반 입금
      'DEP', 'DEPOSIT',
      'TRANSFER FROM',
      'NABATM DEP', 'NAB ATM DEP', 'ATM DEPOSIT',
      // CARINDALE은 creditKeywords에서 제거됨 (ATM 입금은 NABATM DEP 패턴으로만 감지)
      // CARINDALE만으로는 CREDIT 판단하지 않음 (개인 지출 거래에도 CARINDALE이 포함될 수 있음)
      // ⚠️ 중요: MRS HEE KIM, KIM J, REFUND FEES는 개인간 거래/환불이므로 creditKeywords에서 제거
      // 이들은 NON_TAXABLE_TRANSFER로 처리되어야 함
      // 'MRS HEE KIM', 'KIM J', // 제거: 개인간 거래는 NON_TAXABLE_TRANSFER로 처리
      // 'REFUND FEES', 'REFUND', // 제거: 환불금은 NON_TAXABLE_TRANSFER로 처리
      'INTEREST', 'CREDIT', 'INCOME', 'RECEIVE', 'RECEIPT',
      'SALARY', 'PAYMENT RECEIVED', 'DIRECT CREDIT',
      'SERVICE', 'CLEANING', // Customer payments
    ]

    // Check for negative amount (indicates debit/expense)
    if (amountStr) {
      const amount = amountStr.replace(/[$,]/g, '')
      if (amount.startsWith('-') || parseFloat(amount) < 0) {
        console.log('[NAB-PARSER] Negative amount detected → DEBIT')
        return true
      }
    }

    // 🔧 CRITICAL: Check for personal expenses FIRST (before credit keywords)
    // School24 and other personal expenses must ALWAYS be DEBIT
    // ⚠️ NOTE: Allianz is NOT a personal expense - it's insurance (business expense)
    const personalExpenseKeywords = ['SCHOOL24', 'SCHOOL 24', 'MYPLACEFDC', 'HURRIKANE', 'HANARO TRADING', 
                                     'MR TOYS', 'TOYWORLD', 'BENTLEYS', 'METROPOL PHARMACY']
    for (const kw of personalExpenseKeywords) {
      if (upperDesc.includes(kw)) {
        console.log('[NAB-PARSER] 🔧 Personal expense keyword found → DEBIT (forced):', kw, '| Original:', description.substring(0, 50))
        return true // DEBIT (forced)
      }
    }
    
    // 🔧 CRITICAL: Check for refunds FIRST (before insurance and other checks)
    // Refund Fees are always CREDIT (입금), not DEBIT
    if (upperDesc.includes('REFUND FEES') || 
        (upperDesc.includes('REFUND') && (upperDesc.includes('JINSOO KIM') || upperDesc.includes('KIM')))) {
      console.log('[NAB-PARSER] 🔧 Refund Fees keyword found → CREDIT (forced):', '| Original:', description.substring(0, 50))
      return false // CREDIT (forced - refunds are always deposits)
    }
    
    // 🔧 CRITICAL: Personal names (MRS HEE KIM, KIM J, etc.) - Do NOT force DEBIT/CREDIT
    // These can be either CREDIT (deposit from person) or DEBIT (withdrawal to person)
    // Let the original bank statement data determine DEBIT/CREDIT
    // We only check these to exclude from business income classification later
    const personalNameKeywords = ['MRS HEE KIM', 'HEE KIM', 'KIM J', 'JINSOO KIM']
    const hasPersonalName = personalNameKeywords.some(kw => upperDesc.includes(kw))
    
    // If it's a personal name, don't force DEBIT/CREDIT - return null/undefined to let original data decide
    // Actually, we can't return null from boolean function, so we'll skip this check here
    // and handle it in the API route instead
    
    // 🔧 CRITICAL: Check for insurance expenses (business expenses, NOT personal transfers)
    // Allianz, NRMA, TAL, RACQ are insurance companies - must be DEBIT
    const insuranceKeywords = ['ALLIANZ', 'NRMA', 'TAL', 'RACQ INSURANCE', 'RACQ']
    for (const kw of insuranceKeywords) {
      if (upperDesc.includes(kw)) {
        console.log('[NAB-PARSER] 🔧 Insurance expense keyword found → DEBIT (forced):', kw, '| Original:', description.substring(0, 50))
        return true // DEBIT (forced - insurance is always an expense)
      }
    }

    // CRITICAL: Check credit keywords (more specific)
    // 고객으로부터의 수입은 반드시 CREDIT
    // ⚠️ 중요: 더 긴/구체적인 키워드를 먼저 매칭 (예: "JASON FAMILY SHINE"이 "JASON"보다 우선)
    // 키워드를 길이순으로 정렬하여 더 구체적인 매칭 우선
    const sortedCreditKeywords = [...creditKeywords].sort((a, b) => b.length - a.length)
    for (const kw of sortedCreditKeywords) {
      if (upperDesc.includes(kw)) {
        console.log('[NAB-PARSER] ✅ Credit keyword found in description → CREDIT:', kw, '| Original:', description.substring(0, 50))
        return false // CREDIT
      }
    }
    
    // Then check debit keywords
    // ONLINE은 특별 처리: "ONLINE ... TRNS" 또는 "ONLINE ... TRANSFER" 패턴일 때만 DEBIT
    if (upperDesc.includes('ONLINE')) {
      if (upperDesc.includes('TRNS') || upperDesc.includes('TRANSFER')) {
        console.log('[NAB-PARSER] ONLINE + TRNS/TRANSFER pattern → DEBIT (account transfer)')
      return true
    }
      // ONLINE만 있고 TRNS/TRANSFER가 없으면 일반 지출로 처리 (debitKeywords 체크 계속)
    }
    
    // DEBIT 키워드도 길이순으로 정렬하여 더 구체적인 매칭 우선
    const sortedDebitKeywords = [...debitKeywords].sort((a, b) => b.length - a.length)
    for (const kw of sortedDebitKeywords) {
      if (upperDesc.includes(kw)) {
        console.log('[NAB-PARSER] ❌ Debit keyword found in description → DEBIT:', kw, '| Original:', description.substring(0, 50))
        return true
      }
    }

    // Default: if description is unclear, check if it looks like a payment/expense
    // Most transactions in a mixed-use account are expenses unless clearly marked as deposits
    console.log('[NAB-PARSER] No clear indicator, defaulting to DEBIT')
    return true
  }

  /**
   * Format date from NAB format (dd MMM yy or dd MMM yyyy) to yyyy-MM-dd
   * Fixes OCR errors where years appear as 2525 or 2571 → defaults to 2025
   */
  private formatDate(dateStr: string): string {
    try {
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
        let year = parts[2]

        // Handle 2-digit year (e.g., "25" -> "2025")
        if (year.length === 2) {
          const yearNum = parseInt(year, 10)
          // Assume years 00-50 are 2000-2050, 51-99 are 1951-1999
          year = yearNum <= 50 ? `20${year}` : `19${year}`
        }

        // Fix OCR errors: 2525, 2571, etc. → 2025
        if (year.length === 4) {
          const yearNum = parseInt(year, 10)
          // If year is clearly an OCR error (2525, 2571, etc.), default to 2025
          if (yearNum >= 2500 && yearNum <= 2599) {
            console.warn(`[NAB-PARSER] OCR date error detected: ${year} → correcting to 2025`)
            year = '2025'
          }
          // If year is in the future (beyond 2030), likely OCR error → default to 2025
          if (yearNum > 2030) {
            console.warn(`[NAB-PARSER] Future date detected (likely OCR error): ${year} → correcting to 2025`)
            year = '2025'
          }
        }

        const month = months[monthName] || '01'
        return `${year}-${month}-${day}`
      }
    } catch (error) {
      console.error('[NAB-PARSER] Error formatting date:', dateStr, error)
    }

    // Fallback: try to parse as-is, but fix OCR errors
    try {
      const parsedDate = new Date(dateStr)
      const year = parsedDate.getFullYear()
      // Fix OCR errors
      if (year >= 2500 && year <= 2599) {
        console.warn(`[NAB-PARSER] OCR date error in fallback: ${year} → correcting to 2025`)
        parsedDate.setFullYear(2025)
      }
      if (year > 2030) {
        console.warn(`[NAB-PARSER] Future date in fallback (likely OCR error): ${year} → correcting to 2025`)
        parsedDate.setFullYear(2025)
      }
      return parsedDate.toISOString().split('T')[0]
    } catch {
      // Ultimate fallback: use current year
      const today = new Date()
      return `${today.getFullYear()}-01-01`
    }
  }

  /**
   * Clean description: Extract merchant name from complex NAB descriptions
   * 
   * Examples:
   * "EFTPOS 02/10 13:15RACQ\" → "RACQ"
   * "V8656 06/10 INTL TXN FEE-MC 24011345279" → "INTL TXN FEE-MC"
   * "V8656 02/10 SECURE PARKING 800140 BRISBANE 74229855275" → "SECURE PARKING BRISBANE"
   * "ASSOCIATEDCLEANING ASSOCIATED CLEAN JINSOO KIM" → "ASSOCIATED CLEAN"
   * "ONLINE S0990592579 LINKED ACC TRNS KIM J" → "LINKED ACC TRNS"
   */
  private cleanDescription(description: string): string {
    let cleaned = description.trim()
    
    // Remove common NAB prefixes and patterns
    const prefixesToRemove = [
      /^EFTPOS\s+\d{2}\/\d{2}\s+\d{2}:\d{2}/i,        // EFTPOS 02/10 13:15
      /^V\d+\s+\d{2}\/\d{2}\s+/i,                     // V8656 02/10
      /^ONLINE\s+S\d+\s+/i,                           // ONLINE S0990592579
      /^NABATM\s+DEP\s+\d+ST\d{2}:\d{2}/i,            // NABATM DEP 21ST09:07
      /^INTERNET\s+BPAY\s+/i,                         // INTERNET BPAY
      /^\d+\s+/,                                       // Leading numbers (transaction codes)
    ]
    
    for (const prefix of prefixesToRemove) {
      cleaned = cleaned.replace(prefix, '')
    }
    
    // Remove transaction codes and reference numbers
    // Pattern: Alphanumeric codes like "74229855275", "24011345279"
    cleaned = cleaned.replace(/\b\d{10,}\b/g, '') // 10+ digit numbers
    
    // Remove location codes and postcodes
    // Pattern: "800140 BRISBANE", "MT GRAVATTQL"
    cleaned = cleaned.replace(/\b\d{6}\s+[A-Z]+\b/g, '') // 6-digit codes + city
    cleaned = cleaned.replace(/\b[A-Z]+\s+\d{4}\b/g, '') // City + postcode
    
    // Remove trailing backslashes and special characters
    cleaned = cleaned.replace(/\\+$/, '')
    
    // Extract merchant name (usually the first meaningful words after prefix removal)
    const words = cleaned.split(/\s+/).filter(w => w.length > 0)
    
    // Find the merchant name (usually capitalized words)
    let merchantWords: string[] = []
    for (const word of words) {
      // Skip if it's all numbers or very short
      if (/^\d+$/.test(word) || word.length < 2) continue
      
      // Take capitalized words or mixed case (likely business names)
      if (/^[A-Z]/.test(word) || /^[A-Z][a-z]+/.test(word)) {
        merchantWords.push(word)
        // Usually merchant names are 1-5 words
        if (merchantWords.length >= 5) break
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
    // "Statement Period: 01 Oct 2025 to 31 Oct 2025"
    // "Period: 01/10/2025 to 31/10/2025"
    const periodPatterns = [
      /(?:Statement\s+Period|Period)[:\s]+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})\s+to\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/,
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

    // Default: use current month
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
    // "Opening Balance: $1,500.00"
    // "Closing Balance: $2,000.00"
    const openingMatch = text.match(/(?:Opening\s+Balance|Opening)[:\s]+\$?([\d,]+\.\d{2})/i)
    const closingMatch = text.match(/(?:Closing\s+Balance|Closing|Balance)[:\s]+\$?([\d,]+\.\d{2})/i)

    const opening = openingMatch ? this.parseAmount(openingMatch[1]) : 0
    const closing = closingMatch ? this.parseAmount(closingMatch[1]) : 0

    return { opening, closing }
  }

  /**
   * Extract account number from PDF text
   */
  private extractAccountNumber(text: string): string | undefined {
    // Look for patterns like:
    // "Account Number: 12345678"
    // "Account Number 1234-5678"
    const accountPatterns = [
      /Account\s+Number[:\s]+(\d{4}[- ]?\d{4,})/i,
      /Account[:\s]+(\d{8,})/i,
    ]

    for (const pattern of accountPatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1].replace(/[- ]/g, '')
      }
    }

    return undefined
  }

  /**
   * Transaction Fee 인식: 해외 결제 시 발생하는 수수료 감지
   * 
   * NAB에서 해외 결제 수수료는 보통 다음과 같은 패턴으로 나타남:
   * - "INTL TXN FEE-MC"
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
      'INTL TXN FEE',
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
    const amountMatches = Array.from(line.matchAll(/\$?([\d,]+\.\d{2})/g))
    if (amountMatches.length === 0) {
      return null
    }
    
    // Fee amount is usually the first amount (before balance)
    const feeAmount = this.parseAmount(amountMatches[0][1])
    
    // Extract fee description
    const datePattern = /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}/i
    let feeDescription = line.replace(datePattern, '').trim()
    
    // Remove all amounts from description
    for (const match of amountMatches) {
      feeDescription = feeDescription.replace(match[0], '').trim()
    }
    feeDescription = feeDescription.replace(/\s+(CR|DR)\s*$/i, '').trim()
    
    console.log('[NAB-PARSER] 💰 Transaction fee detected:', {
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
      
      console.log('[NAB-PARSER] 🔗 Merged transaction fee with main transaction:', {
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
      console.log('[NAB-PARSER] 📌 Transaction fee will be processed separately:', {
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

