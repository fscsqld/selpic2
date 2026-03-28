/**
 * FBT (Fringe Benefits Tax) 감지 엔진
 * 
 * AI를 사용하여 거래 내역에서 FBT 대상 여부를 감지하고 분류합니다.
 */

import { OpenAI } from 'openai'
import { BankTransaction } from '@/lib/pdf-parser/types'
import { FBTDetectionResult, FBTCategory, FBTRisk } from './types'

export class FBTDetector {
  private openai: OpenAI | null = null

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey })
    }
  }

  /**
   * AI를 사용하여 FBT 대상 거래 감지
   */
  async detectFBT(
    transaction: BankTransaction,
    category?: string,
    apiKey?: string
  ): Promise<FBTDetectionResult | null> {
    // API Key가 제공되면 새로 생성
    if (apiKey && !this.openai) {
      this.openai = new OpenAI({ apiKey })
    }

    // FBT 관련 카테고리가 아니면 null 반환 (성능 최적화)
    if (!this.isFBTRelevantCategory(category)) {
      return null
    }

    if (!this.openai) {
      // API Key가 없으면 기본값 반환 (FBT 관련 없음)
      return {
        isFBTRelevant: false,
        isFBTReportable: false,
        confidence: 0.5,
        reasoning: 'API Key not available'
      }
    }

    const prompt = this.buildFBTDetectionPrompt(transaction, category)
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Australian FBT (Fringe Benefits Tax) regulations. Analyze bank transactions and determine if they could be FBT reportable benefits provided to employees. Respond in JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })

      const aiResponse = response.choices[0]?.message?.content || ''
      
      // Log API usage for cost tracking
      if (response.usage && typeof window !== 'undefined') {
        try {
          const model = 'gpt-4o-mini'
          const inputPricePer1M = 0.15
          const outputPricePer1M = 0.60
          
          const promptTokens = response.usage.prompt_tokens || 0
          const completionTokens = response.usage.completion_tokens || 0
          const totalTokens = response.usage.total_tokens || 0
          
          const estimatedCost = 
            (promptTokens / 1_000_000) * inputPricePer1M +
            (completionTokens / 1_000_000) * outputPricePer1M

          // Log to IndexedDB (async, don't wait)
          import('@/lib/storage/indexed-db').then(({ indexedDBStorage }) => {
            indexedDBStorage.logApiUsage({
              model,
              promptTokens,
              completionTokens,
              totalTokens,
              estimatedCost,
              apiKeyType: 'user'
            }).catch(err => console.error('[FBT-DETECTOR] Failed to log API usage:', err))
          })
        } catch (err) {
          console.error('[FBT-DETECTOR] Error logging usage:', err)
        }
      }
      
      return this.parseFBTResponse(transaction, aiResponse)
    } catch (error) {
      console.error('[FBT-DETECTOR] AI detection failed:', error)
      return {
        isFBTRelevant: false,
        isFBTReportable: false,
        confidence: 0.5,
        reasoning: 'AI detection failed'
      }
    }
  }

  /**
   * FBT 관련 카테고리인지 확인 (성능 최적화)
   */
  private isFBTRelevantCategory(category?: string): boolean {
    if (!category) return false
    
    const fbtCategories = [
      'EXPENSE_MEALS_ENTERTAINMENT',
      'EXPENSE_TRAVEL_ACCOMMODATION',
      'EXPENSE_MOTOR_VEHICLE',
      'EXPENSE_FUEL_TRAVEL',
      'EXPENSE_OFFICE_SUPPLIES', // 일부 경우 (예: 직원 선물)
      'EXPENSE_MARKETING', // 일부 경우 (예: 직원 이벤트)
    ]
    
    return fbtCategories.includes(category)
  }

  /**
   * FBT 감지 프롬프트 생성
   */
  private buildFBTDetectionPrompt(
    transaction: BankTransaction,
    category?: string
  ): string {
    const amount = Math.abs(transaction.debit || transaction.credit || 0)
    const amountStr = transaction.debit 
      ? `-$${amount.toFixed(2)}` 
      : `+$${amount.toFixed(2)}`

    return `Analyze the following Australian bank transaction for FBT (Fringe Benefits Tax) implications.

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${amountStr}
- Category: ${category || 'UNCATEGORIZED'}

Australian FBT Rules:
FBT applies to benefits provided to employees (not contractors or external parties):
- Meals & Entertainment: Business meals, client entertainment, employee meals (if over $300, high risk)
- Travel: ONLY private portion of employee travel is FBT reportable. Business travel is EXEMPT from FBT.
- Vehicle: Company car for private use by employees
- Other: Gifts, memberships, subscriptions provided to employees

FBT Exemptions:
- Minor benefits (< $300 per item, per employee per year)
- Work-related travel (business travel is EXEMPT - only private portion is FBT reportable)
- Certain meal expenses (if conditions met - minor, infrequent, not entertainment)
- Benefits provided to contractors (not employees)

IMPORTANT for Travel:
- If the travel is primarily for business purposes, set isFBTReportable to FALSE
- Only set isFBTReportable to TRUE if there is a private portion or the travel is primarily for employee benefit
- Business conferences, client meetings, and work-related travel are NOT FBT reportable

FBT Risk Levels:
- Low: Under $200, clearly business-related, not employee benefit, minor benefits
- Medium: $200-$500, may be employee benefit, requires review, entertainment $200-$300
- High: Entertainment expenses over $300, any transaction over $500, luxury items, likely FBT reportable employee benefit

Instructions:
1. Determine if this transaction could be an employee benefit (not contractor or business expense)
2. Classify FBT category: 'meal', 'entertainment', 'travel', 'vehicle', or 'other'
3. Assess FBT risk: 'low', 'medium', or 'high'
4. Determine if FBT reportable (consider exemptions and amount thresholds)

Respond in JSON format:
{
  "isFBTRelevant": true/false,
  "fbtCategory": "meal" | "entertainment" | "travel" | "vehicle" | "other" (only if isFBTRelevant is true),
  "fbtRisk": "low" | "medium" | "high" (only if isFBTRelevant is true),
  "isFBTReportable": true/false,
  "reasoning": "Brief explanation",
  "confidence": 0.0-1.0
}`
  }

  /**
   * AI 응답 파싱
   */
  private parseFBTResponse(
    transaction: BankTransaction,
    aiResponse: string
  ): FBTDetectionResult {
    try {
      const parsed = JSON.parse(aiResponse)
      const amount = Math.abs(transaction.debit || transaction.credit || 0)
      
      const isFBTRelevant = parsed.isFBTRelevant === true
      const fbtCategory = parsed.fbtCategory as FBTCategory | undefined
      const fbtRisk = parsed.fbtRisk as FBTRisk | undefined
      const isFBTReportable = parsed.isFBTReportable === true
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.7
      const reasoning = parsed.reasoning || 'AI analysis'

      // FBT 금액 계산 (FBT rate: 47% of grossed-up value)
      // 단순화: FBT = amount * 0.47 (실제로는 더 복잡한 계산 - Type 1 vs Type 2)
      // Type 1 (GST inclusive): FBT = amount * 2.0802 * 0.47
      // Type 2 (GST free): FBT = amount * 1.8868 * 0.47
      // 여기서는 Type 1을 가정 (대부분의 경우)
      let fbtAmount: number | undefined
      if (isFBTReportable && amount > 0) {
        // Type 1 FBT calculation (GST inclusive)
        const grossedUpValue = amount * 2.0802
        fbtAmount = Math.round(grossedUpValue * 0.47 * 100) / 100
      }

      return {
        isFBTRelevant,
        fbtCategory: isFBTRelevant ? (fbtCategory || 'other') : undefined,
        fbtRisk: isFBTRelevant ? (fbtRisk || 'low') : undefined,
        isFBTReportable,
        fbtAmount,
        reasoning,
        confidence
      }
    } catch (error) {
      console.error('[FBT-DETECTOR] Failed to parse AI response:', error)
      return {
        isFBTRelevant: false,
        isFBTReportable: false,
        confidence: 0.5,
        reasoning: 'Failed to parse AI response'
      }
    }
  }
}
