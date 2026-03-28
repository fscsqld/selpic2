/**
 * OpenAI 기반 AI 분류기 (BYOK - Bring Your Own Key)
 * 
 * 사용자가 자신의 OpenAI API 키를 제공하여 사용
 */

import 'openai/shims/node'
import { AIClassifier, ClassificationResult, ATOCategory } from './types'
import { BankTransaction } from '../pdf-parser/types'
import OpenAI from 'openai'

export class OpenAIClassifier implements AIClassifier {
  private openai: OpenAI | null = null
  private apiKey: string | null = null

  /**
   * API 키 설정
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    this.openai = new OpenAI({ apiKey })
  }

  /**
   * API 키가 설정되었는지 확인
   */
  isConfigured(): boolean {
    return this.openai !== null && this.apiKey !== null
  }

  /**
   * 거래 내역 분류
   */
  async classify(
    transaction: BankTransaction,
    context?: string[],
    useComplexModel: boolean = false
  ): Promise<ClassificationResult & { usage?: { model: string; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCost: number } }> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.')
    }

    const prompt = this.buildClassificationPrompt(transaction, context)
    const result = await this.callOpenAI(prompt, useComplexModel)

    const classification = this.parseResponse(result.content)
    
    // Return classification result with usage info for cost tracking
    return {
      ...classification,
      usage: result.usage
    }
  }

  /**
   * 분류 프롬프트 생성 (비즈니스 컨텍스트 포함)
   */
  private buildClassificationPrompt(
    transaction: BankTransaction,
    context?: string[]
  ): string {
    // 🔧 COST OPTIMIZATION: Remove context to avoid sending unnecessary chat history
    // Each transaction is classified independently to minimize token usage
    // const contextInfo = context 
    //   ? `\n\nPrevious similar transactions:\n${context.join('\n')}`
    //   : ''
    const contextInfo = '' // Always empty to reduce token usage

    // Business Context (English for global scalability)
    const businessContext = `
**Business Context (SELPIC PTY LTD - Mixed-Use Account):**
- This is a MIXED-USE account: Cleaning Business + Personal expenses
- Company incorporated: January 2026
- Pre-revenue period: January-March 2026 (preparation phase)
- Trading starts: April 2026
- Two departments: Cleaning Services & Sticker E-commerce
- Partnership (cleaning) continues until March, then novated to company

**MONEY FLOW RECOGNITION:**
- **Debit (Money Out)**: Negative amount or value in "Paid Out" column = EXPENSES
- **Credit (Money In)**: Positive amount or value in "Paid In" column = INCOME
- Balance must reflect cumulative total correctly

**PROFESSIONAL CLASSIFICATION RULES (4 PILLARS):**

A. **Cleaning Business Income (Credit - Money In)**:
   - **CRITICAL: Column Position Priority**: If transaction is in CREDIT column, it's INCOME
   - **Client Income Patterns** (when in Credit column):
     - "ASSOCIATEDCLEANING" / "ASSOCIATED CLEAN" → Major client income
     - "AK INNOVATION BUILDING" (INV-FSCS...) → High-priority business client
     - "ASEEOS HOMES" (FSCS...) → High-priority business client
     - "JASON FAMILY SHINE" / "MALATANG" → Business-related income
     - "NABATM DEP" → Direct cash deposit from business operations
   - **RULE**: Same name (e.g., "JASON", "ASSOCIATED") in Credit = Income, in Debit = Expense
   - Category: INCOME_SALES_CLEANING
   - Department: cleaning

B. **Cleaning Business Expense (Debit - Money Out)**:
   - **CRITICAL: Column Position Priority**: If transaction is in DEBIT column, it's EXPENSE
   - **Subcontractors** (when in Debit column): "MJR ENTERPRISE", "FSCS PAYMENT", "ASSOCIATED CLEAN", "JASON FAMILY SHINE"
     - **RULE**: Same name in Debit = Subcontractor Expense (not Income)
   - **Supplies**: "BUNNINGS", "KLEENHUB", "SUPERCHEAP AUTO"
   - **Transport**: "7-ELEVEN", "BP", "AMPOL", "SHELL", "RACQ", "PARKING"
   - Category: Match to appropriate Expense category (EXPENSE_CLEANING_SUBCONTRACTOR, EXPENSE_OFFICE_SUPPLIES, etc.)
   - Department: cleaning

C. **Personal Transactions (Mixed - Credit/Debit)**:
   - **Education/Childcare**: "SCHOOL24", "MYPLACEFDC" → Department: personal
   - **Living/Groceries**: "ALDI", "COLES", "WOOLWORTHS", "TARGET", "BIG W" → Department: personal
   - **Entertainment/Dining**: "NETFLIX", "MCDONALDS", "MOMO CHICKEN", "ZONE BOWLING", "CINEMA", "RESTAURANTS", "CAFES", "TICKETEK" → Department: personal
   - **Personal Transfers (Credit/Debit)**: Internal transfers like "KIM J", "MRS HEE KIM", "HUSBAND", "LINKED ACC TRNS" → Department: personal
   - **CRITICAL EXCEPTION**: Even if in Credit column, if name is "MRS HEE KIM", "KIM J", or "HUSBAND" → Label as Personal Transfer (NOT business income)
   - These are NOT business income/expenses
   - Category: UNCATEGORIZED (or create PERSONAL category)
   - Department: personal (STRICTLY mark as Personal for all above keywords)

D. **Tax Significance**:
   - Only "Cleaning" department items should be flagged for Tax Deduction
   - Personal transactions are NOT tax-deductible
`

    // Ultra-compressed prompt - minimal tokens, essential data only
    const txData = `${transaction.date}|${transaction.description}|${transaction.debit ? `-${Math.abs(transaction.debit)}` : transaction.credit ? `+${Math.abs(transaction.credit)}` : '0'}${transaction.reference ? `|${transaction.reference}` : ''}`
    
    return `Classify: ${txData}

Rules: ${transaction.debit ? 'DEBIT' : 'CREDIT'} column = ${transaction.debit ? 'EXPENSE' : 'INCOME'}. Column position is authoritative.

${businessContext}

Available ATO Categories:
- INCOME_SALES: Sales Income
- INCOME_SALES_CLEANING: Trading Revenue (통합: 모든 사업 수입 - Cleaning + Sticker)
- INCOME_SALES_STICKER: Trading Revenue (Legacy: 자동으로 INCOME_SALES_CLEANING으로 변환)
- INCOME_REFUND_REIMBURSEMENT: Refund/Reimbursement - For refunds from typically expense vendors (Officeworks, BP, Coles, etc.) when in Credit column
- INCOME_OTHER_BUSINESS: Other Business Income - For other business income that doesn't fit standard categories
- INCOME_CASH_DEPOSIT_REVIEW: Cash Deposit (Review Required) - Legacy category (deprecated)
- NON_TAXABLE_CASH_DEPOSIT: Non-Taxable cash deposit - For DEP, DEPOSIT, NABATM DEP patterns
- LIABILITY_DIRECTORS_LOAN: Director's Loan (Capital Injection)
- LIABILITY_DIRECTORS_LOAN_WITHDRAWAL: Director's Loan Withdrawal
- EQUITY_SHARE_CAPITAL: Share Capital - For initial share capital contributions (does NOT affect Net Profit, only appears in Balance Sheet Equity section)
- EXPENSE_STARTUP_INCORPORATION: Startup Costs (통합: Incorporation + Domain + Sample)
- EXPENSE_STARTUP_DOMAIN: Startup Costs (Legacy: 자동으로 EXPENSE_STARTUP_INCORPORATION으로 변환)
- EXPENSE_STARTUP_SAMPLE: Startup Costs (Legacy: 자동으로 EXPENSE_STARTUP_INCORPORATION으로 변환)
- EXPENSE_FUEL_TRAVEL: Fuel & Travel (Gas stations, parking)
- EXPENSE_MOTOR_VEHICLE: Vehicle Maintenance (Mechanic, Service, Repair, Tyre)
- EXPENSE_TRAVEL_ACCOMMODATION: Travel & Accommodation (Hotel, Uber, Linkt, Airline, Taxi)
- EXPENSE_MEALS_ENTERTAINMENT: Meals & Entertainment (Business meals, client entertainment, business travel meals)
- EXPENSE_INSURANCE_PROFESSIONAL: Insurance & Professional Fees
- EXPENSE_CLEANING_SUPPLIES: Cleaning Supplies & Equipment
- EXPENSE_UTILITIES_PHONE: Utilities & Phone (Internet, electricity, phone bills)
- EXPENSE_CLEANING_SUBCONTRACTOR: Subcontractor Payments
- EXPENSE_REPAIRS_MAINTENANCE: Repairs & Maintenance (Handyman, Plumbing, Electrical, Repair, Maintenance)
- EXPENSE_OFFICE_EQUIPMENT: Office Equipment & Assets (Computers, furniture, equipment purchases)
- EXPENSE_OFFICE_SUPPLIES: Office Supplies (General office items)
- EXPENSE_RENT: Rent
- EXPENSE_UTILITIES: Utilities (Legacy - use EXPENSE_UTILITIES_PHONE)
- EXPENSE_MARKETING: Marketing & Advertising
- EXPENSE_STICKER_PRODUCTION: Sticker - Production Costs
- EXPENSE_WAGES_SALARIES: Wages & Salaries (Employee payroll)
- EXPENSE_SUPERANNUATION: Superannuation (Super contributions)
- EXPENSE_DIRECTORS_FEES: Director's Fees (Director remuneration)
- EXPENSE_ACCOUNTING_PROFESSIONAL_FEES: Accounting & Professional Fees
- TRANSFER_PARTNERSHIP_TO_COMPANY: Partnership to Company Transfer
- TRANSFER_INTERNAL: Internal Transfer (Non-Taxable) - Personal/family transfers
- UNCATEGORIZED: Uncategorized
${contextInfo}

**STEP-BY-STEP CLASSIFICATION PROCESS:**

**Step 1: Identify Money Flow (COLUMN POSITION IS AUTHORITATIVE)**
- **CRITICAL**: Column position (Debit vs Credit) takes priority over text keywords
- **ABSOLUTE RULE**: If transaction is in CREDIT column → It MUST be treated as INCOME/REFUND, regardless of vendor name
- If transaction is in DEBIT column → It's an EXPENSE
- If transaction is in CREDIT column → It's INCOME/REFUND (unless Personal Transfer exception)
- **IMPORTANT**: Even if vendor is typically an expense vendor (Officeworks, BP, Coles, etc.), if it's in CREDIT column, it's Income/Refund

**Step 2: Check for Refunds/Reimbursements from Expense Vendors (Credit Column / Positive Amount)**
- **CRITICAL**: If transaction is in CREDIT column from a typically expense vendor, it's likely a Refund/Reimbursement
- **Refund/Reimbursement Detection** (when in Credit column or positive amount):
  - **Expense Vendor Keywords**: "OFFICEWORKS", "OFFICE WORKS", "BP", "COLES", "WOOLWORTHS", "BUNNINGS", "TOTAL TOOLS", "7-ELEVEN", "AMPOL", "SHELL", "LIBERTY", "UNITED"
  - If transaction is in CREDIT column AND contains expense vendor keywords → INCOME_REFUND_REIMBURSEMENT | Department: cleaning | Confidence: 0.9
  - **Reason**: Credit from expense vendor indicates refund/reimbursement, not regular expense
- **Business Revenue Keywords** (when in Credit column or positive amount):
  - **"JASON FAMILY" / "JASON FAMILY SHINE"** → INCOME_SALES_CLEANING | Department: cleaning | Confidence: 1.0 (100%)
    - **CRITICAL**: ALL instances (including $1408, $506, $2200, $462) MUST be marked as Cleaning Income with 100% confidence
  - **"ASSOCIATED CLEANING" / "ASSOCIATEDCLEANING" / "ASSOCIATED CLEAN"** → INCOME_SALES_CLEANING | Department: cleaning | Confidence: 1.0 (100%)
    - **CRITICAL**: ALL amounts (including $3498, $3642.10) are Business Revenue, NOT personal transfers
  - **"ASEEOS HOMES" / "ASEEOS"** → INCOME_SALES_CLEANING | Department: cleaning | Confidence: 1.0 (100%)
  - **"AK INNOVATION" / "AK INNOVATION BUILDING"** → INCOME_SALES_CLEANING | Department: cleaning | Confidence: 1.0 (100%)
  - **"MALATANG"** → INCOME_SALES_CLEANING | Department: cleaning
  - **"common room"** → INCOME_SALES_CLEANING | Department: cleaning
- **Personal/Internal Transfers** (EXCLUDE from business income - CRITICAL):
  - **Family/Personal Names**: "MRS HEE KIM", "HEE KIM", "KIM J", "JINSOO KIM" → TRANSFER_INTERNAL | Department: personal (NOT business income)
  - **Internal Bank Transfers**: "Linked Acc Trns", "LINKED ACC TRNS", "INTER-BANK CREDIT", "ONLINE C4265737298" → TRANSFER_INTERNAL | Department: personal (NOT business income)
  - **Transfer Keywords**: "Transfer from", "Internal Transfer", "Account-to-Account" → TRANSFER_INTERNAL | Department: personal (NOT business income)
  - **Refunds**: "REFUND FEES" → TRANSFER_INTERNAL | Department: personal (NOT business income)
  - **CRITICAL RULE**: Even if in Credit column or positive amount, these MUST be marked as TRANSFER_INTERNAL and Department: personal. They MUST be EXCLUDED from Total Business Income calculations.
- **Cash Deposits (Personal Non-Taxable)**:
  - **"DEP"** / **"DEPOSIT"** / **"NABATM DEP"** / **"NAB ATM DEP"** patterns → NON_TAXABLE_CASH_DEPOSIT | Department: personal | Confidence: 1.0
    - **CRITICAL**: These are personal cash deposits, NOT business revenue
    - Category: NON_TAXABLE_CASH_DEPOSIT (NOT INCOME_SALES_CLEANING)
    - Department: personal (NOT cleaning)
    - Confidence: 1.0 (100% - auto-categorized)
    - **EXCLUDE from Total Business Income calculations**
- **RULE**: Only exact keyword matches = Business Revenue. All transfers = Personal (excluded from income totals)

**Step 3: Check for Cleaning Business Expense (Debit Column / Negative Amount)**
- **Priority**: Column position first - if in Debit column or negative amount, it's an expense
- **Fuel** (when in Debit column or negative amount):
  - "7-ELEVEN", "AMPOL", "BP", "LIBERTY", "SHELL", "UNITED" → Category: EXPENSE_FUEL_TRAVEL | Department: cleaning
  - **Note**: 주차장은 "Travel - Parking/Tolls"로 분류됨
- **Vehicle Maintenance** (when in Debit column or negative amount):
  - "MECHANIC", "MECHANIC SERVICE", "AUTO SERVICE", "SERVICE", "CAR SERVICE", "VEHICLE SERVICE" → Category: EXPENSE_MOTOR_VEHICLE | Department: cleaning
  - "REPAIR", "AUTO REPAIR", "CAR REPAIR", "VEHICLE REPAIR" → Category: EXPENSE_MOTOR_VEHICLE | Department: cleaning
  - "TYRE", "TYRES", "TYRE SERVICE", "TYRE REPLACEMENT", "TYRE SHOP" → Category: EXPENSE_MOTOR_VEHICLE | Department: cleaning
- **Travel - Transport** (when in Debit column or negative amount, Business Deductible):
  - 항공사: "QANTAS", "JETSTAR", "VIRGIN", "AIRLINE", "AIRLINES", "FLIGHT" → Category: EXPENSE_TRAVEL_TRANSPORT | Department: cleaning
  - 택시/라이드: "UBER", "UBER TRIP", "OLA", "TAXI", "TAXI SERVICE", "CAB" → Category: EXPENSE_TRAVEL_TRANSPORT | Department: cleaning
  - 렌터카: "RENTAL", "RENT A CAR", "CAR RENTAL" → Category: EXPENSE_TRAVEL_TRANSPORT | Department: cleaning
  - 톨비: "TOLL", "TOLL ROAD" → Category: EXPENSE_TRAVEL_TRANSPORT | Department: cleaning
- **Travel - Accommodation** (when in Debit column or negative amount, Business Deductible):
  - "HOTEL", "MOTEL", "STAY", "ACCOMMODATION", "BOOKING", "AIRBNB" → Category: EXPENSE_TRAVEL_ACCOMMODATION | Department: cleaning
- **Travel - Parking/Tolls** (when in Debit column or negative amount, Business Deductible):
  - "SECURE PARKING", "LINKT", "LINKT TOLL" → Category: EXPENSE_TRAVEL_PARKING_TOLLS | Department: cleaning
- **Travel - Meals** (when in Debit column or negative amount, Business Deductible):
  - 출장 중 레스토랑, 카페 영수증 (사장님 1인 결제 건)
  - "RESTAURANT", "CAFE", "DINING" + 출장 관련 키워드 ("TRAVEL", "TRIP", "BUSINESS TRIP", "CONFERENCE", "SEMINAR", "WORKSHOP")
  - → Category: EXPENSE_TRAVEL_MEALS | Department: cleaning
- **Meals & Entertainment** (when in Debit column or negative amount, for client entertainment only):
  - 클라이언트 접대비만 (출장 식대는 EXPENSE_TRAVEL_MEALS로 분류)
  - "RESTAURANT", "CAFE", "DINING" + "CLIENT" 또는 "ENTERTAINMENT" 키워드
  - → Category: EXPENSE_MEALS_ENTERTAINMENT | Department: cleaning
- **Insurance & Professional Fees**:
  - "Allianz", "ALLIANZ", "NRMA", "TAL", "RACQ" → Category: EXPENSE_INSURANCE_PROFESSIONAL | Department: cleaning
  - "OKTAX" / "OKTAX PTY LTD" → Category: EXPENSE_INSURANCE_PROFESSIONAL | Department: cleaning
- **Cleaning Supplies & Equipment**:
  - "KleenHub", "KLEENHUB", "BUNNINGS", "TOTAL TOOLS" → Category: EXPENSE_CLEANING_SUPPLIES | Department: cleaning
- **Telephone & Utilities**:
  - "TPG Internet", "TPG Telecom", "ALINTA ENERGY", "Brisbane City Council (Rates)", "Aldi Mobile" → Category: EXPENSE_UTILITIES_PHONE | Department: cleaning
  - **CRITICAL**: "Brisbane City Council" and "Alinta Energy" are business site utilities - always set Department to 'cleaning' (not 'personal')
- **Business Software**:
  - "Cursor, Powered Ide" / "Cursor, AI" / "Cursor Software" → Category: EXPENSE_OFFICE_SUPPLIES (or appropriate software category) | Department: cleaning | Confidence: 1.0 (100% - business software expense)
- **Subcontractor Payments**:
  - "MJR ENTERPRISE" / "MJRENTERPRISE" → Category: EXPENSE_CLEANING_SUBCONTRACTOR | Department: cleaning | Confidence: 1.0 (100% - recurring subcontractor)
- **Everything Else** (McDonalds, ALDI, BIG W, etc.):
  → Category: UNCATEGORIZED | Department: personal (NOT tax deductible)

**Step 4: Check for Personal Transactions (Mixed) - 🔧 CRITICAL SEPARATION**
- **🔧 CRITICAL**: Personal transactions (department: 'personal') are COMPLETELY SEPARATED from business accounting
- **Personal transactions are:**
  - NOT included in Total Business Income
  - NOT included in Total Business Expenses
  - NOT included in Net Profit
  - NOT included in GST Payable/Claimable
  - NOT tax deductible
  - ONLY affect Director's Loan Balance (for company accounts) or personal spending tracking (for individual users)
  
- **Personal Spending (Debit/Negative)**: "ALDI", "COLES", "WOOLWORTHS", "SCHOOL24", "MYPLACEFDC", "NETFLIX", "RESTAURANTS", "CAFES", "TICKETEK", "MCDONALDS", "WESTFIELD", "ZONE BOWLING", "BIG W", "TOYS", "PHARMACY", "HURRIKANE", "HANARO", "BENTLEYS", "METROPOL"
  → Category: UNCATEGORIZED | Department: personal | **COMPLETELY EXCLUDED from business calculations**
- **Family Expenses**: "SCHOOL24", "MYPLACEFDC", "TAL Life", "INSURANCE" (with personal name) → Category: UNCATEGORIZED | Department: personal
- **Personal Transfers (Credit/Debit)**: "KIM J", "MRS HEE KIM", "HEE KIM", "JINSOO KIM", "HUSBAND", "LINKED ACC TRNS", "Linked Acc Trns", "INTER-BANK CREDIT", "ONLINE C4265737298", "Transfer from", "Internal Transfer", "Account-to-Account"
  → **CRITICAL EXCEPTION**: Even if in Credit column or positive amount, these MUST be marked as TRANSFER_INTERNAL (NOT business income)
  → Category: TRANSFER_INTERNAL | Department: personal
  → These are NOT business income/expenses and MUST be EXCLUDED from tax export and Total Business Income calculations
- **Personal Cash Deposits**: "CARINDALE", "ATM DEP", "DEPOSIT", "CASH DEPOSIT" (when clearly personal)
  → Category: NON_TAXABLE_CASH_DEPOSIT | Department: personal | **NOT business income**

**Step 5: Tax Significance & Business Separation**
- **Business transactions** (department: 'cleaning', 'sticker', or empty):
  - Included in Total Business Income/Expenses
  - Included in Net Profit
  - Included in GST calculations
  - Tax deductible (if expense)
- **Personal transactions** (department: 'personal'):
  - **COMPLETELY EXCLUDED** from all business calculations
  - NOT tax deductible
  - Only tracked for Director's Loan Balance (company accounts) or personal spending (individual users)

**Step 6: Director's Loan & Pre-trading (if applicable)**
- Director's Loan: Jan-Mar 2026, credit from personal/partnership → LIABILITY_DIRECTORS_LOAN
- Pre-trading Expense: Jan-Mar 2026, debit for setup → EXPENSE_STARTUP_*

**Step 7: PAYG Withholding Detection (Payroll Transactions)**
- **PAYG (Pay As You Go) Withholding** is required for:
  - Employee wages/salaries (EXPENSE_WAGES_SALARIES)
  - Director's fees (EXPENSE_DIRECTORS_FEES)
  - Superannuation contributions (EXPENSE_SUPERANNUATION)
  - Some contractor payments (if PAYG registered)
- **Payroll Transaction Keywords** (when in Debit column or negative amount):
  - "WAGES", "SALARY", "PAYROLL", "PAYG", "PAY AS YOU GO"
  - "SUPERANNUATION", "SUPER", "SUPER CONTRIBUTION"
  - "DIRECTOR FEE", "DIRECTOR'S FEE", "DIRECTOR FEE", "DIRECTOR REMUNERATION"
  - "PAYMENT TO" + person name (for employee/contractor payments)
  - Regular recurring payments to same person (likely employee/contractor)
- **Payroll Type Detection**:
  - "DIRECTOR FEE" / "DIRECTOR'S FEE" → Payroll_Type: director
  - "WAGES" / "SALARY" / "PAYROLL" → Payroll_Type: employee
  - "SUBCONTRACTOR" / "CONTRACTOR" → Payroll_Type: contractor
  - Regular payment to person name → Payroll_Type: employee (if recurring) or contractor (if one-off)
- **Requires PAYG**: Set Requires_PAYG: true if transaction is:
  - Employee wages/salaries
  - Director's fees
  - Regular contractor payments (if company is PAYG registered)
- **Category Assignment**:
  - Employee wages → EXPENSE_WAGES_SALARIES
  - Director fees → EXPENSE_DIRECTORS_FEES
  - Superannuation → EXPENSE_SUPERANNUATION
  - Contractor payments → EXPENSE_CLEANING_SUBCONTRACTOR (or appropriate category)

**REQUIRED Output Format (ALL fields must be provided - SINGLE API CALL):**
Category: [CATEGORY_CODE] (e.g., EXPENSE_OFFICE_SUPPLIES, EXPENSE_RENT, EXPENSE_MARKETING, etc.)
Entity_Type: [partnership/company/personal]
Department: [cleaning/sticker/personal/general/unknown] (MUST be one of these)
Is_Directors_Loan: [true/false]
Is_Pre_Trading_Expense: [true/false]
Requires_PAYG: [true/false] (Set to true for payroll transactions: wages, director fees, superannuation)
Is_Payroll_Transaction: [true/false] (Set to true if this is a payroll-related payment)
Payroll_Type: [employee/director/contractor/partner] (Only if Is_Payroll_Transaction is true)
Confidence: [0.0-1.0] (MUST be provided, use 0.6 for ambiguous Personal, 0.7 for ambiguous Cleaning)
Reason: [Brief explanation of classification]

**GST Information (REQUIRED - included in this single call):**
GST_Included: [true/false] (Is GST included in the transaction amount?)
GST_Type: [INCLUDED/EXCLUDED/FREE] (GST status: INCLUDED means GST is in the amount, EXCLUDED means no GST, FREE means GST-free transaction)
GST_Amount: [number] (If GST_INCLUDED is true, calculate GST amount as: transaction_amount / 11. If false or FREE, set to 0)
Net_Amount: [number] (Transaction amount minus GST amount if GST is included)

**FBT Information (REQUIRED - included in this single call):**
FBT_Relevant: [true/false] (Could this transaction be subject to Fringe Benefits Tax?)
FBT_Category: [meal/entertainment/travel/vehicle/other] (FBT category if FBT_Relevant is true, otherwise null)
FBT_Risk: [low/medium/high] (FBT risk level: low = <$100, medium = $100-$300, high = >$300 or entertainment/meals)
FBT_Reportable: [true/false] (Should this be reported for FBT purposes?)
FBT_Amount: [number] (FBT amount if applicable, otherwise 0)

**CRITICAL CLASSIFICATION RULES (AMOUNT SIGN PRIORITY):**
1. **Money Flow (AMOUNT SIGN IS AUTHORITATIVE)**: 
   - Positive Amount (+) = Credit (Income)
   - Negative Amount (-) = Debit (Expense)
   - Amount sign takes priority over text keywords
2. **Cleaning Revenue (Positive Amount / Credit Column)**:
   - ONLY if keywords match exactly: ASSOCIATED CLEANING, ASSOCIATED CLEAN, JASON FAMILY, AK INNOVATION, ASEEOS HOMES, common room
   - → INCOME_SALES_CLEANING | Department: cleaning
   - **Malatang Revenue**: MALATANG → INCOME_SALES_CLEANING | Department: cleaning (or create separate department if needed)
   - **EXCLUDE from business income (CRITICAL)**: 
     - Family/Personal Names: MRS HEE KIM, HEE KIM, KIM J, JINSOO KIM → TRANSFER_INTERNAL | Department: personal
     - Internal Transfers: Linked Acc Trns, INTER-BANK CREDIT, ONLINE C4265737298 → TRANSFER_INTERNAL | Department: personal
     - Transfer Keywords: "Transfer from", "Internal Transfer", "Account-to-Account" → TRANSFER_INTERNAL | Department: personal
   - These MUST be EXCLUDED from Total Business Income calculations
3. **Cleaning Expenses (Negative Amount / Debit Column)**: 
   - **Fuel**: 7-ELEVEN, AMPOL, BP, LIBERTY, SHELL, UNITED (주차장은 Travel - Parking/Tolls로 분류)
     → EXPENSE_FUEL_TRAVEL | Department: cleaning
   - **Vehicle Maintenance**: MECHANIC, MECHANIC SERVICE, AUTO SERVICE, SERVICE, CAR SERVICE, VEHICLE SERVICE, REPAIR, AUTO REPAIR, CAR REPAIR, VEHICLE REPAIR, TYRE, TYRES, TYRE SERVICE, TYRE REPLACEMENT, TYRE SHOP
     → EXPENSE_MOTOR_VEHICLE | Department: cleaning
   - **Travel - Transport** (Business Deductible): QANTAS, JETSTAR, VIRGIN, AIRLINE, AIRLINES, FLIGHT, UBER, UBER TRIP, OLA, TAXI, TAXI SERVICE, CAB, RENTAL, RENT A CAR, CAR RENTAL, TOLL, TOLL ROAD
     → EXPENSE_TRAVEL_TRANSPORT | Department: cleaning
   - **Travel - Accommodation** (Business Deductible): HOTEL, MOTEL, STAY, ACCOMMODATION, BOOKING, AIRBNB
     → EXPENSE_TRAVEL_ACCOMMODATION | Department: cleaning
   - **Travel - Parking/Tolls** (Business Deductible): SECURE PARKING, LINKT, LINKT TOLL
     → EXPENSE_TRAVEL_PARKING_TOLLS | Department: cleaning
   - **Travel - Meals** (Business Deductible): RESTAURANT, CAFE, DINING + 출장 관련 키워드 (TRAVEL, TRIP, BUSINESS TRIP, CONFERENCE, SEMINAR, WORKSHOP)
     → EXPENSE_TRAVEL_MEALS | Department: cleaning
   - **Meals & Entertainment**: 클라이언트 접대비만 (출장 식대는 EXPENSE_TRAVEL_MEALS로 분류)
     → EXPENSE_MEALS_ENTERTAINMENT | Department: cleaning (only for client entertainment, not travel meals)
   - **Insurance & Professional**: Allianz, ALLIANZ, NRMA, TAL, RACQ, OKTAX, OKTAX PTY LTD
     → EXPENSE_INSURANCE_PROFESSIONAL | Department: cleaning
   - **Cleaning Supplies**: KleenHub, KLEENHUB, BUNNINGS, TOTAL TOOLS
     → EXPENSE_CLEANING_SUPPLIES | Department: cleaning
   - **Utilities & Phone**: TPG Internet, TPG Telecom, ALINTA ENERGY, Brisbane City Council (Rates), Aldi Mobile
     → EXPENSE_UTILITIES_PHONE | Department: cleaning
   - **Subcontractor**: MJR ENTERPRISE
     → EXPENSE_CLEANING_SUBCONTRACTOR | Department: cleaning
   - **Everything Else** (McDonalds, ALDI, BIG W, etc.) → UNCATEGORIZED | Department: personal
4. **Personal Transactions**: 
   - ALDI, COLES, WOOLWORTHS, SCHOOL24, MYPLACEFDC, NETFLIX, RESTAURANTS, CAFES, TICKETEK, MCDONALDS, WESTFIELD, ZONE BOWLING, BIG W → UNCATEGORIZED | Department: personal
   - **Personal/Internal Transfers (CRITICAL)**: 
     - Family/Personal Names: KIM J, MRS HEE KIM, HEE KIM, JINSOO KIM, HUSBAND → TRANSFER_INTERNAL | Department: personal
     - Internal Bank Transfers: LINKED ACC TRNS, Linked Acc Trns, INTER-BANK CREDIT, ONLINE C4265737298 → TRANSFER_INTERNAL | Department: personal
     - Transfer Keywords: "Transfer from", "Internal Transfer", "Account-to-Account" → TRANSFER_INTERNAL | Department: personal
     - Refunds: REFUND FEES → TRANSFER_INTERNAL | Department: personal
   - **EXCEPTION**: Even if positive amount (Credit column), these MUST be TRANSFER_INTERNAL and Department: personal (NOT business income)
5. **Cash Deposits (Personal Non-Taxable)**: 
   - DEP / DEPOSIT / NABATM DEP / NAB ATM DEP → NON_TAXABLE_CASH_DEPOSIT | Department: personal | Confidence: 1.0
   - **CRITICAL**: These are personal cash deposits, NOT business revenue. Must be excluded from Total Business Income.
6. **Tax Significance**: Only "Cleaning" department = Tax Deductible
7. **EVERY transaction MUST have**: department, category, and confidence
8. **If ambiguous**: Default to "Personal" with confidence 0.6`
  }

  /**
   * OpenAI API 호출
   * @param prompt - Classification prompt
   * @param useComplexModel - If true, use gpt-4o for complex analysis, otherwise gpt-4o-mini
   */
  private async callOpenAI(prompt: string, useComplexModel: boolean = false): Promise<{ content: string; usage?: { model: string; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCost: number } }> {
    if (!this.openai) {
      console.error('[OpenAI] OpenAI client not initialized')
      throw new Error('OpenAI client not initialized')
    }

    const model = useComplexModel ? 'gpt-4o' : 'gpt-4o-mini'
    
    // 🔧 COST OPTIMIZATION: Calculate estimated token usage (rough estimate: 1 token ≈ 4 characters)
    const estimatedPromptTokens = Math.ceil(prompt.length / 4)
    const estimatedPayloadSize = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert Australian accountant. Your task is to classify bank transactions into ATO (Australian Taxation Office) standard categories.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }).length
    
    console.log('[OpenAI] ========================================')
    console.log('[OpenAI] Making API call to OpenAI...')
    console.log('[OpenAI] Model:', model)
    console.log('[OpenAI] Prompt length:', prompt.length, 'characters')
    console.log('[OpenAI] Estimated prompt tokens:', estimatedPromptTokens)
    console.log('[OpenAI] Estimated payload size:', estimatedPayloadSize, 'bytes')
    console.log('[OpenAI] Max tokens (response limit):', 1000)
    console.log('[OpenAI] Prompt preview (first 200 chars):', prompt.substring(0, 200))
    console.log('[OpenAI] ========================================')

    let response
    try {
      response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Australian accountant. Your task is to classify bank transactions into ATO (Australian Taxation Office) standard categories.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000, // 🔧 COST OPTIMIZATION: Increased from 500 to 1000 as requested
      })

      console.log('[OpenAI] ✅ API call successful')
      console.log('[OpenAI] Response received:', {
        id: response.id,
        model: response.model,
        usage: response.usage,
        choicesCount: response.choices?.length || 0
      })
      
      // 🔧 COST OPTIMIZATION: Log detailed token usage for monitoring
      if (response.usage) {
        const promptTokens = response.usage.prompt_tokens || 0
        const completionTokens = response.usage.completion_tokens || 0
        const totalTokens = response.usage.total_tokens || 0
        const inputPricePer1M = useComplexModel ? 2.50 : 0.15
        const outputPricePer1M = useComplexModel ? 10.00 : 0.60
        const estimatedCost = 
          (promptTokens / 1_000_000) * inputPricePer1M +
          (completionTokens / 1_000_000) * outputPricePer1M
        
        console.log('[OpenAI] 💰 Token Usage & Cost:')
        console.log('  - Prompt tokens:', promptTokens)
        console.log('  - Completion tokens:', completionTokens)
        console.log('  - Total tokens:', totalTokens)
        console.log('  - Estimated cost: $' + estimatedCost.toFixed(6))
        console.log('  - Model:', model)
      }
    } catch (error: any) {
      console.error('[OpenAI] ❌ API call failed')
      console.error('[OpenAI] Error type:', error?.constructor?.name)
      console.error('[OpenAI] Error message:', error?.message)
      console.error('[OpenAI] Error status:', error?.status)
      console.error('[OpenAI] Error code:', error?.code)
      console.error('[OpenAI] Error stack:', error?.stack)
      throw error
    }

    const rawContent = response.choices[0]?.message?.content || ''
    console.log('[OpenAI] Raw response length:', rawContent.length, 'characters')
    console.log('[OpenAI] Raw response preview (first 300 chars):', rawContent.substring(0, 300))
    console.log('[OpenAI] ========================================')

    if (!rawContent || rawContent.trim().length === 0) {
      console.error('[OpenAI] ❌ Empty response from OpenAI')
      throw new Error('Empty response from OpenAI API')
    }

    // Log API usage for cost tracking (after successful response)
    // Note: This runs on both client and server side
    if (response.usage) {
      try {
        // 🔧 CONSERVATIVE COST CALCULATION: Use higher prices to ensure we don't underestimate
        // Pricing as of 2024 (conservative estimates - slightly higher than actual to be safe):
        // gpt-4o-mini: $0.20/$0.80 per 1M tokens (input/output) - 33% buffer for safety
        // gpt-4o: $3.00/$12.00 per 1M tokens (input/output) - 20% buffer for safety
        // Note: Actual prices are $0.15/$0.60 and $2.50/$10.00, but we use higher values to be conservative
        const inputPricePer1M = useComplexModel ? 3.00 : 0.20  // 🔧 CONSERVATIVE: 20-33% higher than actual
        const outputPricePer1M = useComplexModel ? 12.00 : 0.80  // 🔧 CONSERVATIVE: 20-33% higher than actual
        
        const promptTokens = response.usage.prompt_tokens || 0
        const completionTokens = response.usage.completion_tokens || 0
        const totalTokens = response.usage.total_tokens || 0
        
        const estimatedCost = 
          (promptTokens / 1_000_000) * inputPricePer1M +
          (completionTokens / 1_000_000) * outputPricePer1M

        // Log to IndexedDB (client-side only, server-side will log separately)
        if (typeof window !== 'undefined') {
          import('@/lib/storage/indexed-db').then(({ indexedDBStorage }) => {
            indexedDBStorage.logApiUsage({
              model,
              promptTokens,
              completionTokens,
              totalTokens,
              estimatedCost,
              apiKeyType: 'user' // Will be determined by caller if needed
            }).catch(err => console.error('[OpenAI] Failed to log API usage:', err))
          })
        } else {
          // Server-side: Return usage info so caller can log it
          console.log('[OpenAI] Server-side API usage:', {
            model,
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCost
          })
        }
      } catch (err) {
        console.error('[OpenAI] Error logging usage:', err)
      }
    }

    // 🔧 CONSERVATIVE COST CALCULATION: Use higher prices for server-side logging
    const estimatedCost = response.usage ? 
      ((response.usage.prompt_tokens || 0) / 1_000_000) * (useComplexModel ? 3.00 : 0.20) +
      ((response.usage.completion_tokens || 0) / 1_000_000) * (useComplexModel ? 12.00 : 0.80)
      : 0

    return {
      content: rawContent,
      usage: response.usage ? {
        model,
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
        estimatedCost
      } : undefined
    }
  }

  /**
   * AI 응답 파싱 (통합: 분류 + GST + FBT)
   */
  private parseResponse(response: string): ClassificationResult & { 
    gstInfo?: { isGSTIncluded: boolean; gstType: string; gstAmount: number; netAmount: number; confidence: number; reasoning?: string }
    fbtInfo?: { isFBTRelevant: boolean; fbtCategory?: string; fbtRisk: string; isFBTReportable: boolean; fbtAmount?: number; reasoning?: string; confidence: number }
  } {
    console.log('[OpenAI] Parsing response...')
    console.log('[OpenAI] Full response:', response)

    // Try to extract JSON if response contains JSON
    let responseText = response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      console.log('[OpenAI] Found JSON in response, extracting...')
      try {
        const jsonData = JSON.parse(jsonMatch[0])
        console.log('[OpenAI] Parsed JSON:', jsonData)
        // Use JSON data if available
        if (jsonData.category) {
          // Ensure all required fields are present
          const deptValue = jsonData.department?.toLowerCase()
          const validDepartments = ['cleaning', 'sticker', 'personal', 'general', 'unknown']
          const department = validDepartments.includes(deptValue || '') 
            ? deptValue 
            : 'personal' // Default to personal for ambiguous cases

          // 🔧 INTEGRATED: Parse GST and FBT info from same response
          const gstInfo = jsonData.GST_Included !== undefined ? {
            isGSTIncluded: jsonData.GST_Included === true || jsonData.GST_Included === 'true',
            gstType: (jsonData.GST_Type || (jsonData.GST_Included ? 'INCLUDED' : 'EXCLUDED')) as 'INCLUDED' | 'EXCLUDED' | 'FREE',
            gstAmount: parseFloat(jsonData.GST_Amount || '0') || 0,
            netAmount: parseFloat(jsonData.Net_Amount || '0') || 0,
            confidence: jsonData.GST_Confidence || 0.8,
            reasoning: jsonData.GST_Reasoning || 'AI GST detection'
          } : undefined
          
          const fbtInfo = jsonData.FBT_Relevant !== undefined ? {
            isFBTRelevant: jsonData.FBT_Relevant === true || jsonData.FBT_Relevant === 'true',
            fbtCategory: jsonData.FBT_Category as 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other' | undefined,
            fbtRisk: (jsonData.FBT_Risk || 'low') as 'low' | 'medium' | 'high',
            isFBTReportable: jsonData.FBT_Reportable === true || jsonData.FBT_Reportable === 'true',
            fbtAmount: parseFloat(jsonData.FBT_Amount || '0') || 0,
            reasoning: jsonData.FBT_Reasoning || 'AI FBT detection',
            confidence: jsonData.FBT_Confidence || 0.7
          } : undefined
          
          return {
            category: jsonData.category || 'UNCATEGORIZED',
            confidence: jsonData.confidence || (department === 'personal' ? 0.6 : 0.8),
            department: department as any,
            isDirectorsLoan: jsonData.isDirectorsLoan === true || jsonData.isDirectorsLoan === 'true',
            isPreTradingExpense: jsonData.isPreTradingExpense === true || jsonData.isPreTradingExpense === 'true',
            requiresPAYG: jsonData.requiresPAYG === true || jsonData.requiresPAYG === 'true',
            isPayrollTransaction: jsonData.isPayrollTransaction === true || jsonData.isPayrollTransaction === 'true',
            payrollType: jsonData.payrollType as 'employee' | 'director' | 'contractor' | 'partner' | undefined,
            entityType: jsonData.entityType || 'company',
            reason: jsonData.reason || 'AI classification',
            gstInfo,
            fbtInfo
          } as any
        }
      } catch (jsonError) {
        console.warn('[OpenAI] Failed to parse JSON, falling back to regex parsing')
      }
    }

    // Fallback to regex parsing
    console.log('[OpenAI] Using regex parsing...')
    const categoryMatch = response.match(/Category:\s*([A-Z_]+)/i)
    const entityTypeMatch = response.match(/Entity_Type:\s*(\w+)/i)
    const departmentMatch = response.match(/Department:\s*(\w+)/i)
    const isDirectorsLoanMatch = response.match(/Is_Directors_Loan:\s*(true|false)/i)
    const isPreTradingMatch = response.match(/Is_Pre_Trading_Expense:\s*(true|false)/i)
    const requiresPAYGMatch = response.match(/Requires_PAYG:\s*(true|false)/i)
    const isPayrollMatch = response.match(/Is_Payroll_Transaction:\s*(true|false)/i)
    const payrollTypeMatch = response.match(/Payroll_Type:\s*(employee|director|contractor|partner)/i)
    const confidenceMatch = response.match(/Confidence:\s*([\d.]+)/i)

    console.log('[OpenAI] Regex matches:', {
      category: categoryMatch?.[1],
      entityType: entityTypeMatch?.[1],
      department: departmentMatch?.[1],
      isDirectorsLoan: isDirectorsLoanMatch?.[1],
      isPreTrading: isPreTradingMatch?.[1],
      requiresPAYG: requiresPAYGMatch?.[1],
      isPayroll: isPayrollMatch?.[1],
      payrollType: payrollTypeMatch?.[1],
      confidence: confidenceMatch?.[1]
    })
    const reasonMatch = response.match(/Reason:\s*(.+)/i)

    // Ensure department is valid, default to 'personal' for ambiguous cases
    // Unified: 'sticker' is automatically converted to 'cleaning' (both are 'Company')
    const departmentValue = departmentMatch?.[1]?.toLowerCase()
    const validDepartments = ['cleaning', 'sticker', 'personal', 'general', 'unknown']
    let department = validDepartments.includes(departmentValue || '') 
      ? departmentValue 
      : 'personal' // Default to personal for ambiguous/unclear cases
    
    // Auto-convert 'sticker' to 'cleaning' (unified as 'Company')
    if (department === 'sticker') {
      department = 'cleaning'
    }

    // Ensure category is always provided
    const category = categoryMatch?.[1] || 'UNCATEGORIZED'
    
    // Ensure confidence is always provided (default to 0.6 for ambiguous personal)
    const confidence = confidenceMatch 
      ? parseFloat(confidenceMatch[1]) 
      : (department === 'personal' ? 0.6 : 0.5)

    return {
      category,
      confidence,
      reason: reasonMatch?.[1] || 'No reason provided',
      entityType: entityTypeMatch?.[1] as any,
      department: department as any,
      isDirectorsLoan: isDirectorsLoanMatch?.[1]?.toLowerCase() === 'true',
      isPreTradingExpense: isPreTradingMatch?.[1]?.toLowerCase() === 'true',
      requiresPAYG: requiresPAYGMatch?.[1]?.toLowerCase() === 'true',
      isPayrollTransaction: isPayrollMatch?.[1]?.toLowerCase() === 'true',
      payrollType: payrollTypeMatch?.[1] as 'employee' | 'director' | 'contractor' | 'partner' | undefined,
    }
  }
}

