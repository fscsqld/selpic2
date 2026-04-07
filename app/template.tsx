'use client'

import '@/lib/contentStoreLocalStorageShim'
import ContentStoreSupabaseSync from '@/components/ContentStoreSupabaseSync'
import GamePromoCodeSyncLazy from '@/components/GamePromoCodeSyncLazy'

/**
 * Root layout stays server-only (smaller app/layout.js, avoids ChunkLoadError).
 * Global client-only side effects live here; template remounts on navigation but
 * GamePromoCodeSync is a no-op UI (null) with a cheap effect.
 */
export default function RootTemplate({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="contents">
      <ContentStoreSupabaseSync />
      <GamePromoCodeSyncLazy />
      {children}
    </div>
  )
}
