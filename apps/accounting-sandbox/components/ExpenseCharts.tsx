'use client'

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils/currency-format'
import { strings } from '@/lib/i18n/strings'

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

// Color palette for pie chart
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
    'EXPENSE_RENT': strings.categories.expenseRent,
    'EXPENSE_MARKETING': strings.categories.expenseMarketing,
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
        // For individual users, include all transactions
        // For company/sole trader, filter by business department
        if (accountType === 'individual') {
          return tx.debit && 
                 tx.category &&
                 tx.category !== 'TRANSFER_INTERNAL' &&
                 tx.category !== 'NON_TAXABLE_TRANSFER'
        } else {
          // Include all business transactions (exclude personal)
          const isBusiness = tx.department !== 'personal' && 
                            tx.department !== 'unknown' &&
                            (tx.department === 'cleaning' || 
                             tx.department === 'sticker' || 
                             !tx.department) // Include transactions without department as business
          
          return tx.debit && 
                 isBusiness &&
                 tx.category &&
                 tx.category !== 'TRANSFER_INTERNAL' &&
                 tx.category !== 'NON_TAXABLE_TRANSFER'
        }
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
                 tx.category !== 'TRANSFER_INTERNAL' &&
                 tx.category !== 'NON_TAXABLE_TRANSFER'
        } else {
          const isBusiness = tx.department !== 'personal' && 
                            tx.department !== 'unknown' &&
                            (tx.department === 'cleaning' || 
                             tx.department === 'sticker' || 
                             !tx.department) // Include transactions without department as business
          
          return tx.debit && 
                 isBusiness &&
                 (tx.source === 'bank' || !tx.source) && // Default to bank if source not specified
                 tx.category &&
                 tx.category !== 'TRANSFER_INTERNAL' &&
                 tx.category !== 'NON_TAXABLE_TRANSFER'
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
                 tx.category !== 'TRANSFER_INTERNAL' &&
                 tx.category !== 'NON_TAXABLE_TRANSFER'
        } else {
          const isBusiness = tx.department !== 'personal' && 
                            tx.department !== 'unknown' &&
                            (tx.department === 'cleaning' || 
                             tx.department === 'sticker' || 
                             !tx.department) // Include transactions without department as business
          
          return tx.debit && 
                 isBusiness &&
                 tx.source === 'manual' &&
                 tx.category &&
                 tx.category !== 'TRANSFER_INTERNAL' &&
                 tx.category !== 'NON_TAXABLE_TRANSFER'
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
                  label={activeIndex !== null ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%` : false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={{
                    outerRadius: 110,
                  }}
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
                  formatter={(value: number, name: string, props: any) => {
                    const percent = ((value / totalExpenses) * 100).toFixed(1)
                    return [
                      `${formatCurrency(value)} (${percent}%)`,
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
                formatter={(value: number) => formatCurrency(value)}
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
