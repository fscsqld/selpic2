/**
 * AI 분류기 엔진
 */

import { AIClassifier, ClassificationResult } from './types'
import { BankTransaction } from '../pdf-parser/types'
import { OpenAIClassifier } from './openai-classifier'

export class AIClassifierEngine {
  private classifier: AIClassifier | null = null

  /**
   * OpenAI 분류기 설정
   */
  setOpenAIClassifier(apiKey: string): void {
    const openaiClassifier = new OpenAIClassifier()
    openaiClassifier.setApiKey(apiKey)
    this.classifier = openaiClassifier
  }

  /**
   * 거래 내역 분류
   * @param transaction - Bank transaction to classify
   * @param context - Optional context from previous transactions
   * @param useComplexModel - If true, use gpt-4o for complex analysis, otherwise gpt-4o-mini
   */
  async classify(
    transaction: BankTransaction,
    context?: string[],
    useComplexModel: boolean = false
  ): Promise<ClassificationResult> {
    if (!this.classifier) {
      throw new Error('AI classifier is not configured. Please set your API key.')
    }

    // Cast to OpenAIClassifier to access classify with useComplexModel
    if (this.classifier instanceof OpenAIClassifier) {
      return await this.classifier.classify(transaction, context, useComplexModel)
    }

    return await this.classifier.classify(transaction, context)
  }

  /**
   * 여러 거래 내역 일괄 분류
   */
  async classifyBatch(
    transactions: BankTransaction[]
  ): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>()

    for (const transaction of transactions) {
      try {
        const result = await this.classify(transaction)
        results.set(transaction.reference || transaction.date, result)
      } catch (error) {
        console.error(`Failed to classify transaction: ${transaction.description}`, error)
      }
    }

    return results
  }
}

