/**
 * Internationalization (i18n) Strings
 * 
 * All user-facing strings are centralized here for easy translation.
 * Currently in English, but structured to support Korean and other languages.
 */

export const strings = {
  // Dashboard
  dashboard: {
    title: 'SELPIC A: AI Tax & Bookkeeping Analyzer',
    subtitle: 'Smart AI-Powered Bookkeeping for Australian Businesses.',
    subtitleLine2: 'Upload statements or receipts to automate tax categorization and stay ahead of ATO deadlines.',
    uploadStatement: 'Smart Data Integration',
    uploadDescription: 'Upload Australian bank statements or cash receipts. Our AI engine automatically classifies transactions into 31 ATO tax categories.',
    transactionHistory: 'Transaction History',
    processing: 'Processing...',
    selectPdfFile: 'Select CSV or PDF File',
    supportedBanks: 'Format: Australian Bank CSV or PDF Statements (Recommended)',
    aiDetection: 'Our AI automatically detects your bank\'s format and categorizes transactions.',
    disclaimer: 'Professional Review Encouraged: While SELPIC A uses advanced AI for high precision, please verify all entries to ensure 100% compliance with your specific tax requirements.',
  },

  // Table Headers
  table: {
    date: 'Date',
    description: 'Description',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
    category: 'Tax Category',
    confidence: 'Confidence',
    department: 'Department',
    status: 'Status',
    swap: 'Swap',
  },

  // Transaction Status
  status: {
    pending: 'Pending',
    classified: 'Classified',
    reviewed: 'Reviewed',
    preRevenue: 'Pre-revenue',
    directorsLoan: "Director's Loan",
  },

  // Settings
  settings: {
    title: 'Settings',
    apiKey: 'OpenAI API Key',
    apiKeyPlaceholder: 'Enter your OpenAI API key (sk-...)',
    apiKeyDescription: 'Your API key is stored locally and never shared.',
    directorName: 'Director Name',
    directorNamePlaceholder: 'Enter director full name (e.g., Jinsoo Kim)',
    directorNameDescription: 'Director name is used to automatically detect Director Loan transactions. Leave empty if not applicable.',
    validate: 'Validate Key',
    save: 'Save',
    cancel: 'Cancel',
    keyValid: 'API key is valid',
    keyInvalid: 'Invalid API key',
    keyRequired: 'API key is required',
  },

  // Errors
  errors: {
    noFileSelected: 'Please select a PDF file',
    unsupportedBank: 'Unsupported bank format. Please use CBA, ANZ, NAB, or Westpac statements.',
    parsingFailed: 'Failed to parse PDF. Please check the file format.',
    classificationFailed: 'Failed to classify transactions. Please check your API key.',
    apiKeyRequired: 'OpenAI API key is required for classification.',
  },

  // Success Messages
  success: {
    parsed: 'PDF parsed successfully',
    classified: 'Transactions classified successfully',
    saved: 'Settings saved',
  },

  // Categories
  categories: {
    // 수입 (Income)
    incomeSales: 'Sales Income', // Legacy
    incomeCleaning: 'Trading Revenue', // 통합: 모든 사업 수입 (Cleaning + Sticker)
    incomeSticker: 'Trading Revenue', // Legacy: 자동으로 INCOME_SALES_CLEANING으로 변환
    incomeRefundReimbursement: 'Refund/Reimbursement', // 환불/보상금 (일반적으로 Expense 벤더에서 Credit)
    incomeOtherBusiness: 'Other Business Income', // 기타 사업 수입
    nonTaxableCashDeposit: 'Non-Taxable cash deposit', // 개인 ATM 입금
    liabilityDirectorsLoan: "Director's Loan", // Director's Loan (통합: Withdrawal 포함)
    
    // 자본 (Equity)
    equityShareCapital: 'Share Capital', // 주식 납입금 (Net Profit에 영향 없음, Balance Sheet Equity에만 반영)
    
    // 지출 (Expenses)
    expenseStartup: 'Startup Costs', // Startup Costs (통합: Incorporation + Domain + Sample)
    expenseFuelTravel: 'Fuel', // 주유소만 (주차장 제거)
    expenseMotorVehicle: 'Vehicle Maintenance',
    // 출장 경비 (Travel Expenses) - Business Deductible
    expenseTravelTransport: 'Travel - Transport',
    expenseTravelAccommodation: 'Travel - Accommodation',
    expenseTravelMeals: 'Travel - Meals',
    expenseTravelParkingTolls: 'Travel - Parking/Tolls',
    expenseMealsEntertainment: 'Meals & Entertainment', // 클라이언트 접대비만
    expenseInsuranceProfessional: 'Insurance/Professional',
    expenseCleaningSupplies: 'Cleaning Supplies',
    expenseUtilitiesPhone: 'Utilities/Phone', // Utilities/Phone (통합: Legacy EXPENSE_UTILITIES 포함)
    expenseSubcontractor: 'Subcontractor',
    expenseRepairsMaintenance: 'Repairs & Maintenance',
    expenseOfficeEquipment: 'Office Equipment & Assets',
    expenseOffice: 'Office Supplies',
    expenseFreightShipping: 'Freight & Shipping',
    expenseRent: 'Rent',
    expenseMarketing: 'Marketing & Advertising',
    expenseWagesSalaries: 'Wages & Salaries',
    expenseSuperannuation: 'Superannuation',
    expenseATOGSTBAS: 'ATO - GST & BAS',
    expenseATOPAYGWithholding: 'ATO - PAYG Withholding',
    expenseCompanyIncomeTax: 'Company Income Tax',
    expenseWorkersCompensation: 'Workers Compensation',
    expenseAccountingProfessionalFees: 'Accounting & Professional Fees',
    expenseDirectorLoanRepayment: 'Director Loan Repayment',
    expenseDividendsPaid: 'Dividends Paid',
    expenseDirectorsFees: "Director's Fees",
    cashExpensePetty: 'Cash & Petty Cash', // 현금 지출
    
    // 이체 및 기타
    internalTransfer: 'Non-Taxable Transfer', // Non-Taxable Transfer (통합: TRANSFER_INTERNAL, TRANSFER_PARTNERSHIP_TO_COMPANY 포함)
    uncategorized: 'Uncategorized',
    
    // Legacy (하위 호환성)
    incomeCashDepositReview: 'Non-Taxable cash deposit', // Legacy
  },

  // Departments
  // Unified: 'cleaning' and 'sticker' are both displayed as 'Company'
  // 'sticker' is automatically converted to 'cleaning' in the UI for consistency
  departments: {
    cleaning: 'Company',
    sticker: 'Company', // Legacy support - auto-converted to 'cleaning' in UI
    personal: 'Personal',
    general: 'General',
    unknown: 'Unknown',
  },
}

// Type for translation keys (for future TypeScript support)
export type TranslationKey = keyof typeof strings

