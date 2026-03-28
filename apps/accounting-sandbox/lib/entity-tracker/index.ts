/**
 * 사업 주체 추적 시스템
 * 
 * 파트너십 통장, 법인 통장, 개인 통장을 구분하여 추적
 */

import { BankTransaction, EntityType } from '../pdf-parser/types'

export interface EntityTracking {
  entityType: EntityType
  accountName?: string
  isNovated: boolean  // 계약 승계 여부
  novationDate?: string
}

export class EntityTracker {
  /**
   * 거래 내역에서 사업 주체 추적
   */
  async trackEntity(
    transaction: BankTransaction,
    accountInfo?: { accountName?: string; accountNumber?: string }
  ): Promise<EntityTracking> {
    // 계좌 정보 기반 추론
    if (accountInfo?.accountName) {
      const accountName = accountInfo.accountName.toLowerCase()
      
      if (accountName.includes('partnership') || accountName.includes('partners')) {
        return {
          entityType: 'partnership',
          accountName: accountInfo.accountName,
          isNovated: this.checkNovationStatus(transaction.date),
        }
      }
      
      if (accountName.includes('selpic') || accountName.includes('pty') || accountName.includes('ltd')) {
        return {
          entityType: 'company',
          accountName: accountInfo.accountName,
          isNovated: this.checkNovationStatus(transaction.date),
        }
      }
    }

    // 거래 설명 기반 추론
    const description = transaction.description.toLowerCase()
    
    if (description.includes('partnership') || description.includes('partner')) {
      return {
        entityType: 'partnership',
        isNovated: this.checkNovationStatus(transaction.date),
      }
    }

    if (description.includes('selpic') || description.includes('company')) {
      return {
        entityType: 'company',
        isNovated: this.checkNovationStatus(transaction.date),
      }
    }

    // 기본값: 법인 (2026년 1월 이후)
    return {
      entityType: 'company',
      isNovated: this.checkNovationStatus(transaction.date),
    }
  }

  /**
   * 계약 승계 상태 확인
   * 4월 이후에는 파트너십 계약이 법인으로 승계됨
   */
  private checkNovationStatus(transactionDate: string): boolean {
    const novationDate = '2026-04-01'
    return new Date(transactionDate) >= new Date(novationDate)
  }

  /**
   * 인보이스 명의 변경 추적
   */
  trackInvoiceNovation(
    transaction: BankTransaction,
    originalContractor: string,
    newContractor: string = 'SELPIC PTY LTD'
  ): EntityTracking {
    const isNovated = this.checkNovationStatus(transaction.date)

    return {
      entityType: 'company',
      isNovated,
      novationDate: isNovated ? '2026-04-01' : undefined,
    }
  }
}

