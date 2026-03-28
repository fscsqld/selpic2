/**
 * Pre-trading Expenses 감지 시스템
 * 
 * 법인 설립 후 정식 운영 전(1-3월) 발생한 창업 비용을 감지하고 분류
 */

import { BankTransaction } from '../pdf-parser/types'

export interface PreTradingExpense {
  transactionId: string
  date: string
  description: string
  amount: number
  expenseType: 'incorporation' | 'domain' | 'sample-production' | 'setup' | 'other'
  canBeDeducted: boolean
  deductionDate?: string  // 공제 적용 예정일 (4월 이후)
  originalDate: string
}

export class PreTradingExpenseDetector {
  private companyRevenueStartDate: string = '2026-04-01'

  /**
   * Pre-trading Expense 감지
   */
  async detectPreTradingExpense(
    transaction: BankTransaction
  ): Promise<PreTradingExpense | null> {
    // Pre-revenue 기간 확인 (1-3월)
    const txDate = new Date(transaction.date)
    const revenueStartDate = new Date(this.companyRevenueStartDate)
    
    if (txDate >= revenueStartDate) {
      return null  // 정식 운영 시작 후에는 Pre-trading Expense 아님
    }

    const prompt = this.buildDetectionPrompt(transaction)
    const response = await this.callOpenAI(prompt)
    
    if (!this.isPreTradingExpense(response)) {
      return null
    }

    return this.parseResponse(transaction, response)
  }

  /**
   * Pre-trading Expense 감지 프롬프트
   */
  private buildDetectionPrompt(transaction: BankTransaction): string {
    return `Analyze the following bank transaction for SELPIC PTY LTD to determine if it is a Pre-trading Expense.

**Business Context:**
- Company incorporated: January 2026
- Pre-revenue period: January-March 2026 (no company revenue)
- Trading starts: April 2026
- Transaction date: ${transaction.date} (PRE-REVENUE PERIOD)

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`}
- Reference: ${transaction.reference || 'N/A'}

**Pre-trading Expense Types:**

1. **Incorporation Costs (EXPENSE_STARTUP_INCORPORATION)**:
   - Company incorporation fees ($611)
   - ASIC registration fees
   - Legal fees for incorporation

2. **Domain Costs (EXPENSE_STARTUP_DOMAIN)**:
   - Domain registration
   - Domain renewal
   - DNS setup

3. **Sample Production (EXPENSE_STARTUP_SAMPLE)**:
   - Sample product production
   - Prototype costs
   - Test printing

4. **Setup Costs (EXPENSE_STARTUP_SETUP)**:
   - Website setup
   - E-commerce platform setup
   - Initial marketing materials
   - Business card printing

**Instructions:**
1. Check if transaction is in pre-revenue period (Jan-Mar 2026)
2. Determine if it's a startup/establishment cost
3. Classify expense type
4. Note that these can be deducted when trading starts (April 2026+)

Respond in the following format:
IS_PRE_TRADING_EXPENSE: [true/false]
EXPENSE_TYPE: [incorporation/domain/sample-production/setup/other]
CAN_BE_DEDUCTED: [true/false]
REASON: [Brief explanation]`
  }

  private async callOpenAI(prompt: string): Promise<string> {
    // OpenAI API 호출 (실제 구현 시)
    return prompt
  }

  private isPreTradingExpense(response: string): boolean {
    return /IS_PRE_TRADING_EXPENSE:\s*true/i.test(response)
  }

  private parseResponse(
    transaction: BankTransaction,
    response: string
  ): PreTradingExpense {
    const amount = transaction.debit || transaction.credit || 0
    const expenseTypeMatch = response.match(/EXPENSE_TYPE:\s*(\w+)/i)
    const canBeDeductedMatch = response.match(/CAN_BE_DEDUCTED:\s*true/i)

    const expenseType = (expenseTypeMatch?.[1] || 'other') as PreTradingExpense['expenseType']
    const canBeDeducted = canBeDeductedMatch !== null

    return {
      transactionId: transaction.reference || '',
      date: transaction.date,
      description: transaction.description,
      amount: Math.abs(amount),
      expenseType,
      canBeDeducted,
      deductionDate: canBeDeducted ? this.companyRevenueStartDate : undefined,
      originalDate: transaction.date,
    }
  }
}

