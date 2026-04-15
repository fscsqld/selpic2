'use client'

import ContentStoreSupabaseSync from '@/components/ContentStoreSupabaseSync'
import CatalogStoreHydrator from '@/components/CatalogStoreHydrator'
import SiteConfigStoreAutosave from '@/components/SiteConfigStoreAutosave'
import SiteConfigWriteStatusBadge from '@/components/SiteConfigWriteStatusBadge'
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
      <CatalogStoreHydrator />
      <SiteConfigStoreAutosave />
      <SiteConfigWriteStatusBadge />
      <GamePromoCodeSyncLazy />
      {children}
    </div>
  )
}
