/**
 * 부문별 분류 시스템
 * 
 * Cleaning 사업부와 Sticker 사업부를 구분하는 AI 기반 분류기
 */

import { BankTransaction, DepartmentType } from '../pdf-parser/types'

export interface DepartmentClassification {
  department: DepartmentType
  confidence: number
  reason: string
  keywords?: string[]
}

export class DepartmentClassifier {
  /**
   * 거래 내역을 분석하여 사업부 분류
   */
  async classifyDepartment(
    transaction: BankTransaction,
    context?: string[]
  ): Promise<DepartmentClassification> {
    const prompt = this.buildClassificationPrompt(transaction, context)
    const response = await this.callOpenAI(prompt)
    
    return this.parseResponse(response)
  }

  /**
   * 부문 분류 프롬프트 생성
   */
  private buildClassificationPrompt(
    transaction: BankTransaction,
    context?: string[]
  ): string {
    return `Analyze the following bank transaction for SELPIC PTY LTD and determine which department it belongs to.

**Business Context:**
SELPIC PTY LTD operates two departments:
1. **Cleaning Department**: Commercial cleaning services, subcontractor payments, TPAR reporting
2. **Sticker Department**: E-commerce sticker sales, product production, online marketing

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`}
- Reference: ${transaction.reference || 'N/A'}

**Cleaning Department Indicators:**
- Keywords: "cleaning", "subcontractor", "TPAR", "commercial", "service", "contractor"
- Transaction patterns: Regular payments to individuals (subcontractors)
- Amount patterns: Typically $500-$5000 per transaction
- Description patterns: "PAYMENT TO [NAME]", "SUBCONTRACTOR", "CLEANING SERVICE"

**Sticker Department Indicators:**
- Keywords: "sticker", "product", "e-commerce", "shop", "order", "production", "sample"
- Transaction patterns: Production costs, marketing expenses, domain, website
- Amount patterns: Variable (small for samples, larger for production)
- Description patterns: "PRODUCTION", "MARKETING", "DOMAIN", "WEBSITE", "SAMPLE"

**Instructions:**
1. Analyze transaction description for department-specific keywords
2. Consider transaction amount and pattern
3. Check reference number for clues
4. Classify as 'cleaning', 'sticker', 'general', or 'unknown'

Respond in the following format:
DEPARTMENT: [cleaning/sticker/general/unknown]
CONFIDENCE: [0.0-1.0]
KEYWORDS: [comma-separated keywords found]
REASON: [Brief explanation]`
  }

  private async callOpenAI(prompt: string): Promise<string> {
    // OpenAI API 호출 (실제 구현 시)
    // 여기서는 프롬프트만 반환
    return prompt
  }

  private parseResponse(response: string): DepartmentClassification {
    const departmentMatch = response.match(/DEPARTMENT:\s*(\w+)/i)
    const confidenceMatch = response.match(/CONFIDENCE:\s*([\d.]+)/i)
    const keywordsMatch = response.match(/KEYWORDS:\s*(.+)/i)
    const reasonMatch = response.match(/REASON:\s*(.+)/i)

    const department = (departmentMatch?.[1] || 'unknown') as DepartmentType
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5
    const keywords = keywordsMatch?.[1].split(',').map(k => k.trim())
    const reason = reasonMatch?.[1] || 'No specific reason provided'

    return {
      department,
      confidence,
      reason,
      keywords,
    }
  }

  /**
   * 간단한 키워드 기반 분류 (AI 보조)
   */
  classifyByKeywords(description: string): DepartmentType {
    const cleaningKeywords = [
      'cleaning', 'subcontractor', 'tpar', 'commercial', 'service',
      'contractor', 'payment to', 'cleaning service'
    ]
    
    const stickerKeywords = [
      'sticker', 'product', 'e-commerce', 'shop', 'order',
      'production', 'sample', 'domain', 'website', 'marketing'
    ]

    const lowerDesc = description.toLowerCase()

    const cleaningMatches = cleaningKeywords.filter(kw => lowerDesc.includes(kw)).length
    const stickerMatches = stickerKeywords.filter(kw => lowerDesc.includes(kw)).length

    if (cleaningMatches > stickerMatches && cleaningMatches > 0) {
      return 'cleaning'
    }
    if (stickerMatches > cleaningMatches && stickerMatches > 0) {
      return 'sticker'
    }
    if (cleaningMatches === 0 && stickerMatches === 0) {
      return 'unknown'
    }

    return 'general'
  }
}

