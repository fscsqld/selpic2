'use client'

import { useCallback, useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import {
  getJourneyPreferences,
  saveJourneyPreferences,
  JOURNEY_PREFS_UPDATED_EVENT,
} from '@/lib/journey/journey-preferences'

interface IndividualJourneyOptionsProps {
  compact?: boolean
}

export function IndividualJourneyOptions({ compact = false }: IndividualJourneyOptionsProps) {
  const [skipPaymentSummary, setSkipPaymentSummary] = useState(false)

  const load = useCallback(() => {
    setSkipPaymentSummary(!!getJourneyPreferences().skipPaymentSummary)
  }, [])

  useEffect(() => {
    load()
    const onUpdate = () => load()
    window.addEventListener(JOURNEY_PREFS_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(JOURNEY_PREFS_UPDATED_EVENT, onUpdate)
  }, [load])

  const handleToggle = (checked: boolean) => {
    setSkipPaymentSummary(checked)
    saveJourneyPreferences({ skipPaymentSummary: checked })
  }

  return (
    <div
      className={`rounded-lg border border-indigo-200 bg-indigo-50/80 ${
        compact ? 'p-3 mb-4' : 'p-4 mb-6'
      }`}
    >
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-900">Tax situation</p>
          <label className="mt-2 flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipPaymentSummary}
              onChange={(e) => handleToggle(e.target.checked)}
              className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-indigo-900">
              I have no salary or wage income (skip payment summary step)
            </span>
          </label>
          <p className="text-xs text-indigo-700 mt-1 ml-6">
            Check this if you are self-employed only, retired, or have no PAYG employment income.
          </p>
        </div>
      </div>
    </div>
  )
}
