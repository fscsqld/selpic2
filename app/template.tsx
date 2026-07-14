'use client'

import ContentStoreSupabaseSync from '@/components/ContentStoreSupabaseSync'
import CatalogStoreHydrator from '@/components/CatalogStoreHydrator'
import SiteConfigStoreAutosave from '@/components/SiteConfigStoreAutosave'
import SiteConfigWriteStatusBadge from '@/components/SiteConfigWriteStatusBadge'
import GamePromoCodeSyncLazy from '@/components/GamePromoCodeSyncLazy'
import StorefrontPageViewTrackerLazy from '@/components/StorefrontPageViewTrackerLazy'
import StorefrontDeployVersionGuard from '@/components/StorefrontDeployVersionGuard'

/**
 * Root layout stays server-only (smaller app/layout.js, avoids ChunkLoadError).
 * Global client-only side effects live here; template remounts on navigation but
 * GamePromoCodeSync is a no-op UI (null) with a cheap effect.
 *
 * Order matters on slow tablets: subscribe to the CMS (`content-store`) before
 * `selpic-store` rehydration. `CatalogStoreHydrator` touches the heavy product
 * store — keep it after `{children}` so the active page can paint while persist runs.
 */
export default function RootTemplate({
  children
}: {
  children: React.ReactNode
}) {
  // Avoid `display: contents` here — it can confuse the browser/React reconciler and cause
  // removeChild NotFoundError on dev (localhost) with React 19 + nested client roots.
  return (
    <>
      <StorefrontDeployVersionGuard />
      <ContentStoreSupabaseSync />
      <SiteConfigStoreAutosave />
      {children}
      <CatalogStoreHydrator />
      <SiteConfigWriteStatusBadge />
      <GamePromoCodeSyncLazy />
      <StorefrontPageViewTrackerLazy />
    </>
  )
}
