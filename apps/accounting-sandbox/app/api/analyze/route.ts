import 'openai/shims/node'
import { NextRequest, NextResponse } from 'next/server'
import { PDFParserEngine } from '@/lib/pdf-parser'
import { AIClassifierEngine } from '@/lib/ai-classifier'
import { BankTransaction } from '@/lib/pdf-parser/types'
import { UniversalCSVParser } from '@/lib/csv-parser/nab-csv-parser'
import { findUserMapping, getUserMappings } from '@/lib/storage/user-mappings'
import { PAYGWithholdingEngine } from '@/lib/payg-withholding'
import { gstDetector } from '@/lib/gst-settlement'
import { FBTDetector } from '@/lib/fbt-monitoring/fbt-detector'
import { ClassificationResult } from '@/lib/ai-classifier/types'
import { matchPayrollTransaction, loadAllEmployees } from '@/lib/utils/payroll-transaction-matcher'
import { Employee } from '@/src/shared/types/employee'

/**
 * Integrated Analysis Pipeline
 * 
 * Flow: PDF Upload → CBA Parsing → OpenAI AI Classification
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[ANALYZE] ========================================');
  console.log('[ANALYZE] Starting PDF analysis request...');
  console.log('[ANALYZE] ========================================');
  console.log('[ANALYZE] Request URL:', request.url);
  console.log('[ANALYZE] Request method:', request.method);
  console.log('[ANALYZE] Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    // Step 0: Parse form data
    console.log('[ANALYZE] Step 0: Parsing form data...')
    let formData: FormData
    try {
      formData = await request.formData()
      console.log('[ANALYZE] FormData parsed successfully')
    } catch (error: any) {
      console.error('[ANALYZE] Failed to parse FormData:', error)
      throw new Error(`Failed to parse form data: ${error.message}`)
    }

    const file = formData.get('file') as File
    const userApiKey = formData.get('apiKey') as string
    const isUserApiKey = formData.get('isUserApiKey') === 'true'
    const directorName = (formData.get('directorName') as string) || ''
    const accountType = (formData.get('accountType') as string) || 'company' // Default to company for backward compatibility

    // Get Master API Key from environment variable (fallback)
    const masterApiKey = process.env.OPENAI_API_KEY

    // Use user's API key if provided, otherwise fall back to Master API Key
    const apiKey = userApiKey?.trim() || masterApiKey

    console.log('[ANALYZE] File received:', file ? {
      name: file.name,
      size: file.size,
      type: file.type
    } : 'NULL')
    console.log('[ANALYZE] Using API Key:', isUserApiKey ? 'User provided' : 'Master (from env)')
    console.log('[ANALYZE] API Key preview:', apiKey ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}` : 'NULL')
    console.log('[ANALYZE] Director Name received:', directorName || 'NOT SET')
    console.log('[ANALYZE] Account Type received:', accountType || 'NOT SET (defaulting to company)')

    if (!file) {
      console.error('[ANALYZE] Error: No file provided')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!apiKey || !apiKey.trim()) {
      console.error('[ANALYZE] Error: No API key available (neither user key nor master key)')
      return NextResponse.json(
        { error: 'OpenAI API key is required. Please provide your API key in Settings or configure OPENAI_API_KEY environment variable.' },
        { status: 400 }
      )
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      console.error('[ANALYZE] Error: Invalid API key format')
      return NextResponse.json(
        { error: 'Invalid API key format. Must start with "sk-"' },
        { status: 400 }
      )
    }

    console.log('[ANALYZE] File info:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('[ANALYZE] Error: File too large:', file.size)
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit. Please upload a smaller file.' },
        { status: 400 }
      )
    }

    // Detect file type
    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel'
    const isPDF = fileName.endsWith('.pdf') || file.type === 'application/pdf'

    console.log('[ANALYZE] File type detection:', { isCSV, isPDF, fileName, fileType: file.type })

    let parsedStatement

    if (isCSV) {
      // Step 1: Parse CSV
      console.log('[ANALYZE] Step 1: Reading CSV file...')
      let csvContent: string
      try {
        csvContent = await file.text()
        console.log('[ANALYZE] CSV content length:', csvContent.length, 'characters')
        
        if (csvContent.length === 0) {
          throw new Error('CSV file is empty')
        }
      } catch (error: any) {
        console.error('[ANALYZE] Error reading CSV file:', error)
        return NextResponse.json(
          { 
            error: 'CSV_EXTRACTION_FAILED',
            details: `Failed to read CSV file: ${error.message}`,
            type: 'FileReadError'
          },
          { status: 400 }
        )
      }

      console.log('[ANALYZE] Step 2: Initializing Universal CSV parser...')
      try {
        const csvParser = new UniversalCSVParser()
        console.log('[ANALYZE] CSV parser initialized')
        
        console.log('[ANALYZE] Step 3: Parsing CSV content...')
        parsedStatement = await csvParser.parseCSV(csvContent)
        console.log('[ANALYZE] ✅ CSV parsed successfully')
        console.log('[ANALYZE] Parsed statement:', {
          bankName: parsedStatement.bankName,
          accountNumber: parsedStatement.accountNumber,
          transactionCount: parsedStatement.transactions?.length || 0,
          openingBalance: parsedStatement.openingBalance,
          closingBalance: parsedStatement.closingBalance
        })
      } catch (error: any) {
        console.error('[ANALYZE] ❌ CSV parsing error:', error)
        console.error('[ANALYZE] Error type:', error?.constructor?.name)
        console.error('[ANALYZE] Error message:', error?.message)
        console.error('[ANALYZE] Error stack:', error?.stack)
        return NextResponse.json(
          { 
            error: 'CSV_EXTRACTION_FAILED',
            details: `Failed to parse CSV: ${error.message}`,
            type: 'CSVParsingError',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          },
          { status: 400 }
        )
      }
    } else if (isPDF) {
      // Step 1: Parse PDF
      console.log('[ANALYZE] Step 1: Reading PDF file...')
      let pdfBuffer: Buffer
      try {
        console.log('[ANALYZE] Converting file to ArrayBuffer...')
        const arrayBuffer = await file.arrayBuffer()
        console.log('[ANALYZE] ArrayBuffer size:', arrayBuffer.byteLength, 'bytes')
        
        console.log('[ANALYZE] Converting ArrayBuffer to Buffer...')
        pdfBuffer = Buffer.from(arrayBuffer)
        console.log('[ANALYZE] PDF buffer size:', pdfBuffer.length, 'bytes')
        
        if (pdfBuffer.length === 0) {
          throw new Error('PDF buffer is empty')
        }
      } catch (error: any) {
        console.error('[ANALYZE] Error reading file:', error)
        console.error('[ANALYZE] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
        return NextResponse.json(
          { 
            error: 'PDF_EXTRACTION_FAILED',
            details: `Failed to read PDF file: ${error.message}`,
            type: 'FileReadError'
          },
          { status: 400 }
        )
      }

      console.log('[ANALYZE] Step 2: Initializing PDF parser...')
      let parserEngine: PDFParserEngine
      try {
        parserEngine = new PDFParserEngine()
        console.log('[ANALYZE] PDF parser initialized')
      } catch (error: any) {
        console.error('[ANALYZE] Failed to initialize PDF parser:', error)
        throw new Error(`PDF parser initialization failed: ${error.message}`)
      }
      
      try {
        console.log('[ANALYZE] Step 3: Parsing PDF content...')
        parsedStatement = await parserEngine.parsePDF(pdfBuffer)
        console.log('[ANALYZE] ✅ PDF parsed successfully')
        console.log('[ANALYZE] Parsed statement:', {
          bankName: parsedStatement.bankName,
          accountNumber: parsedStatement.accountNumber,
          transactionCount: parsedStatement.transactions?.length || 0,
          openingBalance: parsedStatement.openingBalance,
          closingBalance: parsedStatement.closingBalance
        })
      } catch (error: any) {
        console.error('[ANALYZE] ❌ PDF parsing error:', error)
        console.error('[ANALYZE] Error type:', error?.constructor?.name)
        console.error('[ANALYZE] Error message:', error?.message)
        console.error('[ANALYZE] Error stack:', error?.stack)
        return NextResponse.json(
          { 
            error: 'PDF_EXTRACTION_FAILED',
            details: `Failed to parse PDF: ${error.message}`,
            type: 'PDFParsingError',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or CSV file.' },
        { status: 400 }
      )
    }

    if (!parsedStatement.transactions || parsedStatement.transactions.length === 0) {
      console.warn('[ANALYZE] ⚠️ Warning: No transactions found in statement')
      console.warn('[ANALYZE] Parsed statement info:', {
        bankName: parsedStatement.bankName,
        accountNumber: parsedStatement.accountNumber,
        hasTransactions: !!parsedStatement.transactions,
        transactionCount: parsedStatement.transactions?.length || 0,
        openingBalance: parsedStatement.openingBalance,
        closingBalance: parsedStatement.closingBalance
      })
      
      // Provide more helpful error message
      const errorMessage = parsedStatement.bankName 
        ? `No transactions found in the ${parsedStatement.bankName} statement. Please check if the statement contains transaction data.`
        : 'No transactions found in the statement. Please check if the statement contains transaction data.'
      
      return NextResponse.json(
        { 
          error: 'NO_TRANSACTIONS_FOUND',
          details: errorMessage,
          type: 'ParsingError',
          bankName: parsedStatement.bankName,
          accountNumber: parsedStatement.accountNumber
        },
        { status: 400 }
      )
    }

    // Step 2: AI Classification
    console.log('[ANALYZE] Step 4: Initializing AI classifier...')
    let classifierEngine: AIClassifierEngine
    try {
      console.log('[ANALYZE] Creating AIClassifierEngine instance...')
      classifierEngine = new AIClassifierEngine()
      console.log('[ANALYZE] Setting OpenAI API key...')
      classifierEngine.setOpenAIClassifier(apiKey)
      console.log('[ANALYZE] ✅ AI classifier initialized successfully')
    } catch (error: any) {
      console.error('[ANALYZE] ❌ Error initializing AI classifier:', error)
      console.error('[ANALYZE] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      return NextResponse.json(
        { 
          error: 'AI_CLASSIFIER_INIT_FAILED',
          details: `Failed to initialize AI classifier: ${error.message}`,
          type: 'ClassifierInitError'
        },
        { status: 500 }
      )
    }

    // Initialize PAYG Withholding Engine
    const paygEngine = new PAYGWithholdingEngine()

    // Initialize FBT Detector
    const fbtDetector = new FBTDetector()

    const classifiedTransactions: Array<BankTransaction & {
      id?: string
      category?: string
      confidence?: number
      department?: string
      isDirectorsLoan?: boolean
      isPreTradingExpense?: boolean
      requiresPAYG?: boolean
      isPayrollTransaction?: boolean
      payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
      noABNWarning?: {
        shouldWarn: boolean
        warningMessage: string
        withholdingAmount?: number
      }
      gstInfo?: {
        isGSTIncluded: boolean
        gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
        gstAmount?: number
        netAmount?: number
        confidence: number
        reasoning?: string
      }
      fbtInfo?: {
        isFBTRelevant: boolean
        fbtCategory?: 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other'
        fbtRisk?: 'low' | 'medium' | 'high'
        isFBTReportable: boolean
        fbtAmount?: number
        reasoning?: string
        confidence: number
      }
      capitalImprovementWarning?: boolean
      isUnusualCredit?: boolean
    }> = []

    console.log('[ANALYZE] Step 5: Classifying transactions...')
    console.log('[ANALYZE] Total transactions to classify:', parsedStatement.transactions.length)

    // Track API usage for server-side calls (will be sent to client for IndexedDB logging)
    let totalApiUsage = {
      totalCalls: 0,
      totalCost: 0,
      totalTokens: 0,
      byModel: {} as Record<string, { cost: number; tokens: number; calls: number }>
    }
    
    // 🔧 CRITICAL: Prevent infinite retry loops - Track failures and stop after 3 consecutive failures
    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 3
    const processedTransactionIds = new Set<string>() // Track processed transactions to prevent duplicates
    
    for (let index = 0; index < parsedStatement.transactions.length; index++) {
      // 🔧 CRITICAL: Stop processing if too many consecutive failures
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`[ANALYZE] 🚨 CRITICAL: Stopping processing after ${consecutiveFailures} consecutive failures (max allowed: ${MAX_CONSECUTIVE_FAILURES})`)
        console.error(`[ANALYZE] Processed ${classifiedTransactions.length} transactions before stopping`)
        console.error(`[ANALYZE] Remaining transactions: ${parsedStatement.transactions.length - index}`)
        break // Exit the loop immediately
      }
      
      const transaction = parsedStatement.transactions[index]
      
      // 🔧 CRITICAL: Prevent duplicate processing - Check if transaction was already processed
      const transactionId = transaction.reference || `${transaction.date}_${transaction.description}_${transaction.debit || transaction.credit}`
      if (processedTransactionIds.has(transactionId)) {
        console.warn(`[ANALYZE] [${index + 1}] ⚠️ Skipping duplicate transaction: ${transactionId}`)
        continue // Skip this transaction
      }
      processedTransactionIds.add(transactionId) // Mark as processed
      
      console.log(`[ANALYZE] [${index + 1}/${parsedStatement.transactions.length}] Classifying:`, {
        date: transaction.date,
        description: transaction.description.substring(0, 50),
        amount: transaction.debit || transaction.credit,
        consecutiveFailures // Log failure count
      })
      
      try {
        const descriptionUpper = transaction.description.toUpperCase()
        const hasCredit = transaction.credit && Math.abs(transaction.credit) > 0
        const hasDebit = transaction.debit && Math.abs(transaction.debit) > 0
        
        // 🔧 MANDATORY: Cash Deposit (Review Required) - Skip AI classification
        // This saves API credits and ensures accuracy for known patterns
        if (descriptionUpper.includes('CASH DEPOSIT (REVIEW REQUIRED)') || 
            descriptionUpper.includes('CASH DEPOSIT(REVIEW REQUIRED)')) {
          console.log(`[ANALYZE] [${index + 1}] 🔧 MANDATORY: Cash Deposit (Review Required) → NON_TAXABLE_CASH_DEPOSIT (Skipping AI)`);
          
          // Create classification without AI call
          const classification: ClassificationResult = {
            category: 'NON_TAXABLE_CASH_DEPOSIT',
            confidence: 1.0,
            reason: 'Mandatory classification: Cash Deposit (Review Required) - Non-taxable cash deposit',
            entityType: 'personal',
            department: 'personal',
            isDirectorsLoan: false,
            isPreTradingExpense: false,
            requiresPAYG: false,
            isPayrollTransaction: false,
            capitalImprovementWarning: false
          };
          
          // No API usage for this transaction
          // Skip GST and FBT detection for cash deposits
          const gstInfo = {
            isGSTIncluded: false,
            gstType: 'FREE' as const,
            gstAmount: 0,
            netAmount: Math.abs(transaction.debit || transaction.credit || 0),
            confidence: 1.0,
            reasoning: 'Cash deposit is GST-free'
          };
          
          const fbtInfo = {
            isFBTRelevant: false,
            fbtRisk: 'low' as const,
            fbtCategory: undefined,
            isFBTReportable: false,
            reasoning: 'Cash deposit is not FBT relevant',
            confidence: 1.0
          };
          
          // Push transaction immediately
          const classifiedTransaction = {
            ...transaction,
            id: transaction.reference || `tx_${Date.now()}_${index}`,
            category: classification.category,
            confidence: classification.confidence,
            department: classification.department,
            isDirectorsLoan: classification.isDirectorsLoan,
            isPreTradingExpense: classification.isPreTradingExpense,
            requiresPAYG: classification.requiresPAYG,
            isPayrollTransaction: classification.isPayrollTransaction,
            payrollType: classification.payrollType,
            noABNWarning: undefined,
            gstInfo: gstInfo,
            capitalImprovementWarning: classification.capitalImprovementWarning,
            fbtInfo: fbtInfo,
          } as any;
          
          classifiedTransactions.push(classifiedTransaction);
          console.log(`[ANALYZE] [${index + 1}] ✅ Cash Deposit transaction added (current count: ${classifiedTransactions.length})`);
          continue; // Skip to next transaction
        }
        
        console.log(`[ANALYZE] [${index + 1}] Calling classifier.classify()...`)
        // 🔧 COST OPTIMIZATION: Always use gpt-4o-mini for all parsing tasks (not gpt-4o)
        // This significantly reduces API costs while maintaining accuracy for transaction classification
        const useComplexModel = false // Force gpt-4o-mini for all transactions
        
        // 🔧 CRITICAL: Single API call per transaction - NO RETRIES
        // Get classification result with actual API usage info
        // Pass undefined for context to avoid sending unnecessary chat history
        const classificationResult = await classifierEngine.classify(transaction, undefined, useComplexModel);
        
        // Reset failure counter on success
        consecutiveFailures = 0
        
        // Extract usage info if available (actual API response)
        // Type assertion: classify() now returns ClassificationResult & { usage?: ... }
        const usage = (classificationResult as any).usage;
        // Unified: Auto-convert legacy categories to consolidated ones
        let normalizedCategory = classificationResult.category
        if (normalizedCategory === 'INCOME_SALES_STICKER') {
          normalizedCategory = 'INCOME_SALES_CLEANING' // Trading Revenue 통합
        } else if (normalizedCategory === 'EXPENSE_STARTUP_DOMAIN' || normalizedCategory === 'EXPENSE_STARTUP_SAMPLE') {
          normalizedCategory = 'EXPENSE_STARTUP_INCORPORATION' // Startup Costs 통합
        }
        
        let classification: ClassificationResult = {
          category: normalizedCategory,
          confidence: classificationResult.confidence,
          reason: classificationResult.reason,
          entityType: classificationResult.entityType,
          department: accountType === 'individual' 
            ? 'personal' 
            : (classificationResult.department === 'sticker' ? 'cleaning' : classificationResult.department), // Unified: 'sticker' → 'cleaning' (both are 'Company')
          isDirectorsLoan: accountType === 'individual' ? false : classificationResult.isDirectorsLoan, // No Director's Loan for individuals
          isPreTradingExpense: accountType === 'individual' ? false : classificationResult.isPreTradingExpense, // No pre-trading for individuals
          requiresPAYG: accountType === 'individual' ? false : classificationResult.requiresPAYG, // No PAYG for individuals
          isPayrollTransaction: accountType === 'individual' ? false : classificationResult.isPayrollTransaction, // No payroll for individuals
          payrollType: accountType === 'individual' ? undefined : classificationResult.payrollType,
          capitalImprovementWarning: accountType === 'individual' ? false : classificationResult.capitalImprovementWarning // No capital improvement for individuals
        };
        
        // Track API usage using ACTUAL values from OpenAI API response
        if (usage) {
          const model = usage.model;
          const actualCost = usage.estimatedCost;
          const actualTokens = usage.totalTokens;
          
          totalApiUsage.totalCalls++;
          totalApiUsage.totalCost += actualCost;
          totalApiUsage.totalTokens += actualTokens;
          
          if (!totalApiUsage.byModel[model]) {
            totalApiUsage.byModel[model] = { cost: 0, tokens: 0, calls: 0 };
          }
          totalApiUsage.byModel[model].cost += actualCost;
          totalApiUsage.byModel[model].tokens += actualTokens;
          totalApiUsage.byModel[model].calls++;
          
          console.log(`[ANALYZE] [${index + 1}] ✅ Classification successful (Actual API Usage):`, {
          category: classification.category,
          confidence: classification.confidence,
          department: classification.department,
            isDirectorsLoan: classification.isDirectorsLoan,
            apiUsage: {
              model,
              tokens: actualTokens,
              cost: actualCost.toFixed(6)
            }
          });
        } else {
          // Fallback to estimated values if usage info not available
          const model = useComplexModel ? 'gpt-4o' : 'gpt-4o-mini';
          const estimatedCost = useComplexModel ? 0.003 : 0.0002;
          const estimatedTokens = useComplexModel ? 2000 : 500;
          
          totalApiUsage.totalCalls++;
          totalApiUsage.totalCost += estimatedCost;
          totalApiUsage.totalTokens += estimatedTokens;
          
          if (!totalApiUsage.byModel[model]) {
            totalApiUsage.byModel[model] = { cost: 0, tokens: 0, calls: 0 };
          }
          totalApiUsage.byModel[model].cost += estimatedCost;
          totalApiUsage.byModel[model].tokens += estimatedTokens;
          totalApiUsage.byModel[model].calls++;
          
          console.log(`[ANALYZE] [${index + 1}] ✅ Classification successful (Estimated Usage):`, {
            category: classification.category,
            confidence: classification.confidence,
            department: classification.department,
            isDirectorsLoan: classification.isDirectorsLoan,
            requiresPAYG: classification.requiresPAYG,
            isPayrollTransaction: classification.isPayrollTransaction,
            payrollType: classification.payrollType
          });
        }
        
        // POST-PROCESSING: Force correct classification for known patterns
        // Note: hasCredit and hasDebit are already declared at the start of try block
        
        // 🔧 CRITICAL: Director Loan Detection (STRICT - only exact matches)
        // ⚠️ IMPORTANT: Director Loan should ONLY be detected if:
        // 1. Director name is set in Settings
        // 2. Description contains the EXACT Director name (not just parts like "KIM")
        // 3. It's NOT a known personal name pattern (MRS HEE KIM, etc.)
        let isDirectorTransaction = false
        if (directorName && directorName.trim()) {
          const directorNameUpper = directorName.trim().toUpperCase()
          
          // ⚠️ CRITICAL: Exclude known personal name patterns FIRST
          // These are NOT Director transactions, even if they contain parts of Director name
          const personalNamePatterns = [
            'MRS HEE KIM', 'HEE KIM', 'KIM HEE',
            'MRS ', 'MR ', 'MS ', // Titles indicate other people
          ]
          const isPersonalNamePattern = personalNamePatterns.some(pattern => 
            descriptionUpper.includes(pattern)
          )
          
          if (!isPersonalNamePattern) {
            // Check if description contains the FULL Director name (all parts)
            // Match patterns: "Jinsoo Kim", "JINSOO KIM", "KIM JINSOO", etc.
            const directorNameParts = directorNameUpper.split(/\s+/).filter(part => part.length > 2)
            
            // ⚠️ CRITICAL: ALL name parts must be present (not just one part like "KIM")
            // This prevents "Mrs Hee Kim" from matching if Director is "Jinsoo Kim"
            const allPartsMatch = directorNameParts.length > 0 && 
                                 directorNameParts.every(part => descriptionUpper.includes(part))
            
            // Additional: Check if it's the exact Director name (more strict)
            // Allow variations: "Jinsoo Kim", "JINSOO KIM", "KIM JINSOO", "JINSOO KIM"
            const exactMatch = descriptionUpper.includes(directorNameUpper) ||
                              descriptionUpper.includes(directorNameUpper.split(' ').reverse().join(' '))
            
            if (allPartsMatch || exactMatch) {
              // Additional check: exclude if it's clearly a business customer
              const isBusinessCustomer = descriptionUpper.includes('JASON FAMILY SHINE') ||
                                        descriptionUpper.includes('ASSOCIATED CLEANING') ||
                                        descriptionUpper.includes('ASSOCIATEDCLEANING') ||
                                        descriptionUpper.includes('ASEEOS HOMES') ||
                                        descriptionUpper.includes('AK INNOVATION')
              
              if (!isBusinessCustomer) {
                isDirectorTransaction = true;
                
        if (hasCredit) {
                  // Director Loan - Capital Injection (입금)
                  console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Director Loan (Capital Injection) → LIABILITY_DIRECTORS_LOAN`);
                  classification = {
                    ...classification,
                    category: 'LIABILITY_DIRECTORS_LOAN',
                    department: 'cleaning', // Company
                    confidence: 1.0,
                    reason: `Fixed mapping: Director name "${directorName}" found in credit transaction - Director Loan (Capital Injection)`
                  };
                } else if (hasDebit) {
                  // Director Loan Repayment or Withdrawal (출금)
                  console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Director Loan Repayment/Withdrawal → EXPENSE_DIRECTOR_LOAN_REPAYMENT`);
                  classification = {
                    ...classification,
                    category: 'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
                    department: 'cleaning', // Company
                    confidence: 1.0,
                    reason: `Fixed mapping: Director name "${directorName}" found in debit transaction - Director Loan Repayment/Withdrawal`
                  };
                }
              }
            }
          }
        }
        
        // 🔧 CRITICAL: Refund Fees - Always CREDIT (입금), not DEBIT
        // Refund Fees are refunds, so they should be CREDIT (money coming in)
        if (descriptionUpper.includes('REFUND FEES') || 
            (descriptionUpper.includes('REFUND') && (descriptionUpper.includes('JINSOO KIM') || descriptionUpper.includes('KIM')))) {
          if (hasDebit && !hasCredit) {
            // Refund was incorrectly parsed as DEBIT - convert to CREDIT
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Refund Fees (incorrectly DEBIT) → CREDIT + NON_TAXABLE_TRANSFER`)
            // Convert DEBIT to CREDIT by swapping values
            transaction.credit = transaction.debit
            transaction.debit = null
            classification = {
              ...classification,
              category: 'NON_TAXABLE_TRANSFER',
              department: 'personal',
              confidence: 1.0,
              reason: 'Fixed mapping: Refund Fees is credit (deposit), converted from DEBIT to CREDIT'
            }
          } else if (hasCredit) {
            // Refund is correctly CREDIT
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Refund Fees → NON_TAXABLE_TRANSFER (CREDIT)`)
            classification = {
              ...classification,
              category: 'NON_TAXABLE_TRANSFER',
              department: 'personal',
              confidence: 1.0,
              reason: 'Fixed mapping: Refund Fees is credit (deposit) - NON_TAXABLE_TRANSFER'
            }
          }
        }
        
        // 🔧 CRITICAL: Personal name transfers - Must respect original DEBIT/CREDIT from bank statement
        // Personal names (MRS HEE KIM, KIM J, etc.) are typically deposits (입금) from others
        // ⚠️ CRITICAL: If parsed as DEBIT but should be CREDIT, convert it
        // ⚠️ IMPORTANT: These are NOT Director transactions - they are transfers from other people
        const isPersonalNameTransfer = !isDirectorTransaction && 
                                      !descriptionUpper.includes('REFUND FEES') &&
                                      !(descriptionUpper.includes('REFUND') && (descriptionUpper.includes('JINSOO KIM') || descriptionUpper.includes('KIM'))) && (
                                      descriptionUpper.includes('MRS HEE KIM') ||
                                      descriptionUpper.includes('HEE KIM') ||
                                      descriptionUpper.includes('KIM HEE') ||
                                      descriptionUpper.includes('KIM J') ||
                                      // Exclude Director name if it's set and matches exactly
                                      (!directorName || !descriptionUpper.includes(directorName.trim().toUpperCase())) && 
                                      descriptionUpper.includes('JINSOO KIM'))
        
        // 🔧 CRITICAL: Account transfers (LINKED ACC TRNS) - Usually DEBIT (money going out)
        const isAccountTransfer = !isDirectorTransaction && 
                                 !descriptionUpper.includes('REFUND FEES') &&
                                 !(descriptionUpper.includes('REFUND') && (descriptionUpper.includes('JINSOO KIM') || descriptionUpper.includes('KIM'))) && (
                                 descriptionUpper.includes('LINKED ACC TRNS') ||
                                 descriptionUpper.includes('LINKED ACC') ||
                                 (descriptionUpper.includes('ONLINE') && (descriptionUpper.includes('TRNS') || descriptionUpper.includes('TRANSFER'))))
        
        // Personal name transfers - Check if incorrectly parsed as DEBIT when it should be CREDIT
        if (isPersonalNameTransfer) {
          // ⚠️ CRITICAL: Personal names like "MRS HEE KIM" are typically deposits (입금) from others
          // If the parser incorrectly classified it as DEBIT, convert to CREDIT
          if (hasDebit && !hasCredit) {
            // Incorrectly parsed as DEBIT - convert to CREDIT
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Personal Name Transfer (incorrectly DEBIT) → CREDIT + NON_TAXABLE_TRANSFER`)
            // Convert DEBIT to CREDIT by swapping values
            transaction.credit = transaction.debit
            transaction.debit = null
            classification = {
              ...classification,
              category: 'NON_TAXABLE_TRANSFER',
              department: 'personal',
              confidence: 1.0,
              reason: 'Fixed mapping: Personal name transfer converted from DEBIT to CREDIT (deposit from person)'
            }
          } else if (hasCredit && !hasDebit) {
            // Correctly parsed as CREDIT
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Personal Name Transfer → NON_TAXABLE_TRANSFER (CREDIT)`)
            classification = {
              ...classification,
              category: 'NON_TAXABLE_TRANSFER',
              department: 'personal',
              confidence: 1.0,
              reason: 'Fixed mapping: Personal name transfer (CREDIT - deposit from person)'
            }
          } else {
            // Both or neither - preserve original
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Personal Name Transfer → NON_TAXABLE_TRANSFER (preserving original)`)
            classification = {
              ...classification,
              category: 'NON_TAXABLE_TRANSFER',
              department: 'personal',
              confidence: 1.0,
              reason: 'Fixed mapping: Personal name transfer (preserving original DEBIT/CREDIT)'
            }
          }
        }
        
        // Account transfers - Usually DEBIT, but respect original if CREDIT
        if (isAccountTransfer) {
          // Account transfers are usually DEBIT (money going out), but if the statement shows CREDIT, respect it
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Account Transfer → NON_TAXABLE_TRANSFER (preserving original DEBIT/CREDIT)`)
          classification = {
            ...classification,
            category: 'NON_TAXABLE_TRANSFER',
            department: 'personal',
            confidence: 1.0, // 100% confidence
            reason: 'Fixed mapping: Account transfer (preserving original DEBIT/CREDIT from bank statement)'
          }
        }
        
        // School24 - Personal expense (must be DEBIT, never CREDIT)
        // 🔧 CRITICAL: School24 must ALWAYS be DEBIT, even if parsed as CREDIT
        if (descriptionUpper.includes('SCHOOL24') || descriptionUpper.includes('SCHOOL 24')) {
          if (hasCredit && !hasDebit) {
            // School24 was incorrectly parsed as CREDIT - convert to DEBIT
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: School24 (incorrectly CREDIT) → DEBIT + Personal (Uncategorized)`)
            // Convert CREDIT to DEBIT by swapping values
            transaction.debit = transaction.credit
            transaction.credit = null
            classification = {
              ...classification,
              category: 'UNCATEGORIZED',
              department: 'personal',
              confidence: 1.0,
              reason: 'Fixed mapping: School24 is personal expense (converted from CREDIT to DEBIT)'
            }
          } else if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: School24 → Personal (Uncategorized)`)
            classification = {
              ...classification,
              category: 'UNCATEGORIZED',
              department: 'personal',
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9,
              reason: 'Fixed mapping: School24 is personal expense (Education/Childcare)'
            }
          }
        }
        
        // 🔧 CRITICAL: Refund/Reimbursement Detection (Credit from Expense Vendors)
        // If transaction is in CREDIT column from a typically expense vendor, it's likely a Refund/Reimbursement
        // Column position (Credit) takes absolute priority over vendor name
        const expenseVendorKeywords = [
          'OFFICEWORKS', 'OFFICE WORKS', 'BP', 'COLES', 'WOOLWORTHS', 'BUNNINGS', 
          'TOTAL TOOLS', '7-ELEVEN', 'AMPOL', 'SHELL', 'LIBERTY', 'UNITED',
          'ALDI', 'BIG W', 'KMART', 'TARGET', 'SUPERCHEAP', 'AUTO BARN'
        ]
        const isExpenseVendor = expenseVendorKeywords.some(keyword => descriptionUpper.includes(keyword))
        
        if (hasCredit && !hasDebit && isExpenseVendor && !isPersonalNameTransfer && !isAccountTransfer) {
          // Credit from expense vendor = Refund/Reimbursement
          console.log(`[ANALYZE] [${index + 1}] 🔧 DETECTED: Refund/Reimbursement from expense vendor (Credit column)`)
          classification = {
            ...classification,
            category: 'INCOME_REFUND_REIMBURSEMENT',
            department: 'cleaning', // Business refund
            confidence: 0.9,
            reason: `Credit from expense vendor (${transaction.description.substring(0, 30)}) indicates refund/reimbursement. Column position (Credit) takes priority.`
          }
          // Mark as unusual but valid transaction for UI feedback
          ;(transaction as any).isUnusualCredit = true
        }
        
        // Fixed Revenue Mapping (Critical - Override AI if needed)
        // ⚠️ IMPORTANT: Only apply if NOT already classified as personal transfer or refund
        // ⚠️ IMPORTANT: Only apply for Company/Sole Trader accounts (not Individual)
        if (accountType !== 'individual' && hasCredit && !isPersonalNameTransfer && !isAccountTransfer && classification.category !== 'INCOME_REFUND_REIMBURSEMENT') {
          // Jason Family Shine - All instances must be Cleaning Income
          if (descriptionUpper.includes('JASON FAMILY') || descriptionUpper.includes('JASON FAMILY SHINE')) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Jason Family Shine → Cleaning Income`)
            classification = {
              ...classification,
              category: 'INCOME_SALES_CLEANING',
              department: 'cleaning',
              confidence: 1.0, // 100% confidence
              reason: 'Fixed mapping: Jason Family Shine is confirmed Cleaning Service Income'
            }
          }
          
          // Associated Cleaning - Business Revenue (NOT personal transfer)
          if (descriptionUpper.includes('ASSOCIATED CLEANING') || 
              descriptionUpper.includes('ASSOCIATEDCLEANING') ||
              descriptionUpper.includes('ASSOCIATED CLEAN')) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Associated Cleaning → Cleaning Income`)
            classification = {
              ...classification,
              category: 'INCOME_SALES_CLEANING',
              department: 'cleaning',
              confidence: 1.0, // 100% confidence
              reason: 'Fixed mapping: Associated Cleaning is confirmed Business Revenue'
            }
          }
          
          // Aseeos Homes - Business Revenue
          if (descriptionUpper.includes('ASEEOS HOMES') || descriptionUpper.includes('ASEEOS')) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Aseeos Homes → Cleaning Income`)
            classification = {
              ...classification,
              category: 'INCOME_SALES_CLEANING',
              department: 'cleaning',
              confidence: 1.0,
              reason: 'Fixed mapping: Aseeos Homes is confirmed Cleaning Service Income'
            }
          }
          
          // AK Innovation - Business Revenue
          if (descriptionUpper.includes('AK INNOVATION') || descriptionUpper.includes('AK INNOVATION BUILDING')) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: AK Innovation → Cleaning Income`)
            classification = {
              ...classification,
              category: 'INCOME_SALES_CLEANING',
              department: 'cleaning',
              confidence: 1.0,
              reason: 'Fixed mapping: AK Innovation is confirmed Cleaning Service Income'
            }
          }
          
          // Cash Deposits (DEP, DEPOSIT, NABATM DEP, CARINDALE) - Auto-categorize as Personal Non-Taxable
          // ⚠️ IMPORTANT: Only if NOT already classified as personal transfer
          // ⚠️ CRITICAL: CARINDALE alone with CREDIT indicates ATM cash deposit
          const isCashDepositPattern = descriptionUpper.includes('DEP ') || 
              descriptionUpper.includes('DEPOSIT') ||
              descriptionUpper.includes('NABATM DEP') ||
                                      descriptionUpper.includes('NAB ATM DEP') ||
                                      descriptionUpper.includes('ATM DEPOSIT')
          
          // CARINDALE alone (without business keywords) = ATM cash deposit
          // ⚠️ CRITICAL: CARINDALE with CREDIT is ATM deposit, but if incorrectly parsed as DEBIT, convert it
          const isCarindalePattern = descriptionUpper.includes('CARINDALE') &&
                                    !descriptionUpper.includes('JASON FAMILY') &&
                                    !descriptionUpper.includes('ASSOCIATED') &&
                                    !descriptionUpper.includes('ASEEOS') &&
                                    !descriptionUpper.includes('AK INNOVATION') &&
                                    !descriptionUpper.includes('MALATANG') &&
                                    !descriptionUpper.includes('COMMON ROOM') &&
                                    !descriptionUpper.includes('HURRIKANE') &&
                                    !descriptionUpper.includes('HANARO') &&
                                    !descriptionUpper.includes('MR TOYS') &&
                                    !descriptionUpper.includes('BENTLEYS') &&
                                    !descriptionUpper.includes('METROPOL')
          
          if (isCarindalePattern && !isPersonalNameTransfer && !isAccountTransfer) {
            if (hasCredit && !hasDebit) {
              // Correctly parsed as CREDIT - ATM cash deposit
              console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: CARINDALE ATM Cash Deposit → NON_TAXABLE_CASH_DEPOSIT (CREDIT)`)
              classification = {
                ...classification,
                category: 'NON_TAXABLE_CASH_DEPOSIT',
                department: 'personal',
                confidence: 1.0,
                reason: 'Fixed mapping: CARINDALE ATM cash deposit - Non-taxable personal deposit'
              }
            } else if (hasDebit && !hasCredit) {
              // Incorrectly parsed as DEBIT - convert to CREDIT (ATM deposits are always CREDIT)
              console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: CARINDALE ATM Cash Deposit (incorrectly DEBIT) → CREDIT + NON_TAXABLE_CASH_DEPOSIT`)
              // Convert DEBIT to CREDIT by swapping values
              transaction.credit = transaction.debit
              transaction.debit = null
              classification = {
                ...classification,
                category: 'NON_TAXABLE_CASH_DEPOSIT',
                department: 'personal',
                confidence: 1.0,
                reason: 'Fixed mapping: CARINDALE ATM cash deposit converted from DEBIT to CREDIT - Non-taxable personal deposit'
              }
            }
          } else if (!isPersonalNameTransfer && !isAccountTransfer && isCashDepositPattern) {
            // Standard cash deposit patterns (DEP, DEPOSIT, NABATM DEP, etc.)
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Cash Deposit → Personal Non-Taxable`)
            classification = {
              ...classification,
              category: 'NON_TAXABLE_CASH_DEPOSIT', // New category for non-taxable cash deposits
              department: 'personal', // Set to Personal (not Cleaning)
              confidence: 1.0, // 100% confidence - auto-categorized
              reason: 'Cash deposit auto-categorized as Personal Non-Taxable Income'
            }
          }
        }
        
        // POST-PROCESSING: Additional business expense rules (apply to both Credit and Debit)
        // hasDebit is already declared above
        
        // 🔧 Helper function: Check if description contains personal name
        const hasPersonalName = (desc: string): boolean => {
          const personalNamePatterns = [
            'JINSOO KIM', 'JINSOO', 'KIM J', 'KIM JINSOO',
            'MRS HEE KIM', 'HEE KIM', 'KIM HEE',
            'JASON', 'JASON FAMILY' // Jason is business, not personal
          ]
          // Check for personal names (excluding business names)
          return personalNamePatterns.some(pattern => desc.includes(pattern)) &&
                 !desc.includes('JASON FAMILY SHINE') // Exclude business customer
        }
        
        // Insurance Expenses - Check for personal vs company insurance
        // 🔧 CRITICAL: If insurance transaction contains personal name, it's personal insurance
        const isInsuranceTransaction = descriptionUpper.includes('ALLIANZ') ||
                                      descriptionUpper.includes('NRMA') ||
                                      (descriptionUpper.includes('TAL') && !descriptionUpper.includes('TALENT')) ||
                                      (descriptionUpper.includes('RACQ') && (descriptionUpper.includes('INSURANCE') || descriptionUpper.includes('INS'))) ||
                                      descriptionUpper.includes('INSURANCE') ||
                                      descriptionUpper.includes('LIFE LIMITED')
        
        if (isInsuranceTransaction && hasDebit) {
          const hasPersonalNameInDesc = hasPersonalName(descriptionUpper)
          
          if (hasPersonalNameInDesc) {
            // Personal Insurance - Individual insurance payment
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Insurance with personal name → Personal Insurance (Uncategorized)`)
            classification = {
              ...classification,
              category: 'UNCATEGORIZED', // Personal insurance expense
              department: 'personal', // Personal insurance
              confidence: 1.0, // 100% confidence
              reason: 'Fixed mapping: Insurance transaction with personal name is personal insurance expense'
            }
          } else {
            // Company Insurance - Business insurance expense
            const insuranceCompany = descriptionUpper.includes('ALLIANZ') ? 'Allianz' :
                                    descriptionUpper.includes('NRMA') ? 'NRMA' :
                                    descriptionUpper.includes('TAL') ? 'TAL' :
                                    descriptionUpper.includes('RACQ') ? 'RACQ Insurance' : 'Insurance'
            
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: ${insuranceCompany} → Insurance/Professional Expense (Company)`)
            classification = {
              ...classification,
              category: 'EXPENSE_INSURANCE_PROFESSIONAL',
              department: 'cleaning', // Company (business insurance)
              confidence: 1.0, // 100% confidence
              reason: `Fixed mapping: ${insuranceCompany} is insurance company expense (Company department)`
            }
          }
        }
        
        // MJR Enterprise - Always Cleaning Subcontractor Expense
        if (descriptionUpper.includes('MJR ENTERPRISE') || descriptionUpper.includes('MJRENTERPRISE')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: MJR Enterprise → Cleaning Subcontractor`)
            classification = {
              ...classification,
              category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
              department: 'cleaning',
              confidence: 1.0, // 100% confidence
              reason: 'Fixed mapping: MJR Enterprise is a recurring subcontractor'
            }
          }
        }
        
        // Cursor Software - Business Software Expense (Cleaning Department)
        if (descriptionUpper.includes('CURSOR') && 
            (descriptionUpper.includes('POWERED IDE') || 
             descriptionUpper.includes('AI') ||
             descriptionUpper.includes('SOFTWARE'))) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Cursor Software → Cleaning Business Expense`)
            classification = {
              ...classification,
              category: classification.category || 'EXPENSE_OFFICE_SUPPLIES', // Keep existing category or default to Office Supplies
              department: 'cleaning', // Force Cleaning department (not Personal)
              confidence: 1.0, // 100% confidence
              reason: 'Fixed mapping: Cursor is business software expense for Cleaning department'
            }
          }
        }
        
        // Vehicle Maintenance - Mechanic, Service, Repair, Tyre
        if (hasDebit && (
            descriptionUpper.includes('MECHANIC') ||
            (descriptionUpper.includes('SERVICE') && (descriptionUpper.includes('AUTO') || descriptionUpper.includes('CAR') || descriptionUpper.includes('VEHICLE'))) ||
            (descriptionUpper.includes('REPAIR') && (descriptionUpper.includes('AUTO') || descriptionUpper.includes('CAR') || descriptionUpper.includes('VEHICLE'))) ||
            descriptionUpper.includes('TYRE') || descriptionUpper.includes('TYRES')
          )) {
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Vehicle Maintenance → EXPENSE_MOTOR_VEHICLE`)
          classification = {
            ...classification,
            category: 'EXPENSE_MOTOR_VEHICLE',
            department: 'cleaning', // Company
            confidence: 1.0, // 100% confidence
            reason: 'Fixed mapping: Vehicle Maintenance (Mechanic, Service, Repair, Tyre)'
          }
        }
        
        // 출장 경비 (Travel Expenses) - Business Deductible 세분화
        
        // 1. Travel - Transport (항공사, Uber, Ola, 렌터카, 톨비)
        if (hasDebit && (
            descriptionUpper.includes('QANTAS') ||
            descriptionUpper.includes('JETSTAR') ||
            descriptionUpper.includes('VIRGIN') ||
            descriptionUpper.includes('AIRLINE') ||
            descriptionUpper.includes('AIRLINES') ||
            descriptionUpper.includes('FLIGHT') ||
            descriptionUpper.includes('UBER') ||
            descriptionUpper.includes('OLA') ||
            descriptionUpper.includes('RENTAL') ||
            descriptionUpper.includes('RENT A CAR') ||
            descriptionUpper.includes('CAR RENTAL') ||
            descriptionUpper.includes('TOLL') ||
            descriptionUpper.includes('TAXI') ||
            descriptionUpper.includes('CAB')
          )) {
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Travel - Transport → EXPENSE_TRAVEL_TRANSPORT`)
          classification = {
            ...classification,
            category: 'EXPENSE_TRAVEL_TRANSPORT',
            department: 'cleaning', // Company (Business Deductible)
            confidence: 1.0, // 100% confidence
            reason: 'Fixed mapping: Travel - Transport (Airlines, Uber, Ola, Rental Car, Tolls, Taxi)'
          }
        }
        
        // 2. Travel - Accommodation (Hotel, Motel, Stay, Airbnb)
        else if (hasDebit && (
            descriptionUpper.includes('HOTEL') ||
            descriptionUpper.includes('MOTEL') ||
            descriptionUpper.includes('STAY') ||
            descriptionUpper.includes('ACCOMMODATION') ||
            descriptionUpper.includes('BOOKING') ||
            descriptionUpper.includes('AIRBNB')
          )) {
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Travel - Accommodation → EXPENSE_TRAVEL_ACCOMMODATION`)
          classification = {
            ...classification,
            category: 'EXPENSE_TRAVEL_ACCOMMODATION',
            department: 'cleaning', // Company (Business Deductible)
            confidence: 1.0, // 100% confidence
            reason: 'Fixed mapping: Travel - Accommodation (Hotel, Motel, Stay, Airbnb)'
          }
        }
        
        // 3. Travel - Parking/Tolls (Secure Parking, Linkt)
        else if (hasDebit && (
            descriptionUpper.includes('SECURE PARKING') ||
            descriptionUpper.includes('PARKING') && (descriptionUpper.includes('SECURE') || descriptionUpper.includes('LINKT')) ||
            descriptionUpper.includes('LINKT')
          )) {
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Travel - Parking/Tolls → EXPENSE_TRAVEL_PARKING_TOLLS`)
          classification = {
            ...classification,
            category: 'EXPENSE_TRAVEL_PARKING_TOLLS',
            department: 'cleaning', // Company (Business Deductible)
            confidence: 1.0, // 100% confidence
            reason: 'Fixed mapping: Travel - Parking/Tolls (Secure Parking, Linkt)'
          }
        }
        
        // Meals & Entertainment - Business meals during travel or client meetings
        // Note: This is more context-dependent, so we'll rely on AI classification primarily
        // But we can add a post-processing check for common business meal patterns
        if (hasDebit && classification.category === 'UNCATEGORIZED' && (
            (descriptionUpper.includes('RESTAURANT') && (descriptionUpper.includes('BUSINESS') || descriptionUpper.includes('CLIENT') || descriptionUpper.includes('MEETING'))) ||
            (descriptionUpper.includes('CAFE') && (descriptionUpper.includes('BUSINESS') || descriptionUpper.includes('CLIENT') || descriptionUpper.includes('MEETING'))) ||
            (descriptionUpper.includes('DINING') && (descriptionUpper.includes('BUSINESS') || descriptionUpper.includes('CLIENT') || descriptionUpper.includes('MEETING')))
          )) {
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Business Meal → EXPENSE_MEALS_ENTERTAINMENT`)
          classification = {
            ...classification,
            category: 'EXPENSE_MEALS_ENTERTAINMENT',
            department: 'cleaning', // Company
            confidence: 0.9, // High confidence but not 100% (context-dependent)
            reason: 'Fixed mapping: Business meal/entertainment expense (during travel or client meeting)'
          }
        }
        
        // Repairs & Maintenance - Handyman, Plumbing, Electrical, Repair, Maintenance
        if (hasDebit && (
            descriptionUpper.includes('HANDYMAN') ||
            descriptionUpper.includes('HANDY MAN') ||
            descriptionUpper.includes('PLUMBING') ||
            descriptionUpper.includes('PLUMBER') ||
            descriptionUpper.includes('ELECTRICAL') ||
            descriptionUpper.includes('ELECTRICIAN') ||
            (descriptionUpper.includes('REPAIR') && !descriptionUpper.includes('AUTO') && !descriptionUpper.includes('CAR') && !descriptionUpper.includes('VEHICLE')) ||
            descriptionUpper.includes('MAINTENANCE') ||
            descriptionUpper.includes('FIX') ||
            descriptionUpper.includes('FIXING')
          )) {
          const amount = Math.abs(transaction.debit || 0)
          const isLargeAmount = amount >= 5000
          const hasRemodelingKeywords = descriptionUpper.includes('RENOVATION') ||
                                        descriptionUpper.includes('REMODEL') ||
                                        descriptionUpper.includes('RENOVATE')
          
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Repairs & Maintenance → EXPENSE_REPAIRS_MAINTENANCE`)
          classification = {
            ...classification,
            category: 'EXPENSE_REPAIRS_MAINTENANCE',
            department: 'cleaning', // Company
            confidence: 1.0, // 100% confidence
            reason: `Fixed mapping: Repairs & Maintenance expense${isLargeAmount || hasRemodelingKeywords ? ' (May be Capital Improvement - check if amount >= $5,000 or contains remodeling keywords)' : ''}`
          }
          
          // Add capital improvement warning flag if applicable
          if (isLargeAmount || hasRemodelingKeywords) {
            classification.capitalImprovementWarning = true
          }
        }
        
        // Freight & Shipping - Australia Post, Sendle
        if (hasDebit && (
            descriptionUpper.includes('AUSTRALIA POST') ||
            descriptionUpper.includes('AUS POST') ||
            descriptionUpper.includes('AUSPOST') ||
            descriptionUpper.includes('SENDLE')
          )) {
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Freight & Shipping → EXPENSE_FREIGHT_SHIPPING (with GST enabled)`)
          classification = {
            ...classification,
            category: 'EXPENSE_FREIGHT_SHIPPING',
            department: 'cleaning', // Company
            confidence: 1.0, // 100% confidence
            reason: 'Fixed mapping: Freight & Shipping expense (Australia Post, Sendle) with GST enabled'
          }
        }
        
        // Office Equipment & Assets - Computers, furniture, equipment purchases
        if (hasDebit && (
            descriptionUpper.includes('COMPUTER') ||
            descriptionUpper.includes('LAPTOP') ||
            descriptionUpper.includes('PRINTER') ||
            descriptionUpper.includes('FURNITURE') ||
            descriptionUpper.includes('DESK') ||
            descriptionUpper.includes('CHAIR') ||
            (descriptionUpper.includes('EQUIPMENT') && !descriptionUpper.includes('CLEANING')) ||
            descriptionUpper.includes('ASSET')
          )) {
          console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Office Equipment & Assets → EXPENSE_OFFICE_EQUIPMENT`)
          classification = {
            ...classification,
            category: 'EXPENSE_OFFICE_EQUIPMENT',
            department: 'cleaning', // Company
            confidence: 1.0, // 100% confidence
            reason: 'Fixed mapping: Office Equipment & Assets expense'
          }
        }
        
        // Brisbane City Council (BCC Rates) - Personal expense (Uncategorized)
        if (descriptionUpper.includes('BRISBANE CITY COUNCIL') || 
            descriptionUpper.includes('BCC RATES') ||
            descriptionUpper.includes('BCC')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: BCC Rates → Personal (Uncategorized)`)
              classification = {
                ...classification,
              category: 'UNCATEGORIZED', // Uncategorized
              department: 'personal', // Personal expense
                confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: BCC Rates is personal expense (Uncategorized)'
            }
          }
        }
        
        // School24 - Personal expense (Education/Childcare)
        if (descriptionUpper.includes('SCHOOL24') || descriptionUpper.includes('SCHOOL 24')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: School24 → Personal (Uncategorized)`)
            classification = {
              ...classification,
              category: 'UNCATEGORIZED', // Uncategorized
              department: 'personal', // Personal expense (Education/Childcare)
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: School24 is personal expense (Education/Childcare)'
            }
          }
        }
        
        // Hurrikane Pty Ltd - Personal expense (Uncategorized)
        if (descriptionUpper.includes('HURRIKANE') || descriptionUpper.includes('HURRIKANE PTY')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Hurrikane Pty Ltd → Personal (Uncategorized)`)
            classification = {
              ...classification,
              category: 'UNCATEGORIZED', // Uncategorized
              department: 'personal', // Personal expense
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: Hurrikane Pty Ltd is personal expense (Uncategorized)'
            }
          }
        }
        
        // Hanaro Trading Pty - Personal expense (Uncategorized)
        if (descriptionUpper.includes('HANARO TRADING') || descriptionUpper.includes('HANARO')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Hanaro Trading → Personal (Uncategorized)`)
            classification = {
              ...classification,
              category: 'UNCATEGORIZED', // Uncategorized
              department: 'personal', // Personal expense
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: Hanaro Trading is personal expense (Uncategorized)'
            }
          }
        }
        
        // Mr Toys Toyworld - Personal expense (Uncategorized)
        if (descriptionUpper.includes('MR TOYS') || descriptionUpper.includes('TOYWORLD') || descriptionUpper.includes('TOY WORLD')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Mr Toys Toyworld → Personal (Uncategorized)`)
            classification = {
              ...classification,
              category: 'UNCATEGORIZED', // Uncategorized
              department: 'personal', // Personal expense
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: Mr Toys Toyworld is personal expense (Uncategorized)'
            }
          }
        }
        
        // Bentleys Camerahouse - Personal expense (Uncategorized)
        if (descriptionUpper.includes('BENTLEYS') || descriptionUpper.includes('BENTLEYS CAMERA')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Bentleys Camerahouse → Personal (Uncategorized)`)
            classification = {
              ...classification,
              category: 'UNCATEGORIZED', // Uncategorized
              department: 'personal', // Personal expense
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: Bentleys Camerahouse is personal expense (Uncategorized)'
            }
          }
        }
        
        // Metropol Pharmacy - Personal expense (Uncategorized)
        if (descriptionUpper.includes('METROPOL') || descriptionUpper.includes('METROPOL PHARMACY')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Metropol Pharmacy → Personal (Uncategorized)`)
            classification = {
              ...classification,
              category: 'UNCATEGORIZED', // Uncategorized
              department: 'personal', // Personal expense
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: Metropol Pharmacy is personal expense (Uncategorized)'
            }
          }
        }
        
        // TPG Internet - Company Internet Expense
        if (descriptionUpper.includes('TPG INTERNET') || descriptionUpper.includes('TPG TELECOM') || descriptionUpper.includes('TPG')) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: TPG Internet → Company Internet Expense`)
            classification = {
              ...classification,
              category: 'EXPENSE_UTILITIES_PHONE', // Internet expense
              department: 'cleaning', // Company (business internet)
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: TPG Internet is company internet expense'
            }
          }
        }
        
        // Medaldimobile / Aldi Mobile - Business Phone Expense (Company)
        if (descriptionUpper.includes('MEDALDIMOBILE') || 
            descriptionUpper.includes('MED*ALDI') ||
            descriptionUpper.includes('ALDI MOBILE') ||
            (descriptionUpper.includes('ALDI') && descriptionUpper.includes('MOBILE'))) {
          if (hasDebit) {
            console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Medaldimobile → Company Phone Expense`)
            classification = {
              ...classification,
              category: 'EXPENSE_UTILITIES_PHONE', // Phone expense
              department: 'cleaning', // Company (business phone)
              confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
              reason: 'Fixed mapping: Medaldimobile is company phone expense'
            }
          }
        }
        
        // Alinta Energy - Business Utilities (if related to business site)
        if (descriptionUpper.includes('ALINTA ENERGY') || descriptionUpper.includes('ALINTA')) {
          if (hasDebit) {
            // Only force to Cleaning if not already marked as Personal (user may have manually set it)
            if (classification.department !== 'personal') {
              console.log(`[ANALYZE] [${index + 1}] 🔧 FORCING: Alinta Energy → Cleaning Utilities`)
              classification = {
                ...classification,
                category: 'EXPENSE_UTILITIES_PHONE', // Business utilities
                department: 'cleaning', // Business site related
                confidence: classification.confidence === 1.0 ? 1.0 : 0.9, // High confidence
                reason: 'Fixed mapping: Alinta Energy for business site'
              }
            }
          }
        }
        
        // 🔧 No ABN Withholding 감지 (PAYG 등록 여부와 무관)
        // ABN이 없는 계약자에게 $75 이상 지급 시 47% 원천징수 필요
        // ⚠️ IMPORTANT: Only for Company/Sole Trader accounts (not Individual)
        let noABNWarning: { shouldWarn: boolean; warningMessage: string; withholdingAmount?: number } | undefined;
        
        // 서브컨트랙터 지출인 경우 ABN 확인 (Company/Sole Trader only)
        if (accountType !== 'individual' && hasDebit && 
            (classification.category === 'EXPENSE_CLEANING_SUBCONTRACTOR' ||
             descriptionUpper.includes('SUBCONTRACTOR') ||
             descriptionUpper.includes('CONTRACTOR'))) {
          
          const amount = Math.abs(transaction.debit || 0);
          
          // ABN 확인 로직: 설명에 ABN이 명시되어 있지 않으면 경고
          // 실제로는 ABN 데이터베이스나 별도 입력이 필요하지만, 여기서는 기본 감지만 수행
          const hasABNInDescription = /ABN\s*\d{11}/i.test(transaction.description) || 
                        /\d{2}\s+\d{3}\s+\d{3}\s+\d{3}/.test(transaction.description); // ABN 형식: XX XXX XXX XXX
          
          // 🔧 NEW: HR & Payroll에 등록된 Contractor 확인
          let hasRegisteredABN = false;
          try {
            const employees = await loadAllEmployees();
            // 거래 설명에서 Contractor 회사명 또는 이름 찾기
            for (const employee of employees) {
              if (employee.type === 'contractor') {
                // 회사명 매칭: 대소문자 무시, 공백 정규화
                let companyNameMatch = false;
                if (employee.companyName) {
                  const normalizedCompanyName = employee.companyName.toUpperCase().trim().replace(/\s+/g, ' ');
                  const normalizedDescription = descriptionUpper.replace(/\s+/g, ' ');
                  companyNameMatch = normalizedDescription.includes(normalizedCompanyName);
                }
                
                // 직원 이름 매칭: 대소문자 무시
                let employeeNameMatch = false;
                if (employee.name) {
                  const normalizedEmployeeName = employee.name.toUpperCase().trim();
                  employeeNameMatch = descriptionUpper.includes(normalizedEmployeeName);
                }
                
                // 회사명 또는 직원 이름이 매칭되고 ABN이 있으면 경고 제외
                if ((companyNameMatch || employeeNameMatch) && employee.abn && employee.abn.trim()) {
                  hasRegisteredABN = true;
                  console.log(`[ANALYZE] [${index + 1}] ✅ Found registered Contractor with ABN:`, {
                    companyName: employee.companyName,
                    employeeName: employee.name,
                    abn: employee.abn,
                    description: transaction.description.substring(0, 50),
                    matchType: companyNameMatch ? 'companyName' : 'employeeName'
                  });
                  break;
                }
              }
            }
          } catch (error) {
            console.error(`[ANALYZE] [${index + 1}] Failed to check registered contractors:`, error);
            // 에러가 발생해도 계속 진행 (경고는 표시)
          }
          
          // ABN이 없고 $75 이상인 경우에만 경고 (등록된 Contractor의 ABN이 있으면 제외)
          if (!hasABNInDescription && !hasRegisteredABN && amount >= 75) {
            noABNWarning = paygEngine.checkNoABNWarning(amount, false, 'contractor');
            if (noABNWarning.shouldWarn) {
              console.log(`[ANALYZE] [${index + 1}] ⚠️ No ABN Withholding warning:`, {
                description: transaction.description.substring(0, 50),
                amount,
                withholdingAmount: noABNWarning.withholdingAmount
              });
            }
          } else if (hasRegisteredABN) {
            console.log(`[ANALYZE] [${index + 1}] ✅ No ABN warning excluded - Contractor has registered ABN`);
          }
        }
        
        // 🔧 INTEGRATED: GST and FBT info now come from the single classification API call
        // No separate API calls needed - all info is in classificationResult
        // ⚠️ IMPORTANT: Individual User mode - GST and FBT are not applicable
        console.log(`[ANALYZE] [${index + 1}] Extracting GST and FBT info from integrated response...`);
        
        let gstInfo;
        let fbtInfo;
        
        // Individual User mode: GST and FBT are not applicable
        if (accountType === 'individual') {
          const amount = Math.abs(transaction.debit || transaction.credit || 0);
          gstInfo = {
            isGSTIncluded: false,
            gstType: 'FREE' as const,
            gstAmount: 0,
            netAmount: amount,
            confidence: 1.0,
            reasoning: 'Individual User: GST is not applicable for personal transactions'
          };
          fbtInfo = {
            isFBTRelevant: false,
            fbtRisk: 'low' as const,
            fbtCategory: undefined,
            isFBTReportable: false,
            reasoning: 'Individual User: FBT is not applicable for personal transactions',
            confidence: 1.0
          };
          console.log(`[ANALYZE] [${index + 1}] ✅ Individual User mode: GST and FBT set to not applicable`);
        } else {
          // Company/Sole Trader mode: Use normal GST and FBT detection
          // Extract GST and FBT info from classification result (if available from integrated call)
          const integratedGstInfo = (classificationResult as any).gstInfo;
          const integratedFbtInfo = (classificationResult as any).fbtInfo;
          
          // 🔧 Force GST for Freight & Shipping (Australia Post, Sendle)
          const isFreightShipping = classification.category === 'EXPENSE_FREIGHT_SHIPPING';
          
          if (isFreightShipping) {
            // Force GST included for Freight & Shipping
            const amount = Math.abs(transaction.debit || transaction.credit || 0);
            const gstAmount = Math.round((amount / 11) * 100) / 100;
            const netAmount = Math.round((amount - gstAmount) * 100) / 100;
            gstInfo = {
              isGSTIncluded: true,
              gstType: 'INCLUDED' as const,
              gstAmount: gstAmount,
              netAmount: netAmount,
              confidence: 1.0,
              reasoning: 'Fixed mapping: Freight & Shipping expenses (Australia Post, Sendle) always include GST'
            };
            console.log(`[ANALYZE] [${index + 1}] ✅ GST forced for Freight & Shipping:`, {
              isGSTIncluded: gstInfo.isGSTIncluded,
              gstType: gstInfo.gstType,
              gstAmount: gstInfo.gstAmount,
              confidence: gstInfo.confidence
            });
          } else if (integratedGstInfo) {
            // Use GST info from integrated API call
            gstInfo = {
              isGSTIncluded: integratedGstInfo.isGSTIncluded,
              gstType: integratedGstInfo.gstType as 'INCLUDED' | 'EXCLUDED' | 'FREE',
              gstAmount: integratedGstInfo.gstAmount || 0,
              netAmount: integratedGstInfo.netAmount || Math.abs(transaction.debit || transaction.credit || 0),
              confidence: integratedGstInfo.confidence || 0.8,
              reasoning: integratedGstInfo.reasoning || 'AI GST detection (integrated)'
            };
            console.log(`[ANALYZE] [${index + 1}] ✅ GST info from integrated call:`, {
              isGSTIncluded: gstInfo.isGSTIncluded,
              gstType: gstInfo.gstType,
              gstAmount: gstInfo.gstAmount,
              confidence: gstInfo.confidence
            });
          } else {
            // Fallback: Default to GST included (no separate API call)
            const amount = Math.abs(transaction.debit || transaction.credit || 0);
            const defaultGSTAmount = Math.round((amount / 11) * 100) / 100;
            const defaultNetAmount = Math.round((amount - defaultGSTAmount) * 100) / 100;
            gstInfo = {
              isGSTIncluded: true,
              gstType: 'INCLUDED' as const,
              gstAmount: defaultGSTAmount,
              netAmount: defaultNetAmount,
              confidence: 0.5,
              reasoning: 'Default assumption (GST info not available from integrated call)'
            };
            console.log(`[ANALYZE] [${index + 1}] ⚠️ Using default GST (no separate API call):`, {
              isGSTIncluded: gstInfo.isGSTIncluded,
              gstType: gstInfo.gstType,
              gstAmount: gstInfo.gstAmount
            });
          }
          
          // Extract FBT info from integrated call
          if (integratedFbtInfo) {
            fbtInfo = {
              isFBTRelevant: integratedFbtInfo.isFBTRelevant || false,
              fbtCategory: integratedFbtInfo.fbtCategory,
              fbtRisk: integratedFbtInfo.fbtRisk || 'low',
              isFBTReportable: integratedFbtInfo.isFBTReportable || false,
              fbtAmount: integratedFbtInfo.fbtAmount || 0,
              reasoning: integratedFbtInfo.reasoning || 'AI FBT detection (integrated)',
              confidence: integratedFbtInfo.confidence || 0.7
            };
            console.log(`[ANALYZE] [${index + 1}] ✅ FBT info from integrated call:`, fbtInfo);
          } else {
            // Fallback: Default to no FBT risk (no separate API call)
            fbtInfo = {
              isFBTRelevant: false,
              fbtRisk: 'low' as const,
              fbtCategory: undefined,
              isFBTReportable: false,
              reasoning: 'Default assumption (FBT info not available from integrated call)',
              confidence: 0.5
            };
            console.log(`[ANALYZE] [${index + 1}] ⚠️ Using default FBT (no separate API call):`, {
              isFBTRelevant: fbtInfo.isFBTRelevant,
              fbtRisk: fbtInfo.fbtRisk
            });
          }
        }

        // CRITICAL: Always push the transaction to classifiedTransactions array
        // This must happen regardless of any errors in GST or FBT detection
        // IMPORTANT: Push happens INSIDE try block, but AFTER all processing
        console.log(`[ANALYZE] [${index + 1}] 📦 Pushing transaction to classifiedTransactions array...`);
        const classifiedTransaction = {
          ...transaction,
          id: transaction.reference || `tx_${Date.now()}_${index}`,
          category: classification.category,
          confidence: classification.confidence,
          department: classification.department,
          isDirectorsLoan: classification.isDirectorsLoan,
          isPreTradingExpense: classification.isPreTradingExpense,
          requiresPAYG: classification.requiresPAYG,
          isPayrollTransaction: classification.isPayrollTransaction,
          payrollType: classification.payrollType,
          noABNWarning: noABNWarning,
          gstInfo: gstInfo,
          isUnusualCredit: (transaction as any).isUnusualCredit || false,
          capitalImprovementWarning: classification.capitalImprovementWarning,
          fbtInfo: fbtInfo,
        } as any;
        
        // Push to array - this MUST happen
        classifiedTransactions.push(classifiedTransaction);
        console.log(`[ANALYZE] [${index + 1}] ✅ Transaction successfully added to classifiedTransactions (current count: ${classifiedTransactions.length})`);
      } catch (error: any) {
        // 🔧 CRITICAL: Increment failure counter - NO RETRIES
        consecutiveFailures++
        console.error(`[ANALYZE] [${index + 1}] ❌ Failed to classify transaction (Failure #${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`)
        console.error(`[ANALYZE] Transaction details:`, {
          date: transaction.date,
          description: transaction.description,
          debit: transaction.debit,
          credit: transaction.credit
        })
        console.error(`[ANALYZE] Classification error:`, {
          message: error?.message,
          status: error?.status,
          statusText: error?.statusText,
          code: error?.code,
          type: error?.constructor?.name,
          stack: error?.stack
        })
        
        // 🔧 CRITICAL: Stop immediately on authentication or rate limit errors - NO RETRIES
        if (error?.status === 401 || error?.status === 403) {
          console.error('[ANALYZE] 🚨 CRITICAL: Invalid API key detected (401/403) - Stopping all processing')
          return NextResponse.json(
            { 
              error: 'INVALID_API_KEY',
              details: 'Invalid OpenAI API key. Please check your API key in Settings.',
              type: 'AuthenticationError',
              processedCount: classifiedTransactions.length,
              failedCount: consecutiveFailures
            },
            { status: 401 }
          )
        }
        
        if (error?.status === 429) {
          console.error('[ANALYZE] 🚨 CRITICAL: Rate limit exceeded (429) - Stopping all processing')
          return NextResponse.json(
            { 
              error: 'RATE_LIMIT_EXCEEDED',
              details: 'OpenAI API rate limit exceeded. Please wait a moment and try again.',
              type: 'RateLimitError',
              processedCount: classifiedTransactions.length,
              failedCount: consecutiveFailures
            },
            { status: 429 }
          )
        }
        
        // 🔧 CRITICAL: Stop if too many consecutive failures
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(`[ANALYZE] 🚨 CRITICAL: Too many consecutive failures (${consecutiveFailures}). Stopping processing.`)
          break // Exit the loop
        }
        
        // Continue with unclassified transaction (only if under failure limit)
        console.warn(`[ANALYZE] [${index + 1}] Continuing with unclassified transaction (will stop after ${MAX_CONSECUTIVE_FAILURES} failures)`)
        
        // Default values for unclassified transaction
        const defaultGstInfo = {
          isGSTIncluded: true,
          gstType: 'INCLUDED' as const,
          gstAmount: 0,
          netAmount: Math.abs(transaction.debit || transaction.credit || 0),
          confidence: 0.5,
          reasoning: 'Default assumption (classification failed)'
        };
        
        const defaultFbtInfo = {
          isFBTRelevant: false,
          fbtRisk: 'low' as const,
          fbtCategory: undefined,
          isFBTReportable: false,
          reasoning: 'Classification failed, defaulting to no FBT risk',
          confidence: 0.5
        };
        
        classifiedTransactions.push({
          ...transaction,
          id: transaction.reference || `tx_${Date.now()}_${index}`,
          category: 'UNCATEGORIZED',
          confidence: 0,
          department: 'unknown',
          isDirectorsLoan: false,
          isPreTradingExpense: false,
          requiresPAYG: false,
          isPayrollTransaction: false,
          noABNWarning: undefined,
          gstInfo: defaultGstInfo,
          isUnusualCredit: false,
          capitalImprovementWarning: false,
          fbtInfo: defaultFbtInfo,
        });
      }
    }
    
    // CRITICAL: Log array status after loop completes
    console.log(`[ANALYZE] 🔍 Loop completed. classifiedTransactions.length: ${classifiedTransactions.length}, expected: ${parsedStatement.transactions.length}`);
    console.log(`[ANALYZE] 🔍 Processed unique transactions: ${processedTransactionIds.size}`);
    console.log(`[ANALYZE] 🔍 Consecutive failures: ${consecutiveFailures}`);
    
    // 🔧 CRITICAL: Warn if we stopped early due to failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`[ANALYZE] 🚨 CRITICAL: Processing stopped early due to ${consecutiveFailures} consecutive failures`);
      console.error(`[ANALYZE] 🚨 Only ${classifiedTransactions.length} out of ${parsedStatement.transactions.length} transactions were processed`);
    }
    
    console.log('[ANALYZE] Step 6: Preparing response...');
    const elapsedTime = Date.now() - startTime;
    console.log(`[ANALYZE] Analysis completed in ${elapsedTime}ms`);

    // Validate classifiedTransactions before returning
    console.log('[ANALYZE] 📊 Final transaction count:', {
      totalParsed: parsedStatement.transactions.length,
      totalClassified: classifiedTransactions.length,
      classifiedTransactionsType: typeof classifiedTransactions,
      isArray: Array.isArray(classifiedTransactions)
    });
    
    if (!classifiedTransactions || !Array.isArray(classifiedTransactions)) {
      console.error('[ANALYZE] ❌ classifiedTransactions is invalid:', {
        type: typeof classifiedTransactions,
        value: classifiedTransactions
      });
      throw new Error('Failed to classify transactions. classifiedTransactions is not a valid array.');
    }
    
    if (classifiedTransactions.length === 0 && parsedStatement.transactions.length > 0) {
      console.error('[ANALYZE] ❌ No transactions were classified despite having parsed transactions:', {
        parsedCount: parsedStatement.transactions.length,
        classifiedCount: classifiedTransactions.length
      });
      throw new Error(`Failed to classify ${parsedStatement.transactions.length} transactions. Please check the classification logic.`);
    }

    // Step 2.5: Auto-match payroll transactions with employee bank accounts
    console.log('[ANALYZE] 🔍 Starting payroll transaction auto-matching...');
    try {
      const employees = await loadAllEmployees();
      console.log(`[ANALYZE] Loaded ${employees.length} employees/contractors for matching`);
      
      let matchedCount = 0;
      for (let i = 0; i < classifiedTransactions.length; i++) {
        const transaction = classifiedTransactions[i];
        
        // Debit 거래만 확인 (급여 지급은 Debit)
        if (transaction.debit && transaction.debit > 0) {
          const match = await matchPayrollTransaction(transaction, employees);
          
          if (match) {
            // 매칭된 거래에 태그 추가
            (classifiedTransactions[i] as any).isPayrollTransaction = true;
            (classifiedTransactions[i] as any).payrollType = match.employee.type;
            (classifiedTransactions[i] as any).matchedEmployee = {
              id: match.employee.id,
              name: match.employee.name,
              employeeId: match.employee.employeeId,
              type: match.employee.type
            };
            (classifiedTransactions[i] as any).matchConfidence = match.matchConfidence;
            (classifiedTransactions[i] as any).matchReason = match.matchReason;
            
            matchedCount++;
            console.log(`[ANALYZE] ✅ Matched transaction ${i + 1} to ${match.employee.name} (${match.employee.employeeId}) - Confidence: ${match.matchConfidence}`);
          }
        }
      }
      
      console.log(`[ANALYZE] ✅ Payroll matching completed: ${matchedCount} transactions matched out of ${classifiedTransactions.length}`);
    } catch (error: any) {
      console.error('[ANALYZE] ⚠️ Failed to auto-match payroll transactions (non-critical):', error);
      // 매칭 실패는 치명적이지 않으므로 계속 진행
    }

    // Validate parsedStatement before proceeding
    if (!parsedStatement) {
      console.error('[ANALYZE] ❌ parsedStatement is null or undefined');
      throw new Error('Failed to parse statement. parsedStatement is null or undefined.');
    }
    
    if (!parsedStatement.transactions || !Array.isArray(parsedStatement.transactions)) {
      console.error('[ANALYZE] ❌ parsedStatement.transactions is invalid:', {
        hasTransactions: !!parsedStatement.transactions,
        type: typeof parsedStatement.transactions,
        isArray: Array.isArray(parsedStatement.transactions)
      });
      throw new Error('Failed to parse statement. transactions array is invalid.');
    }

    // Step 3: Return results
    // Handle both ParsedStatement (PDF) and ParsedCSVStatement (CSV) types
    const statementPeriod = 'statementPeriod' in parsedStatement 
      ? parsedStatement.statementPeriod 
      : 'period' in parsedStatement 
        ? parsedStatement.period 
        : { startDate: '', endDate: '' }
    
    // Log total API usage for this analysis
    console.log('[ANALYZE] Total API usage tracked:', {
      totalCalls: totalApiUsage.totalCalls,
      totalCost: totalApiUsage.totalCost.toFixed(4),
      totalTokens: totalApiUsage.totalTokens,
      byModel: totalApiUsage.byModel
    })
    
    // Generate individual usage logs for client-side IndexedDB logging
    // Use ACTUAL API usage data if available, otherwise use aggregated stats
    const usageLogs: Array<{
      model: string
      promptTokens: number
      completionTokens: number
      totalTokens: number
      estimatedCost: number
    }> = []
    
    // If we have actual usage data per transaction, use it
    // Otherwise, distribute aggregated stats across calls
    for (const [model, stats] of Object.entries(totalApiUsage.byModel)) {
      if (stats.calls > 0) {
        const avgTokens = Math.floor(stats.tokens / stats.calls)
        const avgCost = stats.cost / stats.calls
        const avgPromptTokens = Math.floor(avgTokens * 0.8) // Estimate: 80% input
        const avgCompletionTokens = Math.floor(avgTokens * 0.2) // Estimate: 20% output
        
        console.log(`[ANALYZE] 📊 Generating usage logs for model ${model}:`, {
          calls: stats.calls,
          totalTokens: stats.tokens,
          totalCost: stats.cost.toFixed(6),
          avgTokens,
          avgCost: avgCost.toFixed(6),
          avgPromptTokens,
          avgCompletionTokens
        });
        
        for (let i = 0; i < stats.calls; i++) {
          usageLogs.push({
            model,
            promptTokens: avgPromptTokens,
            completionTokens: avgCompletionTokens,
            totalTokens: avgTokens,
            estimatedCost: avgCost
          });
        }
      }
    }
    
    console.log('[ANALYZE] 📊 Generated usage logs for client:', {
      totalLogs: usageLogs.length,
      totalCost: usageLogs.reduce((sum, log) => sum + log.estimatedCost, 0).toFixed(6),
      byModel: Object.entries(totalApiUsage.byModel).map(([model, stats]) => ({
        model,
        calls: stats.calls,
        totalCost: stats.cost.toFixed(6),
        totalTokens: stats.tokens
      }))
    });
    
    // Final validation before sending response
    console.log('[ANALYZE] 🔍 Final validation before response:', {
      hasParsedStatement: !!parsedStatement,
      parsedStatementType: typeof parsedStatement,
      hasTransactions: !!classifiedTransactions,
      transactionsLength: classifiedTransactions?.length || 0,
      transactionsType: typeof classifiedTransactions,
      isTransactionsArray: Array.isArray(classifiedTransactions),
      hasTotalApiUsage: !!totalApiUsage,
      totalApiUsageCalls: totalApiUsage?.totalCalls || 0,
      hasUsageLogs: !!usageLogs,
      usageLogsLength: usageLogs?.length || 0
    });
    
    // Ensure all required data is present
    if (!classifiedTransactions || !Array.isArray(classifiedTransactions)) {
      console.error('[ANALYZE] ❌ CRITICAL: classifiedTransactions is invalid before response');
      throw new Error('classifiedTransactions is not a valid array. Cannot send response.');
    }
    
    if (!totalApiUsage || typeof totalApiUsage !== 'object') {
      console.error('[ANALYZE] ❌ CRITICAL: totalApiUsage is invalid before response');
      throw new Error('totalApiUsage is not a valid object. Cannot send response.');
    }
    
    // Ensure usageLogs is a valid array
    const finalUsageLogs = Array.isArray(usageLogs) ? usageLogs : [];
    if (!Array.isArray(usageLogs)) {
      console.warn('[ANALYZE] ⚠️ usageLogs is invalid, using empty array');
    }
    
    const responseData = {
      success: true,
      statement: {
        bankName: parsedStatement.bankName || 'Unknown',
        accountNumber: parsedStatement.accountNumber || '',
        period: statementPeriod,
        openingBalance: parsedStatement.openingBalance || 0,
        closingBalance: parsedStatement.closingBalance || 0,
      },
      transactions: classifiedTransactions,
      summary: {
        totalTransactions: classifiedTransactions.length,
        classifiedCount: classifiedTransactions.filter(tx => tx.category !== 'UNCATEGORIZED').length,
        directorsLoanCount: classifiedTransactions.filter(tx => tx.isDirectorsLoan).length,
        preTradingExpenseCount: classifiedTransactions.filter(tx => tx.isPreTradingExpense).length,
      },
      apiUsage: {
        totalCalls: totalApiUsage.totalCalls || 0,
        totalCost: totalApiUsage.totalCost || 0,
        totalTokens: totalApiUsage.totalTokens || 0,
        byModel: totalApiUsage.byModel || {},
        usageLogs: finalUsageLogs
      },
    };
    
    // Final check: Ensure responseData has all required fields
    console.log('[ANALYZE] ✅ Final response data structure:', {
      success: responseData.success,
      hasStatement: !!responseData.statement,
      hasTransactions: !!responseData.transactions,
      transactionCount: responseData.transactions.length,
      hasSummary: !!responseData.summary,
      hasApiUsage: !!responseData.apiUsage,
      apiUsageTotalCalls: responseData.apiUsage.totalCalls,
      responseDataKeys: Object.keys(responseData)
    });
    
    // Validate responseData structure one more time
    if (!responseData.transactions || !Array.isArray(responseData.transactions)) {
      console.error('[ANALYZE] ❌ CRITICAL: responseData.transactions is invalid');
      throw new Error('Response data structure is invalid. transactions field is missing or invalid.');
    }
    
    console.log('[ANALYZE] ✅ Sending response with data:', {
      success: responseData.success,
      transactionCount: responseData.transactions.length,
      summary: responseData.summary,
      hasApiUsage: !!responseData.apiUsage,
      apiUsageTotalCalls: responseData.apiUsage.totalCalls
    });
    
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[ANALYZE] ========================================')
    console.error('[ANALYZE] ❌ CRITICAL ERROR OCCURRED')
    console.error('[ANALYZE] ========================================')
    console.error('[ANALYZE] Error Type:', error?.constructor?.name || 'Unknown')
    console.error('[ANALYZE] Error Message:', error?.message || 'No message')
    console.error('[ANALYZE] Error Stack:', error?.stack || 'No stack trace')
    console.error('[ANALYZE] Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('[ANALYZE] ========================================')
    
    // Return detailed error information with proper structure
    const errorResponse = {
      success: false,
        error: error?.message || 'Analysis failed',
      details: error?.details || error?.message || 'Unknown error occurred',
        type: error?.constructor?.name || 'UnknownError',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString(),
      // Include empty arrays to match expected structure
      transactions: [],
      statement: null,
      summary: null,
      apiUsage: {
        totalCalls: 0,
        totalCost: 0,
        totalTokens: 0,
        byModel: {},
        usageLogs: []
      }
    };
    
    console.error('[ANALYZE] Sending error response:', {
      status: 500,
      hasError: !!errorResponse.error,
      hasDetails: !!errorResponse.details,
      errorType: errorResponse.type
    });
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

