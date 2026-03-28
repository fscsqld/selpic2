/**
 * GST 포함 여부 AI 판별 엔진
 */

import { OpenAI } from 'openai'
import { BankTransaction } from '@/lib/pdf-parser/types'
import { GSTDetectionResult, GSTType, TransactionType } from './types'

export class GSTDetector {
  private openai: OpenAI | null = null

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey })
    }
  }

  /**
   * AI를 사용하여 거래 내역에서 GST 포함 여부 판별
   */
  async detectGST(
    transaction: BankTransaction,
    category?: string,
    apiKey?: string
  ): Promise<GSTDetectionResult> {
    // API Key가 제공되면 새로 생성
    if (apiKey && !this.openai) {
      this.openai = new OpenAI({ apiKey })
    }

    if (!this.openai) {
      // API Key가 없으면 기본값 반환 (GST 포함 가정)
      return this.getDefaultResult(transaction)
    }

    const prompt = this.buildGSTDetectionPrompt(transaction, category)
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Australian GST (Goods and Services Tax) regulations. Analyze bank transactions and determine if GST is included, excluded, or if the transaction is GST-free. Respond in JSON format only.'
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
            }).catch(err => console.error('[GST-DETECTOR] Failed to log API usage:', err))
          })
        } catch (err) {
          console.error('[GST-DETECTOR] Error logging usage:', err)
        }
      }
      
      return this.parseGSTResponse(transaction, aiResponse)
    } catch (error) {
      console.error('[GST-DETECTOR] AI detection failed:', error)
      return this.getDefaultResult(transaction)
    }
  }

  /**
   * GST 감지 프롬프트 생성
   */
  private buildGSTDetectionPrompt(
    transaction: BankTransaction,
    category?: string
  ): string {
    const amount = transaction.debit || transaction.credit || 0
    const amountStr = transaction.debit 
      ? `-$${Math.abs(transaction.debit).toFixed(2)}` 
      : `+$${Math.abs(transaction.credit || 0).toFixed(2)}`

    return `Analyze the following Australian bank transaction and determine if GST (Goods and Services Tax) is included.

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${amountStr}
- Category: ${category || 'UNCATEGORIZED'}

Australian GST Rules:
- GST rate is 10%
- GST registered businesses must include GST in prices for sales
- Most business purchases from GST registered suppliers include GST
- GST-free items include:
  * Most basic food items
  * Medical services and medicines
  * Educational courses
  * Financial services (most cases)
  * Residential rent (if not commercial)
  * Wages and salaries
  * Interest income
  * Government charges (some)

Instructions:
1. Analyze the transaction description for GST indicators
2. Check if the amount suggests GST inclusion (e.g., $110 = $100 + $10 GST)
3. Determine transaction type: 'sale' (income), 'purchase' (business expense), or 'expense' (operating expense)
4. Classify GST status:
   - INCLUDED: GST is included in the amount (most business transactions)
   - EXCLUDED: GST is not included (wages, interest, some services)
   - FREE: Transaction is GST-free (medical, education, basic food)

Respond in JSON format:
{
  "gstIncluded": true/false,
  "gstType": "INCLUDED" | "EXCLUDED" | "FREE",
  "transactionType": "sale" | "purchase" | "expense",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`
  }

  /**
   * AI 응답 파싱
   */
  private parseGSTResponse(
    transaction: BankTransaction,
    aiResponse: string
  ): GSTDetectionResult {
    const amount = Math.abs(transaction.debit || transaction.credit || 0)
    
    try {
      // JSON 파싱 시도
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const isGSTIncluded = parsed.gstIncluded === true || parsed.gstType === 'INCLUDED'
        const gstType = (parsed.gstType || (isGSTIncluded ? 'INCLUDED' : 'EXCLUDED')) as GSTType
        
        let gstAmount = 0
        let netAmount = amount

        if (isGSTIncluded && gstType === 'INCLUDED') {
          // GST 포함 금액에서 GST 계산: amount / 11 * 1 (10% GST)
          gstAmount = Math.round((amount / 11) * 100) / 100
          netAmount = Math.round((amount - gstAmount) * 100) / 100
        }

        return {
          isGSTIncluded,
          gstType,
          gstAmount,
          netAmount,
          transactionType: (parsed.transactionType || 'expense') as TransactionType,
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning
        }
      }
    } catch (error) {
      console.error('[GST-DETECTOR] Failed to parse JSON:', error)
    }

    // JSON 파싱 실패 시 텍스트 기반 파싱
    const isGSTIncluded = /GST.*INCLUDED|gstIncluded.*true/i.test(aiResponse)
    const gstTypeMatch = aiResponse.match(/gstType["\s:]+(INCLUDED|EXCLUDED|FREE)/i)
    const gstType = (gstTypeMatch?.[1] || (isGSTIncluded ? 'INCLUDED' : 'EXCLUDED')) as GSTType
    
    let gstAmount = 0
    let netAmount = amount

    if (isGSTIncluded && gstType === 'INCLUDED') {
      gstAmount = Math.round((amount / 11) * 100) / 100
      netAmount = Math.round((amount - gstAmount) * 100) / 100
    }

    return {
      isGSTIncluded,
      gstType,
      gstAmount,
      netAmount,
      transactionType: /sale|income/i.test(aiResponse) ? 'sale' : 
                      /purchase|buy/i.test(aiResponse) ? 'purchase' : 'expense',
      confidence: 0.7,
      reasoning: 'Parsed from text response'
    }
  }

  /**
   * 기본값 반환 (API Key 없을 때)
   */
  private getDefaultResult(transaction: BankTransaction): GSTDetectionResult {
    const amount = Math.abs(transaction.debit || transaction.credit || 0)
    // 기본적으로 GST 포함 가정 (기존 로직과 동일)
    const gstAmount = Math.round((amount / 11) * 100) / 100
    const netAmount = Math.round((amount - gstAmount) * 100) / 100

    return {
      isGSTIncluded: true,
      gstType: 'INCLUDED',
      gstAmount,
      netAmount,
      transactionType: transaction.credit ? 'sale' : 'expense',
      confidence: 0.5,
      reasoning: 'Default assumption (GST included)'
    }
  }
}

// Export singleton instance
export const gstDetector = new GSTDetector()
