'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  Save,
  Shield,
  Trash2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import {
  computeIndividualLodgment,
  type IndividualManualOverrides,
} from '@/lib/ato-lodgment/compute-individual-lodgment'
import { getCurrentFinancialYearRange } from '@/lib/ato-lodgment/compute-lodgment'
import { buildLodgmentCalendar } from '@/lib/ato-lodgment/lodgment-calendar'
import { portalLabel } from '@/lib/ato-lodgment/field-guides'
import { sortFieldsByAtoOrder } from '@/lib/ato-lodgment/field-metadata'
import { buildPreLodgeChecklist, fieldsToTsv } from '@/lib/ato-lodgment/pre-lodge-checklist'
import type { LodgmentField } from '@/lib/ato-lodgment/types'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'
import { ReportFooter } from '@/components/Reports/ReportFooter'
import { EntryKindBadge } from '@/components/Lodgment/EntryKindBadge'
import { LodgmentCalendar } from '@/components/Lodgment/LodgmentCalendar'

interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
}

interface IndividualTaxLodgmentGuideProps {
  transactions: Transaction[]
  individualName?: string
}

const EDITABLE_FIELD_IDS = new Set([
  'IND_SALARY',
  'IND_INTEREST',
  'IND_DIVIDENDS',
  'IND_GOVT',
  'IND_RENTAL',
  'IND_BUSINESS',
  'IND_OTHER_INCOME',
  'IND_CAPITAL_GAINS',
  'IND_WORK_DEDUCTIONS',
  'IND_GIFTS',
  'IND_TAX_AFFAIRS',
  'IND_OTHER_DEDUCTIONS',
  'IND_TAX_WITHHELD',
])

const FIELD_TO_OVERRIDE: Record<string, keyof IndividualManualOverrides> = {
  IND_SALARY: 'salary',
  IND_INTEREST: 'interest',
  IND_DIVIDENDS: 'dividends',
  IND_GOVT: 'govtPayments',
  IND_RENTAL: 'rentalIncome',
  IND_BUSINESS: 'businessIncome',
  IND_OTHER_INCOME: 'otherIncome',
  IND_CAPITAL_GAINS: 'capitalGains',
  IND_WORK_DEDUCTIONS: 'workDeductions',
  IND_GIFTS: 'giftsDonations',
  IND_TAX_AFFAIRS: 'taxAffairs',
  IND_OTHER_DEDUCTIONS: 'otherDeductions',
  IND_TAX_WITHHELD: 'taxWithheld',
}

function amountForCopy(amount: number): string {
  return amount.toFixed(2)
}

function sectionTitle(section: LodgmentField['section']): string {
  switch (section) {
    case 'income':
      return 'Income'
    case 'expense':
      return 'Deductions'
    case 'summary':
      return 'Summary'
    case 'tax':
      return 'Tax calculation & offsets'
    default:
      return 'Other'
  }
}

function listRecentFinancialYears(count: number = 5): string[] {
  const current = getCurrentFinancialYearRange().financialYear
  const [startYear] = current.split('-').map(Number)
  const years: string[] = []
  for (let i = 0; i < count; i++) {
    const sy = startYear - i
    years.push(`${sy}-${sy + 1}`)
  }
  return years
}

export function IndividualTaxLodgmentGuide({
  transactions,
  individualName,
}: IndividualTaxLodgmentGuideProps) {
  const [financialYear, setFinancialYear] = useState(
    () => getCurrentFinancialYearRange().financialYear
  )
  const [overrides, setOverrides] = useState<IndividualManualOverrides>({})
  const [entered, setEntered] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [fieldViewMode, setFieldViewMode] = useState<'grouped' | 'ato_order'>('ato_order')
  const [snapshots, setSnapshots] = useState<LodgmentSnapshot[]>([])
  const [viewingSnapshot, setViewingSnapshot] = useState<LodgmentSnapshot | null>(null)
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null)

  const overridesKey = `individual_tax_overrides_${financialYear}`
  const enteredKey = `individual_tax_entered_${financialYear}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(overridesKey)
      setOverrides(raw ? (JSON.parse(raw) as IndividualManualOverrides) : {})
      const enteredRaw = localStorage.getItem(enteredKey)
      setEntered(enteredRaw ? (JSON.parse(enteredRaw) as Record<string, boolean>) : {})
    } catch {
      setOverrides({})
      setEntered({})
    }
  }, [overridesKey, enteredKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(overridesKey, JSON.stringify(overrides))
  }, [overridesKey, overrides])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(enteredKey, JSON.stringify(entered))
  }, [enteredKey, entered])

  const liveResult = useMemo(
    () => computeIndividualLodgment(transactions, financialYear, overrides),
    [transactions, financialYear, overrides]
  )

  const activeResult = viewingSnapshot
    ? {
        kind: 'individual' as const,
        financialYear,
        periodStart: viewingSnapshot.periodStart,
        periodEnd: viewingSnapshot.periodEnd,
        fields: viewingSnapshot.fields,
        validation: viewingSnapshot.validation,
        uncategorisedCount: 0,
        bankHints: liveResult.bankHints,
      }
    : liveResult

  const orderedFields = useMemo(
    () => sortFieldsByAtoOrder(activeResult.fields),
    [activeResult.fields]
  )

  const groupedFields = useMemo(() => {
    const sections: LodgmentField['section'][] = ['income', 'expense', 'summary', 'tax']
    return sections
      .map((section) => ({
        section,
        fields: activeResult.fields.filter((f) => f.section === section),
      }))
      .filter((g) => g.fields.length > 0)
  }, [activeResult.fields])

  const selectedField = useMemo(
    () => activeResult.fields.find((f) => f.id === selectedFieldId) ?? null,
    [activeResult.fields, selectedFieldId]
  )

  const calendarItems = useMemo(
    () => buildLodgmentCalendar('individual', 'Quarterly', financialYear),
    [financialYear]
  )

  const loadSnapshots = useCallback(async () => {
    const all = await indexedDBStorage.getLodgmentSnapshots('individual')
    setSnapshots(all.filter((s) => s.accountType === 'individual'))
  }, [])

  useEffect(() => {
    indexedDBStorage.init().then(loadSnapshots).catch(() => {})
  }, [loadSnapshots])

  const toggleEntered = (id: string) => {
    setEntered((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyAmount = async (field: LodgmentField) => {
    try {
      await navigator.clipboard.writeText(amountForCopy(field.amount))
      setCopiedId(field.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      window.prompt('Copy amount:', amountForCopy(field.amount))
    }
  }

  const copyAllFields = async () => {
    try {
      await navigator.clipboard.writeText(fieldsToTsv(activeResult.fields))
      setSnapshotMessage('All fields copied to clipboard.')
      setTimeout(() => setSnapshotMessage(null), 3000)
    } catch {
      window.prompt('Copy all fields:', fieldsToTsv(activeResult.fields))
    }
  }

  const setFieldOverride = (fieldId: string, value: number) => {
    const key = FIELD_TO_OVERRIDE[fieldId]
    if (!key) return
    setOverrides((prev) => ({ ...prev, [key]: value }))
  }

  const resetOverrides = () => {
    if (!window.confirm('Reset all manual amounts for this year to bank hints?')) return
    setOverrides({})
  }

  const currentPeriodKey = `IND-FY${financialYear}`

  const saveSnapshot = async (finalize: boolean) => {
    setSnapshotBusy(true)
    setSnapshotMessage(null)
    try {
      await indexedDBStorage.init()
      await indexedDBStorage.saveLodgmentSnapshot({
        kind: 'individual',
        periodKey: currentPeriodKey,
        periodLabel: `Personal return FY ${financialYear}`,
        periodStart: liveResult.periodStart,
        periodEnd: liveResult.periodEnd,
        accountType: 'individual',
        fields: liveResult.fields,
        entered,
        validation: liveResult.validation,
        finalizedAt: finalize ? new Date().toISOString() : null,
      })
      await loadSnapshots()
      setSnapshotMessage(finalize ? 'Finalized snapshot saved.' : 'Snapshot saved.')
      setTimeout(() => setSnapshotMessage(null), 4000)
    } catch {
      setSnapshotMessage('Could not save snapshot. Refresh and try again.')
    } finally {
      setSnapshotBusy(false)
    }
  }

  const loadSnapshotById = async (id: string) => {
    setSnapshotBusy(true)
    try {
      const snap = await indexedDBStorage.getLodgmentSnapshot(id)
      if (snap) {
        setViewingSnapshot(snap)
        setEntered(snap.entered)
        const fy = snap.periodKey.replace(/^IND-FY/, '')
        setFinancialYear(fy)
      }
    } finally {
      setSnapshotBusy(false)
    }
  }

  const deleteSnapshot = async (id: string) => {
    if (!window.confirm('Delete this saved snapshot?')) return
    await indexedDBStorage.deleteLodgmentSnapshot(id)
    if (viewingSnapshot?.id === id) setViewingSnapshot(null)
    await loadSnapshots()
  }

  const enteredCount = activeResult.fields.filter((f) => entered[f.id]).length
  const totalFields = activeResult.fields.filter((f) => !f.readOnly).length
  const allEntered = enteredCount >= totalFields && totalFields > 0

  const preLodge = useMemo(() => {
    if (viewingSnapshot) return null
    return buildPreLodgeChecklist({
      fields: activeResult.fields,
      validation: activeResult.validation,
      scopeSummary: {
        periodStart: liveResult.periodStart,
        periodEnd: liveResult.periodEnd,
        months: [],
        totalInRange: transactions.length,
        allMonthsLocked: true,
        anyOpenWithTransactions: false,
        lockedTransactionCount: 0,
        openTransactionCount: transactions.length,
        openMonthIds: [],
      },
      uncategorisedCount: liveResult.uncategorisedCount,
      entered,
      kind: 'individual',
      scopeMode: 'full',
    })
  }, [activeResult, viewingSnapshot, transactions.length, liveResult.uncategorisedCount, entered])

  const renderFieldRow = (field: LodgmentField) => {
    const isSelected = selectedFieldId === field.id
    const isEntered = !!entered[field.id]
    const kind = field.entryKind ?? (field.source === 'manual' ? 'manual' : 'auto')
    const isEditable = EDITABLE_FIELD_IDS.has(field.id) && !viewingSnapshot

    return (
      <tr
        key={field.id}
        onClick={() => setSelectedFieldId(field.id)}
        className={`border-b border-gray-100 cursor-pointer transition-colors ${
          isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
        } ${isEntered ? 'opacity-80' : ''}`}
      >
        <td className="px-4 py-3 print:hidden">
          <input
            type="checkbox"
            checked={isEntered}
            onChange={(e) => {
              e.stopPropagation()
              toggleEntered(field.id)
            }}
            className="rounded border-gray-300 text-indigo-600"
            aria-label={`Entered ${field.label} in myTax`}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{field.label}</span>
            <EntryKindBadge kind={kind} />
          </div>
          {field.myTaxLabel && field.myTaxLabel !== field.label && (
            <div className="text-xs text-indigo-600 mt-0.5">myTax: {field.myTaxLabel}</div>
          )}
          {field.atoScreenPath && fieldViewMode === 'ato_order' && (
            <div className="text-xs text-gray-400 mt-0.5">{field.atoScreenPath}</div>
          )}
          {field.description && (
            <div className="text-xs text-gray-500 mt-0.5">{field.description}</div>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {isEditable ? (
            <input
              type="number"
              min={0}
              step={0.01}
              value={field.amount || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setFieldOverride(field.id, Number(e.target.value) || 0)}
              className="w-28 text-right font-mono font-semibold border border-gray-300 rounded px-2 py-1 text-sm"
            />
          ) : (
            <span className="font-mono font-semibold text-gray-900">
              {formatCurrency(field.amount)}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right print:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              copyAmount(field)
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100"
          >
            {copiedId === field.id ? (
              <>
                <Check className="w-3 h-3 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <ClipboardCopy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </td>
      </tr>
    )
  }

  const fieldTableHead = (
    <thead>
      <tr className="border-b border-gray-200 text-left text-gray-500">
        <th className="px-4 py-2 font-medium w-8 print:hidden">✓</th>
        <th className="px-4 py-2 font-medium">myTax field</th>
        <th className="px-4 py-2 font-medium text-right">Amount ($)</th>
        <th className="px-4 py-2 font-medium text-right w-28 print:hidden">Copy</th>
      </tr>
    </thead>
  )

  return (
    <div id="individual-tax-lodgment" className="space-y-4 print:space-y-2">
      <div className="card border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white print:border print:bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-7 h-7 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Personal Tax Return Guide</h2>
            </div>
            <p className="text-gray-600 text-sm max-w-2xl">
              Prepare your individual income tax return for manual entry in{' '}
              <strong>myTax</strong>. Bank transactions provide hints — enter salary and tax
              withheld from your employer <strong>payment summary</strong> as the authoritative
              amounts.
            </p>
            {individualName && (
              <p className="text-sm text-indigo-800 mt-2">Taxpayer: {individualName}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              type="button"
              onClick={copyAllFields}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ClipboardCopy className="w-4 h-4" />
              Copy all
            </button>
            <button
              type="button"
              onClick={() => saveSnapshot(false)}
              disabled={snapshotBusy || !!viewingSnapshot}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-indigo-300 text-indigo-700 rounded-md hover:bg-indigo-50 disabled:opacity-50"
            >
              {snapshotBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save snapshot
            </button>
            <button
              type="button"
              onClick={() => saveSnapshot(true)}
              disabled={snapshotBusy || !!viewingSnapshot}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Finalize
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 print:text-xs">
          <strong>Preparation only — not electronic lodgment.</strong> Verify all figures against
          payment summaries, bank statements, and receipts before lodging in{' '}
          <a
            href="https://my.gov.au"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            myTax
            <ExternalLink className="w-3 h-3" />
          </a>
          . SELPIC A is not a registered tax agent.
        </div>
      </div>

      {snapshotMessage && (
        <div className="card py-2 px-4 text-sm text-green-800 bg-green-50 border border-green-200 print:hidden">
          {snapshotMessage}
        </div>
      )}

      {viewingSnapshot && (
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-blue-50 border-blue-200 print:hidden">
          <p className="text-sm text-blue-900">
            Viewing saved snapshot · {viewingSnapshot.periodLabel} ·{' '}
            {formatDateAustralian(viewingSnapshot.updatedAt)}
          </p>
          <button
            type="button"
            onClick={() => setViewingSnapshot(null)}
            className="text-sm text-blue-700 underline hover:text-blue-900"
          >
            Back to live data
          </button>
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="card print:hidden">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Saved snapshots</h3>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {snapshots.map((snap) => (
              <li
                key={snap.id}
                className="flex items-center justify-between gap-2 text-sm border border-gray-100 rounded-md px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => loadSnapshotById(snap.id)}
                  className="text-left hover:text-indigo-700 flex-1"
                >
                  <span className="font-medium">{snap.periodLabel}</span>
                  {snap.finalizedAt && (
                    <span className="ml-2 text-xs text-green-700">Finalized</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSnapshot(snap.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  aria-label="Delete snapshot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600">Financial year:</label>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {listRecentFinancialYears(6).map((fy) => (
              <option key={fy} value={fy}>
                FY {fy} ({formatDateAustralian(`${fy.split('-')[0]}-07-01`)} –{' '}
                {formatDateAustralian(`${fy.split('-')[1]}-06-30`)})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetOverrides}
            className="text-sm text-gray-600 underline hover:text-gray-900"
          >
            Reset manual amounts
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {transactions.length} total transactions · {liveResult.uncategorisedCount} uncategorised
          in FY {financialYear}
        </p>
      </div>

      <LodgmentCalendar items={calendarItems} activeTab="individual" onSelectTab={() => {}} />

      {(!activeResult.validation.ok || activeResult.validation.warnings.length > 0) && (
        <div className="space-y-2 print:hidden">
          {activeResult.validation.errors.map((msg) => (
            <div
              key={msg}
              className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {msg}
            </div>
          ))}
          {activeResult.validation.warnings.map((msg) => (
            <div
              key={msg}
              className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {msg}
            </div>
          ))}
        </div>
      )}

      <div
        className={`card flex flex-wrap items-center justify-between gap-3 print:hidden ${
          allEntered ? 'bg-green-50 border-green-200' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {allEntered ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <FileText className="w-5 h-5 text-indigo-600" />
          )}
          <span className="text-sm font-medium">
            {enteredCount} of {totalFields} fields marked as entered in myTax
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFieldViewMode('ato_order')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
              fieldViewMode === 'ato_order'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            myTax entry order
          </button>
          <button
            type="button"
            onClick={() => setFieldViewMode('grouped')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
              fieldViewMode === 'grouped'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            By section
          </button>
        </div>
      </div>

      {preLodge && (
        <div className="card print:hidden">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Pre-lodge checklist</h3>
          <ul className="space-y-1">
            {preLodge.items.map((item) => (
              <li
                key={item.id}
                className={`flex items-start gap-2 text-sm ${
                  item.passed ? 'text-green-800' : 'text-gray-700'
                }`}
              >
                {item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <span>
                  {item.label}
                  {item.detail && (
                    <span className="block text-xs text-gray-500">{item.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="hidden print:block text-sm text-gray-700 mb-2">
        <strong>Personal Tax Return Entry Sheet</strong> · FY {financialYear} ·{' '}
        {formatDateAustralian(activeResult.periodStart)} –{' '}
        {formatDateAustralian(activeResult.periodEnd)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {fieldViewMode === 'ato_order' ? (
            <div className="card overflow-hidden p-0">
              <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                <h3 className="font-semibold text-gray-800">myTax entry order</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter fields top to bottom in myTax. Edit amounts inline where needed.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {fieldTableHead}
                  <tbody>{orderedFields.map((field) => renderFieldRow(field))}</tbody>
                </table>
              </div>
            </div>
          ) : (
            groupedFields.map(({ section, fields }) => (
              <div key={section} className="card overflow-hidden p-0">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">{sectionTitle(section)}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    {fieldTableHead}
                    <tbody>{fields.map((field) => renderFieldRow(field))}</tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card h-fit xl:sticky xl:top-4 print:hidden">
          <h3 className="font-semibold text-gray-900 mb-3">Where to enter in myTax</h3>
          {selectedField ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Selected field</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="font-medium text-indigo-700">{selectedField.label}</p>
                  <EntryKindBadge
                    kind={
                      selectedField.entryKind ??
                      (selectedField.source === 'manual' ? 'manual' : 'auto')
                    }
                  />
                </div>
                {selectedField.myTaxLabel && (
                  <p className="text-xs text-indigo-600 mt-1">
                    myTax label: {selectedField.myTaxLabel}
                  </p>
                )}
                <p className="text-2xl font-bold font-mono mt-1">
                  {formatCurrency(selectedField.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => copyAmount(selectedField)}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <ClipboardCopy className="w-4 h-4" />
                  Copy {amountForCopy(selectedField.amount)}
                </button>
              </div>
              {selectedField.atoScreenPath && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">myTax screen path</p>
                  <p className="text-sm text-gray-700">{selectedField.atoScreenPath}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Portal</p>
                <p className="text-sm font-medium">{portalLabel(selectedField.guide.atoPortal)}</p>
              </div>
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                {selectedField.guide.atoSteps.map((step, i) => (
                  <li key={i} className="leading-snug">
                    {step}
                  </li>
                ))}
              </ol>
              {selectedField.guide.helpUrl && (
                <a
                  href={selectedField.guide.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                >
                  ATO help
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a field to see myTax entry steps.</p>
          )}

          {!viewingSnapshot && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Bank hints (FY)</p>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Salary deposits</dt>
                  <dd className="font-mono">{formatCurrency(liveResult.bankHints.salaryDeposits)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Interest</dt>
                  <dd className="font-mono">{formatCurrency(liveResult.bankHints.interest)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Work deductions</dt>
                  <dd className="font-mono">{formatCurrency(liveResult.bankHints.workDeductions)}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      <ReportFooter />
    </div>
  )
}
