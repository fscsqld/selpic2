'use client'

import { useEffect, useState, type ComponentType } from 'react'

/**
 * Keeps root layout JS small: GamePromoCodeSync pulls in contentStore (large).
 * Loading it only after mount avoids ChunkLoadError / timeout on app/layout.js.
 */
export default function GamePromoCodeSyncLazy() {
  const [Sync, setSync] = useState<ComponentType | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('@/components/GamePromoCodeSync').then((mod) => {
      if (!cancelled) setSync(() => mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!Sync) return null
  return <Sync />
}
