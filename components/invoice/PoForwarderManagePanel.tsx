'use client'

import { useState } from 'react'
import { Pencil, Plus, Save, Trash2, Truck } from 'lucide-react'
import { usePoForwarderStore } from '@/lib/poForwarderStore'
import {
  createEmptyForwarderDraft,
  type PoForwarderModeParams,
  type PoForwarderRecord,
} from '@/lib/poForwarderTypes'
import { HANA_ONE_EXPRESS_EXAMPLE } from '@/lib/poForwarderExample'
import { scheduleLogAdminActivity } from '@/lib/loadLogAdminActivity'

const field =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400'
const label = 'block text-xs font-medium text-gray-600 mb-1'

function ModeFields({
  title,
  value,
  onChange,
}: {
  title: string
  value: PoForwarderModeParams
  onChange: (next: PoForwarderModeParams) => void
}) {
  return (
    <div className="border border-slate-200 rounded-md p-3 space-y-2 bg-white">
      <p className="text-xs font-semibold text-slate-700">{title}</p>
      <div>
        <label className={label}>Destination label (마킹용)</label>
        <input
          className={field}
          placeholder="e.g. 브리즈번해상 (Sea) / 브리즈번항공 (Air)"
          value={value.destinationLabel}
          onChange={(e) => {
            const destinationLabel = e.target.value
            const prevLabel = value.destinationLabel
            const prevCarton = (value.cartonMarkingTemplate || '').trim()
            const looksAuto =
              !prevCarton ||
              /^SELPIC\s*\/\s*.+\s*\/\s*PO No:\s*\{PO_NUMBER\}$/i.test(prevCarton) ||
              (prevLabel && prevCarton.includes(prevLabel))
            onChange({
              ...value,
              destinationLabel,
              cartonMarkingTemplate: looksAuto
                ? destinationLabel
                  ? `SELPIC / ${destinationLabel} / PO No: {PO_NUMBER}`
                  : ''
                : value.cartonMarkingTemplate,
            })
          }}
        />
      </div>
      <div>
        <label className={label}>Recipient / Attn (수취인 명의)</label>
        <input
          className={field}
          placeholder="e.g. 브리즈번해상 — do not put SELPIC phone in Attn"
          value={value.recipientAttn}
          onChange={(e) => onChange({ ...value, recipientAttn: e.target.value })}
        />
      </div>
      <div>
        <label className={label}>Hub phone</label>
        <input
          className={field}
          placeholder="e.g. 010-2846-3366"
          value={value.hubPhone}
          onChange={(e) => onChange({ ...value, hubPhone: e.target.value })}
        />
      </div>
      <div>
        <label className={label}>Domestic address (KR warehouse)</label>
        <textarea
          className={field}
          rows={2}
          placeholder="e.g. 경기도 김포시 승가로 110-30 (SELPIC / +61 466 894 279)"
          value={value.domesticAddress}
          onChange={(e) => onChange({ ...value, domesticAddress: e.target.value })}
        />
      </div>
      <div>
        <label className={label}>Carton marking template (use {'{PO_NUMBER}'})</label>
        <input
          className={field}
          placeholder="SELPIC / 브리즈번해상 / PO No: {PO_NUMBER}"
          value={value.cartonMarkingTemplate}
          onChange={(e) => onChange({ ...value, cartonMarkingTemplate: e.target.value })}
        />
      </div>
    </div>
  )
}

type Props = {
  /** Called after a successful save — parent should re-apply onto the open PO. */
  onSaved?: (forwarder: PoForwarderRecord) => void
}

export default function PoForwarderManagePanel({ onSaved }: Props) {
  const forwarders = usePoForwarderStore((s) => s.forwarders)
  const upsertForwarder = usePoForwarderStore((s) => s.upsertForwarder)
  const deleteForwarder = usePoForwarderStore((s) => s.deleteForwarder)

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => createEmptyForwarderDraft())

  const startNew = () => {
    setEditingId('new')
    setDraft(createEmptyForwarderDraft())
    setOpen(true)
  }

  const startEdit = (f: PoForwarderRecord) => {
    setEditingId(f.id)
    setDraft({
      name: f.name,
      modes: {
        sea: { ...f.modes.sea },
        air: { ...f.modes.air },
      },
      isActive: f.isActive !== false,
    })
    setOpen(true)
  }

  const save = () => {
    if (!(draft.name || '').trim()) {
      alert('Enter the forwarder company name.')
      return
    }
    const saved = upsertForwarder({
      ...draft,
      id: editingId && editingId !== 'new' ? editingId : undefined,
    })
    scheduleLogAdminActivity({
      action: 'purchase_order_forwarder_saved',
      target: saved.id,
      description: `Saved PO forwarder ${saved.name} (Sea/Air modes)`,
    })
    setEditingId(null)
    setDraft(createEmptyForwarderDraft())
    onSaved?.(saved)
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50/70 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" />
          Forwarder master (관리자 등록 · Air/Sea)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white"
          >
            {open ? 'Hide' : 'Manage forwarders'}
          </button>
          <button
            type="button"
            onClick={startNew}
            className="text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add forwarder
          </button>
        </div>
      </div>
      <p className="text-[10px] text-slate-500">
        No hubs are pre-loaded by default. Register each logistics company with separate Sea and
        Air details (example schema: Hana One — 브리즈번해상/항공). Stored in this browser only.
      </p>

      {open ? (
        <div className="space-y-3">
          {editingId ? (
            <div className="border border-amber-100 bg-amber-50/40 rounded-md p-3 space-y-3">
              <div>
                <label className={label}>Forwarder name *</label>
                <input
                  className={field}
                  placeholder="e.g. company legal / trade name"
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <ModeFields
                  title="Sea Freight mode"
                  value={draft.modes.sea}
                  onChange={(sea) => setDraft((p) => ({ ...p, modes: { ...p.modes, sea } }))}
                />
                <ModeFields
                  title="Air Freight mode"
                  value={draft.modes.air}
                  onChange={(air) => setDraft((p) => ({ ...p, modes: { ...p.modes, air } }))}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={save}
                  className="text-xs px-3 py-2 rounded-md bg-slate-800 text-white inline-flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save forwarder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Optional fill of the edit form only — does not auto-save / seed the store.
                    setDraft({
                      name: HANA_ONE_EXPRESS_EXAMPLE.name,
                      modes: {
                        sea: { ...HANA_ONE_EXPRESS_EXAMPLE.modes.sea },
                        air: { ...HANA_ONE_EXPRESS_EXAMPLE.modes.air },
                      },
                      isActive: true,
                    })
                  }}
                  className="text-xs px-3 py-2 rounded-md border border-slate-300"
                  title="Fills the form with the approved Hana One schema example; you still click Save"
                >
                  Fill Hana One example
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setDraft(createEmptyForwarderDraft())
                  }}
                  className="text-xs px-3 py-2 rounded-md border border-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {forwarders.length === 0 && !editingId ? (
            <p className="text-xs text-slate-500">No forwarders registered yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {forwarders.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 text-xs bg-white border border-slate-100 rounded-md px-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">{f.name}</p>
                    <p className="text-slate-500 truncate">
                      Sea: {f.modes.sea.recipientAttn || f.modes.sea.destinationLabel || '—'} ·
                      Air: {f.modes.air.recipientAttn || f.modes.air.destinationLabel || '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 text-slate-500"
                    aria-label="Edit forwarder"
                    onClick={() => startEdit(f)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-red-500"
                    aria-label="Delete forwarder"
                    onClick={() => {
                      if (!confirm(`Delete forwarder “${f.name}”?`)) return
                      deleteForwarder(f.id)
                      scheduleLogAdminActivity({
                        action: 'purchase_order_forwarder_deleted',
                        target: f.id,
                        description: `Deleted PO forwarder ${f.name}`,
                      })
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
