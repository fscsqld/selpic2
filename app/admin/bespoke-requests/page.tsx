'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { Image as ImageIcon, Pencil, Search, X } from 'lucide-react'

type BespokeStickerRequestStatus = 'new' | 'reviewed' | 'approved' | 'rejected'

type BespokeStickerRequestRecord = {
  id: string
  createdAt: string
  status: BespokeStickerRequestStatus
  payload: any
  logo?: {
    fileUrl: string
    mimeType: string
    originalName: string
    size: number
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function statusBadge(status: BespokeStickerRequestStatus) {
  switch (status) {
    case 'new':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'reviewed':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export default function AdminBespokeRequestsPage() {
  return (
    <AdminRoute requiredPermissions={['messages:read']}>
      <AdminBespokeRequestsContent />
    </AdminRoute>
  )
}

function AdminBespokeRequestsContent() {
  const [records, setRecords] = useState<BespokeStickerRequestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<BespokeStickerRequestRecord | null>(null)
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records
    return records.filter((r) => {
      const c = r.payload?.contact || {}
      const fields = [
        r.id,
        r.status,
        c?.name,
        c?.email,
        c?.phone,
        c?.extra,
        r.payload?.roll?.preset,
                    r.payload?.roll?.variant,
        r.payload?.roll?.characterProductName,
        r.payload?.logo?.placementNotes
      ]
      return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q))
    })
  }, [records, search])

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bespoke-requests/stickers/custom', { credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch')
      setRecords(data.records || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const updateStatus = async (id: string, status: BespokeStickerRequestStatus) => {
    setStatusUpdatingId(id)
    try {
      const res = await fetch(`/api/bespoke-requests/stickers/custom/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed')
      await reload()
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev))
    } catch (e) {
      alert('Failed to update status.')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const deleteRequest = async (id: string) => {
    if (!confirm('Delete this bespoke label request? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/bespoke-requests/stickers/custom/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Delete failed')
      }
      setSelected(null)
      setSelectedNumber(null)
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Bespoke Label Requests"
        icon={<Pencil className="w-5 h-5 text-indigo-600" />}
        showLanguageSelector={false}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by id / email / notes..."
                className="w-full md:w-80 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={reload}
              className="px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecords.map((r, idx) => {
            const c = r.payload?.contact || {}
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelected(r)
                  setSelectedNumber(idx + 1)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelected(r)
                    setSelectedNumber(idx + 1)
                  }
                }}
                className="text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(r.createdAt)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      {c?.name || '(no name)'} {c?.email ? `(${c.email})` : ''}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Roll: {r.payload?.roll?.preset || '-'}
                      {r.payload?.roll?.variant ? ` (${r.payload.roll.variant})` : ''} | Layout: {r.payload?.text?.layout || '-'}
                    </div>
                    {r.payload?.roll?.characterProductName ? (
                      <div className="mt-1 text-xs text-gray-500">
                        Character roll: {r.payload.roll.characterProductName}
                      </div>
                    ) : null}
                    <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                      Logo notes: {r.payload?.logo?.placementNotes || '-'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteRequest(r.id)
                      }}
                      disabled={deletingId === r.id}
                      className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deletingId === r.id ? 'Deleting...' : 'Delete'}
                    </button>
                    {r.logo?.fileUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                        <img src={r.logo.fileUrl} alt="logo" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {filteredRecords.length === 0 && !loading ? (
            <div className="text-sm text-gray-500 lg:col-span-2">No requests found.</div>
          ) : null}
        </div>

        {selected ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-3xl bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl">
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                      Request #{selectedNumber ?? '-'}
                    </h2>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{formatDate(selected.createdAt)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null)
                    setSelectedNumber(null)
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-900">Logo preview</span>
                      </div>
                      <select
                        value={selected.status}
                        onChange={(e) => updateStatus(selected.id, e.target.value as BespokeStickerRequestStatus)}
                        disabled={statusUpdatingId === selected.id}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                      >
                        <option value="new">new</option>
                        <option value="reviewed">reviewed</option>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                      </select>
              <button
                type="button"
                onClick={() => deleteRequest(selected.id)}
                disabled={deletingId === selected.id}
                className="ml-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingId === selected.id ? 'Deleting...' : 'Delete'}
              </button>
                    </div>

                    {selected.logo?.fileUrl ? (
                      <img
                        src={selected.logo.fileUrl}
                        alt="logo"
                        className="mt-3 max-h-52 w-full object-contain rounded-xl border border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="mt-3 text-sm text-gray-500">No logo image uploaded.</div>
                    )}

                    {selected.logo?.originalName ? (
                      <div className="mt-2 text-xs text-gray-500">
                        {selected.logo.originalName} ({Math.max(1, Math.round(selected.logo.size / 1024))} KB)
                      </div>
                    ) : null}
                  </div>

                  <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-4">
                    <div className="text-sm font-semibold text-gray-900">Request details</div>

                    <div className="mt-3 text-xs text-gray-700 space-y-1">
                      <div><span className="text-gray-500">Contact:</span> {selected.payload?.contact?.name || '-'} ({selected.payload?.contact?.email || '-'})</div>
                      <div>
                        <span className="text-gray-500">Roll:</span> {selected.payload?.roll?.preset || '-'}
                        {selected.payload?.roll?.variant ? ` (${selected.payload.roll.variant})` : ''}
                        {selected.payload?.roll?.characterProductName ? ` - ${selected.payload.roll.characterProductName}` : ''}
                      </div>
                      <div>
                        {selected.payload?.roll?.notes ? (
                          <>
                            <span className="text-gray-500">Roll notes:</span> {selected.payload.roll.notes}
                          </>
                        ) : null}
                      </div>
                      <div><span className="text-gray-500">Text:</span> {selected.payload?.text?.layout || '-'} {selected.payload?.text?.line1 || ''}</div>
                      {selected.payload?.text?.layout === 'two' ? (
                        <div><span className="text-gray-500">Text line2:</span> {selected.payload?.text?.line2 || '-'}</div>
                      ) : null}
                      {selected.payload?.font?.presets?.mode === 'single' ? (
                        <div>
                          <span className="text-gray-500">Font preset:</span>{' '}
                          {selected.payload.font.presets.presetLabel || selected.payload.font.presets.presetId || '-'}
                        </div>
                      ) : selected.payload?.font?.presets?.mode === 'two' ? (
                        <div>
                          <span className="text-gray-500">Font presets:</span>{' '}
                          Line1 {selected.payload.font.presets.line1PresetLabel || selected.payload.font.presets.line1PresetId || '-'} / Line2{' '}
                          {selected.payload.font.presets.line2PresetLabel || selected.payload.font.presets.line2PresetId || '-'}
                        </div>
                      ) : null}
                      {selected.payload?.font?.sizes?.layout === 'single' ? (
                        <div>
                          <span className="text-gray-500">Font size:</span> {selected.payload.font.sizes.textPt ?? '-'} pt
                        </div>
                      ) : selected.payload?.font?.sizes?.layout === 'two' ? (
                        <div>
                          <span className="text-gray-500">Font sizes:</span> Line1 {selected.payload.font.sizes.line1Pt ?? '-'} pt / Line2{' '}
                          {selected.payload.font.sizes.line2Pt ?? '-'} pt
                        </div>
                      ) : null}
                      <div><span className="text-gray-500">Logo placement notes:</span> {selected.payload?.logo?.placementNotes || '-'}</div>
                    </div>
                  </div>
                </div>

                <details className="bg-white border border-gray-100 rounded-2xl p-4">
                  <summary className="text-sm font-semibold text-gray-900 cursor-pointer">Raw payload (debug)</summary>
                  <pre className="mt-2 text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

