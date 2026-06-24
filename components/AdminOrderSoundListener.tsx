'use client'

import { useEffect } from 'react'
import { isOrderAlertSoundEnabled, playOrderAlertSound } from '@/lib/admin/orderAlertSound'

/**
 * Plays the new-order alert when inbound order count increases (dashboard + all admin pages).
 */
export default function AdminOrderSoundListener() {
  useEffect(() => {
    const onNewOrder = () => {
      if (!isOrderAlertSoundEnabled()) return
      playOrderAlertSound()
    }
    window.addEventListener('admin-new-order', onNewOrder)
    return () => window.removeEventListener('admin-new-order', onNewOrder)
  }, [])

  return null
}
