'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  Calculator,
  Loader2,
  Plus,
  Save,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  computeNetCapitalGain,
  computeNetRentalIncome,
  computeTotalNetCapitalGain,
  computeTotalNetRental,
  createCgtEntry,
  createRentalEntry,
  normalizeWorksheetRecord,
  type CgtWorksheetEntry,
  type CgtWorksheetData,
  type RentalWorksheetEntry,
  type RentalWorksheetData,
} from '@/lib/storage/tax-worksheet-types'

export const TAX_WORKSHEET_UPDATED_EVENT = 'taxWorksheetUpdated'

interface TaxWorksheetsPanelProps {
  financialYear: string
}

type RentalField = keyof RentalWorksheetData
type CgtField = keyof CgtWorksheetData

const RENTAL_EXPENSE_FIELDS: { key: RentalField; label: string }[] = [
  { key: 'advertising', label: 'Advertising' },
  { key: 'bodyCorporate', label: 'Body corporate fees' },
  { key: 'borrowingExpenses', label: 'Borrowing expenses' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'councilRates', label: 'Council rates' },
  { key: 'depreciation', label: 'Depreciation' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'interest', label: 'Interest' },
  { key: 'landTax', label: 'Land tax' },
  { key: 'legalFees', label: 'Legal fees' },
  { key: 'repairs', label: 'Repairs & maintenance' },
  { key: 'waterCharges', label: 'Water charges' },
  { key: 'otherExpenses', label: 'Other rental expenses' },
]

function notifyUpdated(): void {
  window.dispatchEvent(new CustomEvent(TAX_WORKSHEET_UPDATED_EVENT))
}

export function TaxWorksheetsPanel({ financialYear }: TaxWorksheetsPanelProps) {
  const [rentals, setRentals] = useState<RentalWorksheetEntry[]>([createRentalEntry()])
  const [cgtEvents, setCgtEvents] = useState<CgtWorksheetEntry[]>([createCgtEntry()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await indexedDBStorage.init()
      const record = await indexedDBStorage.getTaxWorksheet(financialYear)
      const normalized = normalizeWorksheetRecord(record)
      setRentals(normalized.rentals)
      setCgtEvents(normalized.cgtEvents)
    } finally {
      setLoading(false)
    }
  }, [financialYear])

  useEffect(() => {
    load()
  }, [load])

  const netRentalTotal = computeTotalNetRental(rentals)
  const netCgtTotal = computeTotalNetCapitalGain(cgtEvents)

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await indexedDBStorage.saveTaxWorksheet({
        financialYear,
        rentals,
        cgtEvents,
      })
      setMessage('Worksheets saved — net totals apply to ATO Lodgment fields.')
      notifyUpdated()
      setTimeout(() => setMessage(null), 4000)
    } catch {
      setMessage('Could not save worksheets.')
    } finally {
      setSaving(false)
    }
  }

  const updateRental = (id: string, key: RentalField, value: string) => {
    setRentals((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row
        if (key === 'propertyAddress') {
          return { ...row, propertyAddress: value }
        }
        return { ...row, [key]: Number(value) || 0 }
      })
    )
  }

  const updateCgt = (id: string, key: CgtField, value: string) => {
    setCgtEvents((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row
        if (key === 'assetDescription' || key === 'acquisitionDate' || key === 'disposalDate') {
          return { ...row, [key]: value }
        }
        return { ...row, [key]: Number(value) || 0 }
      })
    )
  }

  const addRental = () => setRentals((rows) => [...rows, createRentalEntry()])

  const removeRental = (id: string) => {
    setRentals((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)))
  }

  const addCgt = () => setCgtEvents((rows) => [...rows, createCgtEntry()])

  const removeCgt = (id: string) => {
    setCgtEvents((rows) => (rows.length <= 1 ? rows : rows.filter((c) => c.id !== id)))
  }

  if (loading) {
    return (
      <div className="card text-sm text-gray-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading tax worksheets...
      </div>
    )
  }

  return (
    <div className="space-y-4 print:hidden">
      {message && (
        <div className="card py-2 px-4 text-sm text-green-800 bg-green-50 border border-green-200">
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          Add multiple rental properties and CGT events. Net totals flow to ATO Lodgment.
        </p>
        <span className="text-sm font-mono font-semibold text-indigo-700">
          Total net rent {formatCurrency(netRentalTotal)} · CGT {formatCurrency(netCgtTotal)}
        </span>
      </div>

      {rentals.map((rental, index) => {
        const netRental = computeNetRentalIncome(rental)
        return (
          <div key={rental.id} className="card border-indigo-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">
                  Rental property {index + 1}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-indigo-700">
                  Net: {formatCurrency(netRental)}
                </span>
                {rentals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRental(rental.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    aria-label={`Remove rental property ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <label className="text-sm text-gray-700 md:col-span-2">
                Property address (optional)
                <input
                  type="text"
                  value={rental.propertyAddress || ''}
                  onChange={(e) => updateRental(rental.id, 'propertyAddress', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-700">
                Gross rent ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={rental.grossRent || ''}
                  onChange={(e) => updateRental(rental.id, 'grossRent', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-700">
                Other rental income ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={rental.otherRentalIncome || ''}
                  onChange={(e) => updateRental(rental.id, 'otherRentalIncome', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {RENTAL_EXPENSE_FIELDS.map(({ key, label }) => (
                <label key={key} className="text-sm text-gray-700">
                  {label} ($)
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={(rental[key] as number) || ''}
                    onChange={(e) => updateRental(rental.id, key, e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addRental}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50"
      >
        <Plus className="w-4 h-4" />
        Add rental property
      </button>

      {cgtEvents.map((cgt, index) => {
        const netCgt = computeNetCapitalGain(cgt)
        return (
          <div key={cgt.id} className="card border-indigo-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">CGT event {index + 1}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-indigo-700">
                  Net: {formatCurrency(netCgt)}
                </span>
                {cgtEvents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCgt(cgt.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    aria-label={`Remove CGT event ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-gray-700 md:col-span-2">
                Asset description (optional)
                <input
                  type="text"
                  value={cgt.assetDescription || ''}
                  onChange={(e) => updateCgt(cgt.id, 'assetDescription', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-700">
                Acquisition date
                <input
                  type="date"
                  value={cgt.acquisitionDate || ''}
                  onChange={(e) => updateCgt(cgt.id, 'acquisitionDate', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-700">
                Disposal date
                <input
                  type="date"
                  value={cgt.disposalDate || ''}
                  onChange={(e) => updateCgt(cgt.id, 'disposalDate', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-700">
                Capital proceeds ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={cgt.capitalProceeds || ''}
                  onChange={(e) => updateCgt(cgt.id, 'capitalProceeds', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-700">
                Cost base ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={cgt.costBase || ''}
                  onChange={(e) => updateCgt(cgt.id, 'costBase', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-700 md:col-span-2">
                Incidental costs ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={cgt.incidentalCosts || ''}
                  onChange={(e) => updateCgt(cgt.id, 'incidentalCosts', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addCgt}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50"
      >
        <Plus className="w-4 h-4" />
        Add CGT event
      </button>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save worksheets for FY {financialYear}
      </button>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Calculator className="w-3 h-3" />
        {rentals.length} rental(s) · {cgtEvents.length} CGT event(s) · Total rent{' '}
        {formatCurrency(netRentalTotal)} · CGT {formatCurrency(netCgtTotal)}
      </p>
    </div>
  )
}
