/**
 * Category Mapper - 모든 카테고리 매핑 로직 통합
 * 
 * 카테고리 코드를 표시명으로 변환하고, 
 * 카테고리 관련 유틸리티 함수를 제공합니다.
 */

import { TAX_CATEGORIES, TaxCategory, CATEGORY_GROUPS } from '../constants/tax-categories'

/**
 * 카테고리 코드를 표시명으로 변환
 * @param category - 카테고리 코드 (예: 'INCOME_SALES_CLEANING')
 * @returns 표시명 (예: 'Trading Revenue')
 */
export function getCategoryDisplayName(category: string): string {
  // Special mappings for specific categories
  if (category === 'INCOME_SALES_CLEANING') {
    return 'SALES & SERVICES'
  }
  
  // Use predefined mapping if available
  if (category in TAX_CATEGORIES) {
    return TAX_CATEGORIES[category as TaxCategory]
  }
  
  // Default: Remove prefix and replace underscores with spaces
  const cleaned = category
    .replace(/^(INCOME_|EXPENSE_|LIABILITY_|EQUITY_|TRANSFER_|NON_TAXABLE_)/, '')
    .replace(/_/g, ' ')
  
  // Capitalize first letter of each word
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * 문자열에서 카테고리 코드 추출
 * @param text - 카테고리 이름이 포함된 문자열
 * @returns 카테고리 코드 또는 null
 */
export function getCategoryFromString(text: string): TaxCategory | null {
  const upperText = text.toUpperCase().replace(/\s+/g, '_')
  
  // Try exact match first
  if (upperText in TAX_CATEGORIES) {
    return upperText as TaxCategory
  }
  
  // Try with prefixes
  const prefixes = ['INCOME_', 'EXPENSE_', 'LIABILITY_', 'EQUITY_', 'TRANSFER_', 'NON_TAXABLE_']
  for (const prefix of prefixes) {
    const fullCategory = prefix + upperText
    if (fullCategory in TAX_CATEGORIES) {
      return fullCategory as TaxCategory
    }
  }
  
  return null
}

/**
 * 세금 공제 가능 여부 확인
 * @param category - 카테고리 코드
 * @returns 세금 공제 가능 여부
 */
export function isTaxDeductible(category: string): boolean {
  // Personal transactions are never tax deductible
  if (category === 'UNCATEGORIZED' || category.startsWith('NON_TAXABLE_')) {
    return false
  }
  
  // Income categories are not deductible (they're taxable)
  if (category.startsWith('INCOME_')) {
    return false
  }
  
  // Equity and transfers are not deductible
  if (category.startsWith('EQUITY_') || category.startsWith('TRANSFER_')) {
    return false
  }
  
  // Expense categories are generally tax deductible
  if (category.startsWith('EXPENSE_')) {
    // Some expenses are not deductible
    const nonDeductibleExpenses = [
      'EXPENSE_DIRECTOR_LOAN_REPAYMENT', // Loan repayment is not deductible
    ]
    return !nonDeductibleExpenses.includes(category)
  }
  
  // Liability categories are not deductible
  if (category.startsWith('LIABILITY_')) {
    return false
  }
  
  return false
}

/**
 * 카테고리가 특정 그룹에 속하는지 확인
 * @param category - 카테고리 코드
 * @param group - 그룹 이름 ('INCOME', 'EXPENSES', 'TAX_COMPLIANCE', 'TRANSFERS_LOANS', 'EQUITY')
 * @returns 그룹에 속하는지 여부
 */
export function isCategoryInGroup(category: string, group: keyof typeof CATEGORY_GROUPS): boolean {
  const cats = CATEGORY_GROUPS[group] as readonly TaxCategory[]
  return cats.includes(category as TaxCategory)
}

/**
 * 카테고리 그룹 가져오기
 * @param category - 카테고리 코드
 * @returns 그룹 이름 또는 null
 */
export function getCategoryGroup(category: string): keyof typeof CATEGORY_GROUPS | null {
  for (const group of Object.keys(CATEGORY_GROUPS) as (keyof typeof CATEGORY_GROUPS)[]) {
    const categories = CATEGORY_GROUPS[group] as readonly TaxCategory[]
    if (categories.includes(category as TaxCategory)) {
      return group
    }
  }
  return null
}

/**
 * 모든 카테고리 목록 가져오기
 * @param group - 특정 그룹만 가져올 경우 그룹 이름
 * @returns 카테고리 코드 배열
 */
export function getAllCategories(group?: keyof typeof CATEGORY_GROUPS): TaxCategory[] {
  if (group) {
    return [...CATEGORY_GROUPS[group]] as TaxCategory[]
  }
  return Object.keys(TAX_CATEGORIES) as TaxCategory[]
}
