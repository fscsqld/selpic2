'use client'

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils/currency-format'
import { strings } from '@/lib/i18n/strings'
import { filterPlExpenseDebits } from '@/lib/utils/business-calculations'
import { isCompanyBusinessDepartment } from '@/lib/classification/company-account'

interface ExpenseChartsProps {
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    department?: string
    source?: 'bank' | 'manual'
  }>
  onCategoryClick?: (category: string | null) => void
  selectedCategory?: string | null
  accountType?: 'individual' | 'company' | 'sole_trader'
}

// Categories excluded from expense charts (transfers, erroneous payments — not P&L)
const NON_PL_TRANSFER_CATEGORIES = new Set([
  'TRANSFER_INTERNAL',
  'NON_TAXABLE_TRANSFER',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
  'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
  'NON_TAXABLE_ATO_GST_REFUND',
  'INCOME_REFUND_REIMBURSEMENT', // credit-side refunds only; never plot as expense category
  'LIABILITY_DIRECTORS_LOAN',
])

const COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Green
  '#FFBB28', // Yellow
  '#FF8042', // Orange
  '#8884D8', // Purple
  '#82CA9D', // Light Green
  '#FFC658', // Light Yellow
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#95E1D3', // Mint
  '#F38181', // Pink
  '#AA96DA', // Lavender
  '#FCBAD3', // Light Pink
  '#A8DADC', // Sky Blue
  '#FFD93D', // Gold
  '#6BCB77', // Emerald
]

// Get category display name
function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    'INCOME_SALES_CLEANING': 'Trading Revenue',
    'INCOME_SALES_STICKER': 'Trading Revenue',
    'NON_TAXABLE_CASH_DEPOSIT': strings.categories.nonTaxableCashDeposit,
    'LIABILITY_DIRECTORS_LOAN': strings.categories.liabilityDirectorsLoan,
    'EXPENSE_STARTUP_INCORPORATION': strings.categories.expenseStartup,
    'EXPENSE_STARTUP_DOMAIN': strings.categories.expenseStartup,
    'EXPENSE_STARTUP_SAMPLE': strings.categories.expenseStartup,
    'EXPENSE_FUEL_TRAVEL': strings.categories.expenseFuelTravel,
    'EXPENSE_MOTOR_VEHICLE': strings.categories.expenseMotorVehicle,
    'EXPENSE_TRAVEL_ACCOMMODATION': strings.categories.expenseTravelAccommodation,
    'EXPENSE_MEALS_ENTERTAINMENT': strings.categories.expenseMealsEntertainment,
    'EXPENSE_INSURANCE_PROFESSIONAL': strings.categories.expenseInsuranceProfessional,
    'EXPENSE_CLEANING_SUPPLIES': strings.categories.expenseCleaningSupplies,
    'EXPENSE_UTILITIES_PHONE': strings.categories.expenseUtilitiesPhone,
    'EXPENSE_CLEANING_SUBCONTRACTOR': strings.categories.expenseSubcontractor,
    'EXPENSE_REPAIRS_MAINTENANCE': strings.categories.expenseRepairsMaintenance,
    'EXPENSE_OFFICE_EQUIPMENT': strings.categories.expenseOfficeEquipment,
    'EXPENSE_OFFICE_SUPPLIES': strings.categories.expenseOffice,
    'EXPENSE_SOFTWARE_SUBSCRIPTIONS': strings.categories.expenseSoftwareSubscriptions,
    'EXPENSE_BANK_FEES_INTEREST': strings.categories.expenseBankFeesInterest,
    'EXPENSE_RENT': strings.categories.expenseRent,
    'EXPENSE_MARKETING': strings.categories.expenseMarketing,
    'EXPENSE_MERCHANT_FEES': strings.categories.expenseMerchantFees,
    'EXPENSE_WAGES_SALARIES': strings.categories.expenseWagesSalaries,
    'EXPENSE_SUPERANNUATION': strings.categories.expenseSuperannuation,
    'EXPENSE_ATO_GST_BAS': strings.categories.expenseATOGSTBAS,
    'EXPENSE_ATO_PAYG_WITHHOLDING': strings.categories.expenseATOPAYGWithholding,
    'EXPENSE_COMPANY_INCOME_TAX': strings.categories.expenseCompanyIncomeTax,
    'EXPENSE_WORKERS_COMPENSATION': strings.categories.expenseWorkersCompensation,
    'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES': strings.categories.expenseAccountingProfessionalFees,
    'EXPENSE_DIRECTOR_LOAN_REPAYMENT': strings.categories.expenseDirectorLoanRepayment,
    'EXPENSE_DIVIDENDS_PAID': strings.categories.expenseDividendsPaid,
    'EXPENSE_DIRECTORS_FEES': strings.categories.expenseDirectorsFees,
    'CASH_EXPENSE_PETTY': strings.categories.cashExpensePetty,
    'NON_TAXABLE_TRANSFER': strings.categories.internalTransfer,
    'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT': strings.categories.erroneousPaymentOut,
    'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN': strings.categories.erroneousPaymentReturn,
    'NON_TAXABLE_DIRECTOR_REIMBURSEMENT': strings.categories.directorReimbursementPriorPeriod,
    'UNCATEGORIZED': strings.categories.uncategorized,
  }
  return categoryMap[category] || category
}

export function ExpenseCharts({ transactions, onCategoryClick, selectedCategory, accountType = 'company' }: ExpenseChartsProps) {
  // State for hovered pie slice
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Calculate category-wise expenses (only debit transactions)
  const categoryExpenses = useMemo(() => {
    const categoryMap = new Map<string, number>()
    
    transactions
      .filter(tx => {
        // For individual users, include all debit expenses except non-P&L transfers
        if (accountType === 'individual') {
          return (
            tx.debit &&
            tx.category &&
            tx.category.startsWith('EXPENSE_') &&
            !NON_PL_TRANSFER_CATEGORIES.has(tx.category || '')
          )
        }
        // Company/sole trader: business EXPENSE_* only (include general — same as P&L metrics)
        const isBusiness = isCompanyBusinessDepartment(tx.department, accountType)

        return (
          !!tx.debit &&
          isBusiness &&
          !!tx.category &&
          tx.category.startsWith('EXPENSE_') &&
          !NON_PL_TRANSFER_CATEGORIES.has(tx.category || '')
        )
      })
      .forEach(tx => {
        const category = tx.category || 'UNCATEGORIZED'
        const amount = Math.abs(tx.debit || 0)
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount)
      })
    
    return Array.from(categoryMap.entries())
      .map(([category, value]) => ({
        category,
        value,
        name: getCategoryDisplayName(category),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 categories
  }, [transactions, accountType])

  // Calculate bank vs cash expenses
  const sourceComparison = useMemo(() => {
    const bankExpenses = transactions
      .filter(tx => {
        // For individual users, include all transactions
        // For company/sole trader, filter by business department
        if (accountType === 'individual') {
          return tx.debit && 
                 (tx.source === 'bank' || !tx.source) && // Default to bank if source not specified
                 tx.category &&
                 !NON_PL_TRANSFER_CATEGORIES.has(tx.category || '')
        } else {
          const isBusiness = isCompanyBusinessDepartment(tx.department, accountType)
          
          return tx.debit && 
                 isBusiness &&
                 (tx.source === 'bank' || !tx.source) && // Default to bank if source not specified
                 !!tx.category &&
                 tx.category.startsWith('EXPENSE_') &&
                 !NON_PL_TRANSFER_CATEGORIES.has(tx.category || '')
        }
      })
      .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
    
    const cashExpenses = transactions
      .filter(tx => {
        // For individual users, include all transactions
        // For company/sole trader, filter by business department
        if (accountType === 'individual') {
          return tx.debit && 
                 tx.source === 'manual' &&
                 tx.category &&
                 !NON_PL_TRANSFER_CATEGORIES.has(tx.category || '')
        } else {
          const isBusiness = isCompanyBusinessDepartment(tx.department, accountType)
          
          return tx.debit && 
                 isBusiness &&
                 tx.source === 'manual' &&
                 !!tx.category &&
                 tx.category.startsWith('EXPENSE_') &&
                 !NON_PL_TRANSFER_CATEGORIES.has(tx.category || '')
        }
      })
      .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
    
    return [
      { name: 'Bank Expenses', value: bankExpenses, color: '#0088FE' },
      { name: 'Cash Expenses', value: cashExpenses, color: '#00C49F' },
    ]
  }, [transactions, accountType])


  const handlePieClick = (data: any) => {
    if (onCategoryClick && data) {
      const clickedCategory = data.category
      // Toggle: if same category clicked, reset filter
      if (selectedCategory === clickedCategory) {
        onCategoryClick(null)
      } else {
        onCategoryClick(clickedCategory)
      }
    }
  }

  const totalExpenses = categoryExpenses.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Pie Chart - Category-wise Expenses */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
        {categoryExpenses.length > 0 ? (
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryExpenses}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={activeIndex !== null ? (({ name, percent }: any) => `${name}: ${(((percent ?? 0) as number) * 100).toFixed(1)}%`) : false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {categoryExpenses.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke={selectedCategory === entry.category ? '#000' : 'none'}
                      strokeWidth={selectedCategory === entry.category ? 3 : 0}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | undefined, _name: string | undefined, props: any) => {
                    const safeValue = value ?? 0
                    const percent = ((safeValue / totalExpenses) * 100).toFixed(1)
                    return [
                      `${formatCurrency(safeValue)} (${percent}%)`,
                      props.payload.name
                    ]
                  }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}
                />
                <Legend
                  formatter={(value, entry: any) => {
                    const item = categoryExpenses.find(c => c.category === entry.payload.category)
                    return `${value} (${formatCurrency(item?.value || 0)})`
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {selectedCategory && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Filtered:</strong> {getCategoryDisplayName(selectedCategory)}
                  <button
                    onClick={() => onCategoryClick?.(null)}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear filter
                  </button>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No expense data available</p>
          </div>
        )}
      </div>

      {/* Bar Chart - Bank vs Cash Expenses */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Bank vs Cash Expenses</h3>
        {sourceComparison.some(item => item.value > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <Legend />
              <Bar dataKey="value" fill="#8884d8">
                {sourceComparison.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No expense data available</p>
          </div>
        )}
      </div>
    </div>
  )
}
