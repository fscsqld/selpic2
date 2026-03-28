'use client'

import { useEffect } from 'react'
import { useContentStore } from '@/lib/contentStore'

/**
 * 게임에서 생성된 프로모 코드를 contentStore에 자동으로 추가하는 컴포넌트
 * localStorage의 'selpic-game-promo-pending' 키를 감시하여
 * 게임에서 새 코드가 생성되면 contentStore에 PromoCode로 추가합니다.
 */
export default function GamePromoCodeSync() {
  const addPromoCode = useContentStore((state) => state.addPromoCode)
  const getPromoCodeByCode = useContentStore((state) => state.getPromoCodeByCode)

  useEffect(() => {
    // 주기적으로 localStorage를 체크 (게임이 다른 탭/프레임에서 실행될 수 있음)
    const checkForPendingPromoCode = () => {
      try {
        const pendingRaw = localStorage.getItem('selpic-game-promo-pending')
        if (!pendingRaw) return

        const pending = JSON.parse(pendingRaw)
        if (!pending || !pending.code) return

        // 이미 contentStore에 같은 코드가 있는지 확인
        const existing = getPromoCodeByCode(pending.code)
        if (existing) {
          // 이미 있으면 pending 키만 삭제하고 종료
          localStorage.removeItem('selpic-game-promo-pending')
          return
        }

        // contentStore에 추가할 PromoCode 객체 생성
        const now = new Date()
        const sixMonthsLater = new Date(now)
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)

        // Determine description based on game source
        const description = `🎮 SELPIC TETRIS Level 5 Clear Reward - 10% OFF (Max $15) | Valid for 6 months | Min purchase $30`;
        const discountValue = 10;
        const maxDiscount = 15;

        addPromoCode({
          code: pending.code,
          description: description,
          discountType: 'percentage',
          discountValue: discountValue,
          minPurchaseAmount: 30, // 최소 $30 구매
          maxDiscountAmount: maxDiscount,
          applicableCategories: undefined, // 모든 카테고리 적용
          applicableProducts: [],
          startDate: now,
          endDate: sixMonthsLater,
          usageLimit: undefined, // 전체 사용 제한 없음
          userUsageLimit: 1, // 고객당 1회 사용
          isActive: true,
        })

        // 추가 완료 후 pending 키 삭제
        localStorage.removeItem('selpic-game-promo-pending')
        console.log('✅ Game promo code added to contentStore:', pending.code)
      } catch (error) {
        console.error('Error syncing game promo code to contentStore:', error)
      }
    }

    // 초기 체크
    checkForPendingPromoCode()

    // 주기적으로 체크 (1초마다)
    const interval = setInterval(checkForPendingPromoCode, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [addPromoCode, getPromoCodeByCode])

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null
}

