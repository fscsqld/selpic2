'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, Volume2 } from 'lucide-react'
import {
  enableAdminInboundSoundWithTest,
  isAdminInboundSoundEnabled,
  playAdminInboundChime,
  setAdminInboundSoundEnabled,
  unlockAdminInboundAudio,
} from '@/lib/adminInboundSound'

/**
 * Plays a chime when unified inbound count increases. Shows enable/disable control on all admin pages.
 */
export default function AdminInboundSoundAlert() {
  const [soundOn, setSoundOn] = useState(false)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    setSoundOn(isAdminInboundSoundEnabled())
    const onPref = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail
      if (typeof detail?.enabled === 'boolean') setSoundOn(detail.enabled)
      else setSoundOn(isAdminInboundSoundEnabled())
    }
    window.addEventListener('admin-inbound-sound-pref-changed', onPref)
    return () => window.removeEventListener('admin-inbound-sound-pref-changed', onPref)
  }, [])

  useEffect(() => {
    const onInbound = () => {
      if (document.visibilityState !== 'visible') return
      playAdminInboundChime()
    }
    window.addEventListener('admin-inbound-updated', onInbound)
    return () => window.removeEventListener('admin-inbound-updated', onInbound)
  }, [])

  const handleEnable = useCallback(async () => {
    setEnabling(true)
    try {
      const ok = await enableAdminInboundSoundWithTest()
      setSoundOn(ok)
    } finally {
      setEnabling(false)
    }
  }, [])

  const handleDisable = useCallback(() => {
    setAdminInboundSoundEnabled(false)
    setSoundOn(false)
  }, [])

  const handleTest = useCallback(async () => {
    setEnabling(true)
    try {
      await unlockAdminInboundAudio()
      playAdminInboundChime()
    } finally {
      setEnabling(false)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 shadow-lg backdrop-blur-sm px-1 py-1">
        {soundOn ? (
          <>
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={enabling}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
              title="Test sound"
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden />
              Sound on
            </button>
            <button
              type="button"
              onClick={handleDisable}
              className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Turn off sound alerts"
              aria-label="Turn off sound alerts"
            >
              <BellOff className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void handleEnable()}
            disabled={enabling}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-50 transition-colors"
          >
            <Bell className="h-3.5 w-3.5" aria-hidden />
            {enabling ? 'Enabling…' : 'Enable sound alerts'}
          </button>
        )}
      </div>
    </div>
  )
}
