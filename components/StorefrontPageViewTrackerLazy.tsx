'use client'

import dynamic from 'next/dynamic'

const StorefrontPageViewTracker = dynamic(
  () => import('@/components/StorefrontPageViewTracker'),
  { ssr: false }
)

export default function StorefrontPageViewTrackerLazy() {
  return <StorefrontPageViewTracker />
}
