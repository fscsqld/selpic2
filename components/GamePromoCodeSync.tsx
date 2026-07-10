'use client'

import { useEffect } from 'react'
import { useContentStore } from '@/lib/contentStore'
import { GAME_PROMO_STORE_DESCRIPTION } from '@/lib/game-promo-constants'

/**
 * 게임에서 생성된 프로모 코드를 contentStore에 자동으로 추가하는 컴포넌트
 * localStorage의 'selpic-game-promo-pending' 키를 감시하여
 * 게임에서 새 코드가 생성되면 contentStore에 PromoCode로 추가합니다.
 */
export default function GamePromoCodeSync() {
  const addPromoCode = useContentStore((state) => state.addPromoCode)
  const updatePromoCode = useContentStore((state) => state.updatePromoCode)
  const getPromoCodeByCode = useContentStore((state) => state.getPromoCodeByCode)

  useEffect(() => {
    const upgradeLegacyGamePromoCodes = () => {
      const { promoCodes, updatePromoCode: update } = useContentStore.getState()
      for (const code of promoCodes) {
        if (
          code.code.startsWith('SELPIC-GAME-') &&
          code.minPurchaseAmount &&
          code.minPurchaseAmount > 0
        ) {
          update(code.id, {
            minPurchaseAmount: undefined,
            description: GAME_PROMO_STORE_DESCRIPTION,
          })
        }
      }
    }

    upgradeLegacyGamePromoCodes()

    const checkForPendingPromoCode = () => {
      try {
        const pendingRaw = localStorage.getItem('selpic-game-promo-pending')
        if (!pendingRaw) return

        const pending = JSON.parse(pendingRaw)
        if (!pending || !pending.code) return

        const existing = getPromoCodeByCode(pending.code)
        if (existing) {
          if (
            existing.code.startsWith('SELPIC-GAME-') &&
            existing.minPurchaseAmount &&
            existing.minPurchaseAmount > 0
          ) {
            updatePromoCode(existing.id, {
              minPurchaseAmount: undefined,
              description: GAME_PROMO_STORE_DESCRIPTION,
            })
          }
          localStorage.removeItem('selpic-game-promo-pending')
          return
        }

        const now = new Date()
        const sixMonthsLater = new Date(now)
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)

        addPromoCode({
          code: pending.code,
          description: GAME_PROMO_STORE_DESCRIPTION,
          discountType: 'percentage',
          discountValue: 10,
          maxDiscountAmount: 15,
          applicableCategories: undefined,
          applicableProducts: [],
          startDate: now,
          endDate: sixMonthsLater,
          usageLimit: undefined,
          userUsageLimit: 1,
          isActive: true,
        })

        const registerBody = {
          code: pending.code,
          source: typeof pending.source === 'string' ? pending.source : 'game_level_5',
          score: typeof pending.score === 'number' ? pending.score : undefined,
          level: typeof pending.level === 'number' ? pending.level : undefined,
        }
        void fetch('/api/game/promo-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerBody),
        }).catch(() => {})

        localStorage.removeItem('selpic-game-promo-pending')
        console.log('✅ Game promo code added to contentStore:', pending.code)
      } catch (error) {
        console.error('Error syncing game promo code to contentStore:', error)
      }
    }

    checkForPendingPromoCode()
    const interval = setInterval(checkForPendingPromoCode, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [addPromoCode, updatePromoCode, getPromoCodeByCode])

  return null
}
