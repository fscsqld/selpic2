'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getLastSiteConfigWriteStatus } from '@/lib/siteConfigClient'

type Status =
  | { kind: 'idle' }
  | { kind: 'saving'; source: 'state' | 'string' }
  | { kind: 'saved'; source: 'state' | 'string'; at: number }
  | { kind: 'error'; source: 'state' | 'string'; at: number; message: string }

/** Floating CMS cloud-save indicator — admin only; not for storefront shoppers. */
export default function SiteConfigWriteStatusBadge() {
  const pathname = usePathname() || ''
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/')

  const [status, setStatus] = useState<Status>(() => getLastSiteConfigWriteStatus() as Status)

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent
      if (!ce?.detail) return
      setStatus(ce.detail as Status)
    }
    window.addEventListener('site-config-write-status', handler)
    return () => window.removeEventListener('site-config-write-status', handler)
  }, [])

  if (!isAdminArea) return null
  if (status.kind === 'idle') return null

  const base =
    'fixed bottom-3 right-3 z-[9999] max-w-[85vw] rounded-full px-3 py-1 text-xs font-medium shadow border'

  if (status.kind === 'saving') {
    return (
      <div className={`${base} bg-slate-900 text-white border-slate-700`}>
        Saving…
      </div>
    )
  }

  if (status.kind === 'saved') {
    return (
      <div className={`${base} bg-emerald-600 text-white border-emerald-700`}>
        Saved
      </div>
    )
  }

  return (
    <div className={`${base} bg-red-600 text-white border-red-700`}>
      Save failed: {status.message}
    </div>
  )
}

