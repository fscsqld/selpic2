'use client'

import { Suspense } from 'react'
import MixedLabelsCustomizeClient from '@/components/mixedLabels/MixedLabelsCustomizeClient'

/**
 * Fonts come from parent `stickers/customize/layout.tsx` (Font 1–7).
 * Do not re-add a global Andika-only link here.
 */
export default function MixedLabelsCustomizePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-600">Loading…</p>
        </div>
      }
    >
      <MixedLabelsCustomizeClient />
    </Suspense>
  )
}
