'use client'

import type { ReactNode } from 'react'
import { Check, ClipboardCopy, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { portalLabel } from '@/lib/ato-lodgment/field-guides'
import type { LodgmentField } from '@/lib/ato-lodgment/types'
import { EntryKindBadge } from '@/components/Lodgment/EntryKindBadge'

function amountForCopy(amount: number): string {
  return amount.toFixed(2)
}

export interface LodgmentFieldGroup {
  section: string
  fields: LodgmentField[]
}

export interface LodgmentFieldPanelProps {
  orderedFields: LodgmentField[]
  groupedFields: LodgmentFieldGroup[]
  fieldViewMode: 'ato_order' | 'grouped'
  entered: Record<string, boolean>
  onToggleEntered: (fieldId: string) => void
  selectedField: LodgmentField | null
  onSelectField: (fieldId: string) => void
  copiedId: string | null
  onCopyField: (field: LodgmentField) => void
  editableFieldIds?: Set<string>
  onFieldAmountChange?: (fieldId: string, amount: number) => void
  readOnlyAmounts?: boolean
  showMyTaxLabel?: boolean
  fieldColumnLabel?: string
  orderTitle?: string
  orderHint?: string
  sectionTitle?: (section: string) => string
  portalTitle?: string
  portalFooter?: ReactNode
  emptyPortalMessage?: string
}

export function LodgmentFieldPanel({
  orderedFields,
  groupedFields,
  fieldViewMode,
  entered,
  onToggleEntered,
  selectedField,
  onSelectField,
  copiedId,
  onCopyField,
  editableFieldIds,
  onFieldAmountChange,
  readOnlyAmounts = false,
  showMyTaxLabel = true,
  fieldColumnLabel = 'ATO field',
  orderTitle = 'ATO entry order',
  orderHint = 'Enter fields top to bottom in the ATO portal.',
  sectionTitle = (s) => s,
  portalTitle = 'Where to enter in ATO',
  portalFooter,
  emptyPortalMessage = 'Select a field to see ATO entry steps.',
}: LodgmentFieldPanelProps) {
  const renderFieldRow = (field: LodgmentField) => {
    const isSelected = selectedField?.id === field.id
    const isEntered = !!entered[field.id]
    const kind = field.entryKind ?? (field.source === 'manual' ? 'manual' : 'auto')
    const isEditable =
      !readOnlyAmounts && editableFieldIds?.has(field.id) && onFieldAmountChange

    return (
      <tr
        key={field.id}
        onClick={() => onSelectField(field.id)}
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
              onToggleEntered(field.id)
            }}
            className="rounded border-gray-300 text-indigo-600"
            aria-label={`Entered ${field.label}`}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{field.label}</span>
            <EntryKindBadge kind={kind} />
          </div>
          {showMyTaxLabel && field.myTaxLabel && field.myTaxLabel !== field.label && (
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
              onChange={(e) => onFieldAmountChange(field.id, Number(e.target.value) || 0)}
              className="w-28 text-right font-mono font-semibold border border-gray-300 rounded px-2 py-1 text-sm"
            />
          ) : (
            <span className="font-mono font-semibold text-gray-900">
              {formatCurrency(field.amount)}
              <span className="text-xs text-gray-400 font-normal hidden print:inline print:ml-2">
                ({amountForCopy(field.amount)})
              </span>
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right print:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCopyField(field)
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
        <th className="px-4 py-2 font-medium">{fieldColumnLabel}</th>
        <th className="px-4 py-2 font-medium text-right">Amount</th>
        <th className="px-4 py-2 font-medium text-right w-28 print:hidden">Copy</th>
      </tr>
    </thead>
  )

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        {fieldViewMode === 'ato_order' ? (
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
              <h3 className="font-semibold text-gray-800">{orderTitle}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{orderHint}</p>
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
        <h3 className="font-semibold text-gray-900 mb-3">{portalTitle}</h3>
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
                onClick={() => onCopyField(selectedField)}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <ClipboardCopy className="w-4 h-4" />
                Copy {amountForCopy(selectedField.amount)}
              </button>
            </div>
            {selectedField.atoScreenPath && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ATO screen path</p>
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
          <p className="text-sm text-gray-500">{emptyPortalMessage}</p>
        )}
        {portalFooter}
      </div>
    </div>
  )
}
