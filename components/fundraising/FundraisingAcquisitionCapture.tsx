'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  acquisitionFromSearchParams,
  writeAcquisitionToSession,
} from '@/lib/fundraising/acquisition'

/**
 * Captures optional ?ref=&target_id=&utm_* into sessionStorage for the apply form.
 * Must stay inside <Suspense> (Next App Router + useSearchParams).
 * No UI — organic visitors see zero change.
 */
function FundraisingAcquisitionCaptureInner() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const acquisition = acquisitionFromSearchParams(searchParams)
    if (acquisition) {
      writeAcquisitionToSession(acquisition)
    }
  }, [searchParams])

  return null
}

export default function FundraisingAcquisitionCapture() {
  return (
    <Suspense fallback={null}>
      <FundraisingAcquisitionCaptureInner />
    </Suspense>
  )
}
