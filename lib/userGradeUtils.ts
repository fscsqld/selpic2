/**
 * VIP 등급 시스템 유틸리티 함수
 * 사용자의 총 판매액 계산 및 등급 업데이트 로직
 */

import { User } from '@/lib/userAuth'
import { OrderRecord } from '@/lib/store'
import { calculateGrade } from '@/lib/vipGradeConfig'
import { useContentStore } from '@/lib/contentStore'

/**
 * 사용자의 총 판매액을 계산합니다.
 * 취소된 주문은 제외합니다.
 * 
 * @param userEmail 사용자 이메일
 * @param userPhone 사용자 전화번호 (선택)
 * @param orders 주문 목록
 * @returns 총 판매액
 */
export function calculateUserTotalSales(
  userEmail: string,
  orders: OrderRecord[],
  userPhone?: string
): number {
  const ELIGIBLE_STATUSES = new Set(['paid', 'approved', 'processing', 'shipped'])
  const normalizedEmail = (userEmail || '').trim().toLowerCase()
  const normalizedPhone = userPhone ? (userPhone || '').replace(/\D/g, '').replace(/^\+?61/, '0') : ''
  
  const userOrders = orders.filter(order => {
    // 결제 확정/이행 단계 주문만 포함 (pending, cancelled 제외)
    if (!ELIGIBLE_STATUSES.has(String(order.status || '').toLowerCase())) return false
    
    const orderEmail = (order.customer.email || '').trim().toLowerCase()
    const orderPhone = (order.customer.phone || '').replace(/\D/g, '').replace(/^\+?61/, '0')
    
    // 이메일 또는 전화번호로 매칭
    const emailMatch = normalizedEmail && orderEmail === normalizedEmail
    const phoneMatch = normalizedPhone && orderPhone && orderPhone.includes(normalizedPhone)
    
    return emailMatch || phoneMatch
  })
  
  return userOrders.reduce((sum, order) => sum + (order.total || 0), 0)
}

/**
 * 사용자의 등급을 업데이트합니다.
 * 수동 등급 변경이 설정된 사용자는 자동 업데이트를 건너뜁니다.
 * 
 * @param user 사용자 객체
 * @param orders 주문 목록
 * @param updateUser 사용자 업데이트 함수
 */
export function updateUserGrade(
  user: User,
  orders: OrderRecord[],
  updateUser: (userId: string, userData: Partial<User>) => void
): void {
  // 수동 등급 변경이 설정된 경우 자동 업데이트 건너뛰기
  if (user.manualGradeOverride) {
    return
  }
  
  // 총 판매액 계산
  const totalSales = calculateUserTotalSales(user.email, orders, user.phone)
  
  // Content Store에서 관리자가 설정한 등급 기준 가져오기
  const { getActiveVIPGradeConfigs } = useContentStore.getState()
  const gradeConfigs = getActiveVIPGradeConfigs()
  
  // 새 등급 계산 (관리자 설정 우선 사용)
  const newGrade = calculateGrade(totalSales, gradeConfigs)
  
  // 등급이 변경되었거나 총 판매액이 업데이트된 경우
  const gradeChanged = user.currentGrade !== newGrade
  const salesChanged = user.totalSalesAmount !== totalSales
  
  if (gradeChanged || salesChanged) {
    updateUser(user.id, {
      totalSalesAmount: totalSales,
      currentGrade: newGrade,
      gradeUpdatedAt: new Date().toISOString()
    })
  }
}

/**
 * 모든 사용자의 등급을 재계산합니다.
 * 관리자 페이지에서 사용할 수 있는 일괄 업데이트 함수입니다.
 * 
 * @param users 사용자 목록
 * @param orders 주문 목록
 * @param updateUser 사용자 업데이트 함수
 * @returns 업데이트된 사용자 수
 */
export function recalculateAllUserGrades(
  users: User[],
  orders: OrderRecord[],
  updateUser: (userId: string, userData: Partial<User>) => void
): number {
  let updatedCount = 0
  
  // Content Store에서 관리자가 설정한 등급 기준 가져오기
  const { getActiveVIPGradeConfigs } = useContentStore.getState()
  const gradeConfigs = getActiveVIPGradeConfigs()
  
  users.forEach(user => {
    // 수동 등급 변경이 설정된 사용자는 제외
    if (user.manualGradeOverride) {
      return
    }
    
    const totalSales = calculateUserTotalSales(user.email, orders, user.phone)
    const newGrade = calculateGrade(totalSales, gradeConfigs)
    
    // 등급이나 총 판매액이 변경된 경우에만 업데이트
    if (user.currentGrade !== newGrade || user.totalSalesAmount !== totalSales) {
      updateUser(user.id, {
        totalSalesAmount: totalSales,
        currentGrade: newGrade,
        gradeUpdatedAt: new Date().toISOString()
      })
      updatedCount++
    }
  })
  
  return updatedCount
}

/**
 * 기존 사용자 데이터를 마이그레이션합니다.
 * totalSalesAmount와 currentGrade가 없는 사용자에게 초기값을 설정합니다.
 * 
 * @param users 사용자 목록
 * @param orders 주문 목록
 * @param updateUser 사용자 업데이트 함수
 * @returns 마이그레이션된 사용자 수
 */
export function migrateUserGrades(
  users: User[],
  orders: OrderRecord[],
  updateUser: (userId: string, userData: Partial<User>) => void
): number {
  let migratedCount = 0
  
  users.forEach(user => {
    // 이미 등급 정보가 있는 사용자는 건너뛰기
    if (user.totalSalesAmount !== undefined && user.currentGrade !== undefined) {
      return
    }
    
    // 총 판매액 계산
    const totalSales = calculateUserTotalSales(user.email, orders, user.phone)
    
    // Content Store에서 관리자가 설정한 등급 기준 가져오기
    const { getActiveVIPGradeConfigs } = useContentStore.getState()
    const gradeConfigs = getActiveVIPGradeConfigs()
    
    // 등급 계산 (관리자 설정 우선 사용)
    const grade = calculateGrade(totalSales, gradeConfigs)
    
    // 초기값 설정
    updateUser(user.id, {
      totalSalesAmount: totalSales,
      currentGrade: grade,
      gradeUpdatedAt: new Date().toISOString()
    })
    
    migratedCount++
  })
  
  return migratedCount
}

