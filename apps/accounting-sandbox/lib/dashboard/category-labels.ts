/**
 * Single source of truth for category display names
 * (Transaction History + Add Cash Expense).
 */

import { strings } from '@/lib/i18n/strings'

const CATEGORY_LABELS: Record<string, string> = {
  // Income
  INCOME_SALES_CLEANING: 'Trading Revenue',
  INCOME_SALES_STICKER: 'Trading Revenue',
  INCOME_REFUND_REIMBURSEMENT: strings.categories.incomeRefundReimbursement,
  INCOME_OTHER_BUSINESS: strings.categories.incomeOtherBusiness,
  NON_TAXABLE_CASH_DEPOSIT: strings.categories.nonTaxableCashDeposit,
  LIABILITY_DIRECTORS_LOAN: strings.categories.liabilityDirectorsLoan,
  LIABILITY_DIRECTORS_LOAN_WITHDRAWAL: strings.categories.liabilityDirectorsLoan,

  // Equity
  EQUITY_SHARE_CAPITAL: strings.categories.equityShareCapital,

  // Expenses
  EXPENSE_STARTUP_INCORPORATION: strings.categories.expenseStartup,
  EXPENSE_STARTUP_DOMAIN: strings.categories.expenseStartup,
  EXPENSE_STARTUP_SAMPLE: strings.categories.expenseStartup,
  EXPENSE_FUEL_TRAVEL: strings.categories.expenseFuelTravel,
  EXPENSE_MOTOR_VEHICLE: strings.categories.expenseMotorVehicle,
  EXPENSE_TRAVEL_TRANSPORT: strings.categories.expenseTravelTransport,
  EXPENSE_TRAVEL_ACCOMMODATION: strings.categories.expenseTravelAccommodation,
  EXPENSE_TRAVEL_MEALS: strings.categories.expenseTravelMeals,
  EXPENSE_TRAVEL_PARKING_TOLLS: strings.categories.expenseTravelParkingTolls,
  EXPENSE_MEALS_ENTERTAINMENT: strings.categories.expenseMealsEntertainment,
  EXPENSE_INSURANCE_PROFESSIONAL: strings.categories.expenseInsuranceProfessional,
  EXPENSE_CLEANING_SUPPLIES: strings.categories.expenseCleaningSupplies,
  EXPENSE_UTILITIES_PHONE: strings.categories.expenseUtilitiesPhone,
  EXPENSE_CLEANING_SUBCONTRACTOR: strings.categories.expenseSubcontractor,
  EXPENSE_REPAIRS_MAINTENANCE: strings.categories.expenseRepairsMaintenance,
  EXPENSE_OFFICE_EQUIPMENT: strings.categories.expenseOfficeEquipment,
  EXPENSE_OFFICE_SUPPLIES: strings.categories.expenseOffice,
  EXPENSE_FREIGHT_SHIPPING: strings.categories.expenseFreightShipping,
  EXPENSE_SOFTWARE_SUBSCRIPTIONS: strings.categories.expenseSoftwareSubscriptions,
  EXPENSE_BANK_FEES_INTEREST: strings.categories.expenseBankFeesInterest,
  EXPENSE_RENT: strings.categories.expenseRent,
  EXPENSE_MARKETING: strings.categories.expenseMarketing,
  EXPENSE_MERCHANT_FEES: strings.categories.expenseMerchantFees,
  EXPENSE_WAGES_SALARIES: strings.categories.expenseWagesSalaries,
  EXPENSE_SUPERANNUATION: strings.categories.expenseSuperannuation,
  EXPENSE_ATO_GST_BAS: strings.categories.expenseATOGSTBAS,
  EXPENSE_ATO_PAYG_WITHHOLDING: strings.categories.expenseATOPAYGWithholding,
  EXPENSE_COMPANY_INCOME_TAX: strings.categories.expenseCompanyIncomeTax,
  EXPENSE_WORKERS_COMPENSATION: strings.categories.expenseWorkersCompensation,
  EXPENSE_ACCOUNTING_PROFESSIONAL_FEES: strings.categories.expenseAccountingProfessionalFees,
  EXPENSE_DIRECTOR_LOAN_REPAYMENT: strings.categories.expenseDirectorLoanRepayment,
  EXPENSE_DIVIDENDS_PAID: strings.categories.expenseDividendsPaid,
  EXPENSE_DIRECTORS_FEES: strings.categories.expenseDirectorsFees,
  CASH_EXPENSE_PETTY: strings.categories.cashExpensePetty,

  // Transfers & other
  NON_TAXABLE_TRANSFER: strings.categories.internalTransfer,
  NON_TAXABLE_ATO_GST_REFUND: strings.categories.atoGstRefund,
  NON_TAXABLE_ERRONEOUS_PAYMENT_OUT: strings.categories.erroneousPaymentOut,
  NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN: strings.categories.erroneousPaymentReturn,
  NON_TAXABLE_DIRECTOR_REIMBURSEMENT: strings.categories.directorReimbursementPriorPeriod,
  TRANSFER_INTERNAL: strings.categories.internalTransfer,
  TRANSFER_PARTNERSHIP_TO_COMPANY: strings.categories.internalTransfer,
  UNCATEGORIZED: strings.categories.uncategorized,

  // Legacy
  INCOME_SALES: strings.categories.incomeSales,
  INCOME_CASH_DEPOSIT_REVIEW: strings.categories.nonTaxableCashDeposit,
  EXPENSE_UTILITIES: strings.categories.expenseUtilitiesPhone,
  EXPENSE_STICKER_PRODUCTION: 'Sticker Production',
}

/** Display label for History and Cash Expense (same map). */
export function getTransactionCategoryLabel(category?: string): string {
  if (!category) return strings.categories.uncategorized
  return CATEGORY_LABELS[category] || category
}

/** @deprecated Use getTransactionCategoryLabel — kept for existing imports. */
export function getCashExpenseCategoryLabel(category: string): string {
  return getTransactionCategoryLabel(category)
}
