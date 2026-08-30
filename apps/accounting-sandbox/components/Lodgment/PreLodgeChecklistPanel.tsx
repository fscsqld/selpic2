'use client'

import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import type { PreLodgeChecklistResult } from '@/lib/ato-lodgment/pre-lodge-checklist'
import type { LodgmentSnapshotPreLodge } from '@/lib/ato-lodgment/pre-lodge-checklist'

interface PreLodgeChecklistPanelProps {
  checklist: PreLodgeChecklistResult | LodgmentSnapshotPreLodge | null
  /** When viewing a saved snapshot, show frozen checklist from snapshot */
  frozenLabel?: string
  /** When nested in a collapsible, omit outer card chrome */
  embedded?: boolean
}

function isLiveChecklist(
  checklist: PreLodgeChecklistResult | LodgmentSnapshotPreLodge
): checklist is PreLodgeChecklistResult {
  return 'items' in checklist && checklist.items.length > 0 && 'label' in checklist.items[0]
}

export function PreLodgeChecklistPanel({
  checklist,
  frozenLabel,
  embedded = false,
}: PreLodgeChecklistPanelProps) {
  if (!checklist) return null

  const readyToLodge = checklist.readyToLodge
  const items = isLiveChecklist(checklist)
    ? checklist.items
    : checklist.items.map((item) => ({
        ...item,
        label: item.id.replace(/_/g, ' '),
        detail: item.blockingForReady ? 'Blocking for ready' : undefined,
      }))

  const failedRequired = items.filter((i) => i.severity === 'required' && !i.passed).length
  const failedBlocking = items.filter(
    (i) => i.severity === 'recommended' && i.blockingForReady && !i.passed
  ).length

  return (
    <div className={`${embedded ? 'print:hidden' : 'card print:hidden'}`}>
      <div
        className={`mb-3 rounded-lg border px-3 py-2 flex items-start gap-2 ${
          readyToLodge
            ? 'border-green-200 bg-green-50 text-green-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
      >
        {readyToLodge ? (
          <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-semibold">
            {readyToLodge
              ? 'Ready to lodge — copy amounts into ATO portal'
              : 'Not ready to lodge yet'}
          </p>
          <p className="text-xs mt-0.5 opacity-90">
            {frozenLabel ??
              (readyToLodge
                ? 'All required checks passed and blocking recommendations are complete.'
                : failedRequired > 0
                  ? `${failedRequired} required item(s) still failing.`
                  : failedBlocking > 0
                    ? `${failedBlocking} blocking recommendation(s) still open.`
                    : 'Complete remaining checklist items before lodging.')}
          </p>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-2">Pre-lodge checklist</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-start gap-2 text-sm ${
              item.passed ? 'text-green-800' : 'text-gray-700'
            }`}
          >
            {item.passed ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  item.severity === 'required' || item.blockingForReady
                    ? 'text-red-500'
                    : 'text-amber-500'
                }`}
              />
            )}
            <span>
              {item.label}
              {item.severity === 'required' && !item.passed && (
                <span className="ml-1 text-xs font-medium text-red-600">(required)</span>
              )}
              {item.blockingForReady && item.severity === 'recommended' && !item.passed && (
                <span className="ml-1 text-xs font-medium text-amber-700">(blocking)</span>
              )}
              {'detail' in item && item.detail && (
                <span className="block text-xs text-gray-500">{item.detail}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
