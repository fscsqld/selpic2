'use client'

import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import {
  buildFyStartPreferences,
  defaultFinancialYearForSetup,
  loadFyStartPreferences,
  quarterOptionsForFinancialYear,
  saveFyStartPreferences,
  type AppStartQuarter,
  type PriorQuarterHandling,
} from '@/lib/onboarding/fy-start-preferences'

const PRIOR_OPTIONS: { id: PriorQuarterHandling; label: string }[] = [
  { id: 'upload_prior_pdfs', label: 'Upload prior-quarter bank PDFs' },
  { id: 'prior_lodged_snapshot', label: 'Prior BAS already lodged (snapshot only)' },
  { id: 'opening_balances_only', label: 'Opening balances only (no prior PDFs)' },
]

export function FyStartPreferencesEditor() {
  const [financialYear, setFinancialYear] = useState(defaultFinancialYearForSetup())
  const [startingQuarter, setStartingQuarter] = useState<AppStartQuarter>(4)
  const [priorQuarterHandling, setPriorQuarterHandling] =
    useState<PriorQuarterHandling>('upload_prior_pdfs')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const existing = loadFyStartPreferences()
    if (existing) {
      setFinancialYear(existing.financialYear)
      setStartingQuarter(existing.startingQuarter)
      setPriorQuarterHandling(existing.priorQuarterHandling)
    }
  }, [])

  const quarterOptions = useMemo(
    () => quarterOptionsForFinancialYear(financialYear),
    [financialYear]
  )

  const fyOptions = useMemo(() => {
    const current = defaultFinancialYearForSetup()
    const [start] = current.split('-').map(Number)
    return [`${start - 1}-${start}`, current, `${start + 1}-${start + 2}`]
  }, [])

  const handleSave = () => {
    saveFyStartPreferences(
      buildFyStartPreferences({
        startingQuarter,
        financialYear,
        priorQuarterHandling,
      })
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="card border border-indigo-200 bg-white mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Your starting BAS quarter</h3>
      <p className="text-sm text-gray-600 mb-4">
        Set or update which quarter you first use in SELPIC A. Biz Intel shows tailored next steps
        after you save.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Financial year</label>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {fyOptions.map((fy) => (
              <option key={fy} value={fy}>
                FY {fy}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Starting quarter</label>
          <select
            value={startingQuarter}
            onChange={(e) => setStartingQuarter(Number(e.target.value) as AppStartQuarter)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {quarterOptions.map((q) => (
              <option key={q.quarter} value={q.quarter}>
                Q{q.quarter} — {q.startDateStr} to {q.endDateStr}
              </option>
            ))}
          </select>
        </div>
      </div>
      {startingQuarter > 1 && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Earlier quarters in this FY
          </label>
          <select
            value={priorQuarterHandling}
            onChange={(e) =>
              setPriorQuarterHandling(e.target.value as PriorQuarterHandling)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {PRIOR_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="button"
        onClick={handleSave}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
      >
        <Save className="w-4 h-4" />
        {saved ? 'Saved — check Biz Intel banner' : 'Save starting quarter'}
      </button>
    </div>
  )
}
