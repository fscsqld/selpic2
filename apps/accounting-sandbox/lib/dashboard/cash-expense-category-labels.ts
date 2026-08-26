import { strings } from '@/lib/i18n/strings'

const CATEGORY_LABELS: Record<string, string> = {
  INCOME_SALES_CLEANING: 'Trading Revenue',
  INCOME_SALES_STICKER: 'Trading Revenue',
  NON_TAXABLE_CASH_DEPOSIT: strings.categories.nonTaxableCashDeposit,
  LIABILITY_DIRECTORS_LOAN: strings.categories.liabilityDirectorsLoan,
  EXPENSE_STARTUP_INCORPORATION: strings.categories.expenseStartup,
  EXPENSE_STARTUP_DOMAIN: strings.categories.expenseStartup,
  EXPENSE_STARTUP_SAMPLE: strings.categories.expenseStartup,
  EXPENSE_FUEL_TRAVEL: strings.categories.expenseFuelTravel,
  EXPENSE_MOTOR_VEHICLE: strings.categories.expenseMotorVehicle,
  EXPENSE_TRAVEL_ACCOMMODATION: strings.categories.expenseTravelAccommodation,
  EXPENSE_MEALS_ENTERTAINMENT: strings.categories.expenseMealsEntertainment,
  EXPENSE_INSURANCE_PROFESSIONAL: strings.categories.expenseInsuranceProfessional,
  EXPENSE_CLEANING_SUPPLIES: strings.categories.expenseCleaningSupplies,
  EXPENSE_UTILITIES_PHONE: strings.categories.expenseUtilitiesPhone,
  EXPENSE_CLEANING_SUBCONTRACTOR: strings.categories.expenseSubcontractor,
  EXPENSE_REPAIRS_MAINTENANCE: strings.categories.expenseRepairsMaintenance,
  EXPENSE_OFFICE_EQUIPMENT: strings.categories.expenseOfficeEquipment,
  EXPENSE_OFFICE_SUPPLIES: strings.categories.expenseOffice,
  EXPENSE_FREIGHT_SHIPPING: strings.categories.expenseFreightShipping,
  EXPENSE_RENT: strings.categories.expenseRent,
  EXPENSE_MARKETING: strings.categories.expenseMarketing,
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
  NON_TAXABLE_TRANSFER: strings.categories.internalTransfer,
  UNCATEGORIZED: strings.categories.uncategorized,
}

export function getCashExpenseCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category
}
