'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Bell, Volume2 } from 'lucide-react'
import { useAdminInboundStore } from '@/lib/adminInboundStore'
import {
  enableAdminInboundSoundWithTest,
  isAdminInboundSoundEnabled,
} from '@/lib/adminInboundSound'

function SoundAlertHint() {
  const [soundOn, setSoundOn] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSoundOn(isAdminInboundSoundEnabled())
    const sync = () => setSoundOn(isAdminInboundSoundEnabled())
    window.addEventListener('admin-inbound-sound-pref-changed', sync)
    return () => window.removeEventListener('admin-inbound-sound-pref-changed', sync)
  }, [])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const ok = await enableAdminInboundSoundWithTest()
      setSoundOn(ok)
    } finally {
      setBusy(false)
    }
  }, [])

  if (soundOn) {
    return (
      <p className="text-xs text-emerald-800 flex items-center gap-1.5 mt-2">
        <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Sound alerts are on — you will hear a chime when new customer activity arrives.
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void enable()}
      disabled={busy}
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-800 hover:text-indigo-950 underline-offset-2 hover:underline"
    >
      <Bell className="h-3.5 w-3.5" aria-hidden />
      {busy ? 'Enabling sound…' : 'Enable sound alerts while you work in admin'}
    </button>
  )
}

export default function AdminInboundAlertBanner() {
  const summary = useAdminInboundStore((s) => s.summary)
  const pending = summary.items.filter((item) => item.count > 0)

  if (pending.length === 0) return null

  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-950">
              {summary.totalCount} customer item{summary.totalCount === 1 ? '' : 's'} need your attention
            </p>
            <p className="text-sm text-amber-900 mt-0.5">
              New submissions are also emailed to the company inbox. Open each section below to review and reply.
            </p>
            <SoundAlertHint />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {pending.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
                >
                  <span className="font-medium text-gray-900 truncate">{item.label}</span>
                  <span className="shrink-0 rounded-full bg-amber-600 text-white text-xs font-semibold px-2 py-0.5">
                    {item.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
