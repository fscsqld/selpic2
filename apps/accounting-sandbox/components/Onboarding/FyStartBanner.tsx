'use client'

import { useEffect, useState } from 'react'
import { Calendar, ChevronRight, X } from 'lucide-react'
import {
  dismissFyStartBanner,
  FY_START_PREFERENCES_CHANGED,
  getFyStartGuidance,
  isFyStartBannerDismissed,
  loadFyStartPreferences,
  type FyStartPreferences,
} from '@/lib/onboarding/fy-start-preferences'
import type { JourneyNavigateTarget } from '@/lib/journey/types'

interface FyStartBannerProps {
  accountType: 'individual' | 'company' | 'sole_trader'
  gstRegistered?: boolean
  onNavigate: (target: JourneyNavigateTarget) => void
}

export function FyStartBanner({
  accountType,
  gstRegistered = true,
  onNavigate,
}: FyStartBannerProps) {
  const [prefs, setPrefs] = useState<FyStartPreferences | null>(null)
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    const refresh = () => {
      if (accountType === 'individual' || !gstRegistered) {
        setVisible(false)
        return
      }
      const loaded = loadFyStartPreferences()
      setPrefs(loaded)
      setVisible(!!loaded && !isFyStartBannerDismissed())
    }
    refresh()
    window.addEventListener(FY_START_PREFERENCES_CHANGED, refresh)
    return () => window.removeEventListener(FY_START_PREFERENCES_CHANGED, refresh)
  }, [accountType, gstRegistered])

  if (!visible || !prefs) return null

  const guidance = getFyStartGuidance(prefs)

  const handleDismiss = () => {
    dismissFyStartBanner()
    setVisible(false)
  }

  return (
    <div className="card mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50 to-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Calendar className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{guidance.headline}</p>
            <p className="text-sm text-gray-600 mt-1">{guidance.summary}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {expanded && (
        <ol className="mt-4 ml-9 list-decimal list-inside space-y-1.5 text-sm text-gray-700">
          {guidance.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}

      <div className="mt-4 ml-9 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-indigo-700 hover:text-indigo-900 underline"
        >
          {expanded ? 'Hide steps' : 'Show next steps'}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          Settings → FY onboarding
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
