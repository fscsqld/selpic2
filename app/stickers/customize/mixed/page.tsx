'use client'

import { Suspense } from 'react'
import MixedLabelsCustomizeClient from '@/components/mixedLabels/MixedLabelsCustomizeClient'

function MixedLabelsFonts() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Andika:ital,wght@0,400;0,700;1,400;1,700&display=swap"
    />
  )
}

export default function MixedLabelsCustomizePage() {
  return (
    <>
      <MixedLabelsFonts />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Loading…</p>
          </div>
        }
      >
        <MixedLabelsCustomizeClient />
      </Suspense>
    </>
  )
}
