/**
 * Classify parsed bank transactions without OpenAI (rules + user mappings).
 */

import type { BankTransaction } from '@/lib/pdf-parser/types'
import type { UserMapping } from '@/lib/storage/user-mappings'
import {
  buildGstInfoForRules,
  classifyWithRules,
  type RulesAccountType,
} from '@/lib/ai-classifier/rule-based-classifier'

export type ClassifiedBankTransaction = BankTransaction & {
  id?: string
  category?: string
  confidence?: number
  department?: string
  isDirectorsLoan?: boolean
  isPreTradingExpense?: boolean
  requiresPAYG?: boolean
  isPayrollTransaction?: boolean
  gstInfo?: ReturnType<typeof buildGstInfoForRules>
  fbtInfo?: {
    isFBTRelevant: boolean
    fbtRisk: 'low' | 'medium' | 'high'
    isFBTReportable: boolean
    reasoning: string
    confidence: number
  }
  capitalImprovementWarning?: boolean
}

export function classifyTransactionsRulesOnly(
  transactions: BankTransaction[],
  accountType: RulesAccountType,
  userMappings: UserMapping[] = [],
  _directorName?: string
): ClassifiedBankTransaction[] {
  const results: ClassifiedBankTransaction[] = []
  const seen = new Set<string>()

  transactions.forEach((transaction, index) => {
    const transactionId =
      transaction.reference ||
      `${transaction.date}_${transaction.description}_${transaction.debit || transaction.credit}`
    if (seen.has(transactionId)) return
    seen.add(transactionId)

    const classification = classifyWithRules(transaction, accountType, userMappings)
    const isBusiness = accountType !== 'individual'

    results.push({
      ...transaction,
      id: transaction.reference || `tx_${Date.now()}_${index}`,
      category: classification.category,
      confidence: classification.confidence,
      department: classification.department as ClassifiedBankTransaction['department'],
      isDirectorsLoan: false,
      isPreTradingExpense: false,
      requiresPAYG: false,
      isPayrollTransaction: false,
      gstInfo: buildGstInfoForRules(transaction, accountType, classification.category),
      fbtInfo: {
        isFBTRelevant: false,
        fbtRisk: 'low',
        isFBTReportable: false,
        reasoning: isBusiness
          ? 'FBT not detected in rules-only mode — review entertainment and vehicle expenses'
          : 'Individual: FBT not applicable',
        confidence: 1,
      },
      capitalImprovementWarning: false,
    })
  })

  return results
}

type ParsedStatementLike = {
  bankName?: string
  accountNumber?: string
  period?: { startDate?: string; endDate?: string } | string
  statementPeriod?: { startDate?: string; endDate?: string } | string
  startDate?: string
  endDate?: string
  openingBalance?: number
  closingBalance?: number
}

/**
 * Mirror the AI analyze response shape with zero API usage (rules-only path).
 */
export function buildRulesOnlyAnalyzeResponse(
  parsedStatement: ParsedStatementLike,
  classifiedTransactions: ClassifiedBankTransaction[]
) {
  const rawPeriod = parsedStatement.statementPeriod ?? parsedStatement.period
  const period =
    typeof rawPeriod === 'object' && rawPeriod
      ? {
          startDate: rawPeriod.startDate || parsedStatement.startDate || '',
          endDate: rawPeriod.endDate || parsedStatement.endDate || '',
        }
      : {
          startDate: parsedStatement.startDate || '',
          endDate: parsedStatement.endDate || '',
        }

  return {
    success: true,
    classificationMode: 'rules_only' as const,
    statement: {
      bankName: parsedStatement.bankName || 'Unknown',
      accountNumber: parsedStatement.accountNumber || '',
      period,
      openingBalance: parsedStatement.openingBalance || 0,
      closingBalance: parsedStatement.closingBalance || 0,
    },
    transactions: classifiedTransactions,
    summary: {
      totalTransactions: classifiedTransactions.length,
      classifiedCount: classifiedTransactions.filter((tx) => tx.category !== 'UNCATEGORIZED').length,
      directorsLoanCount: classifiedTransactions.filter((tx) => tx.isDirectorsLoan).length,
      preTradingExpenseCount: classifiedTransactions.filter((tx) => tx.isPreTradingExpense).length,
    },
    apiUsage: {
      totalCalls: 0,
      totalCost: 0,
      totalTokens: 0,
      byModel: {},
      usageLogs: [],
    },
  }
}
