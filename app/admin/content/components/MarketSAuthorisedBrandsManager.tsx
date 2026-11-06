'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, X, ShieldCheck } from 'lucide-react'
import {
  useContentStore,
  type MarketSAuthorisedBrand,
} from '@/lib/contentStore'
import MediaUpload from '@/components/MediaUpload'
import { logAdminActivity } from '@/lib/logAdminActivity'

type BrandForm = {
  name: string
  tagline: string
  logoUrl: string
  linkUrl: string
  isActive: boolean
}

const emptyForm = (): BrandForm => ({
  name: '',
  tagline: '',
  logoUrl: '',
  linkUrl: '',
  isActive: true,
})

export default function MarketSAuthorisedBrandsManager() {
  const {
    marketSAuthorisedBrands,
    addMarketSAuthorisedBrand,
    updateMarketSAuthorisedBrand,
    deleteMarketSAuthorisedBrand,
    toggleMarketSAuthorisedBrandActive,
  } = useContentStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<MarketSAuthorisedBrand | null>(null)
  const [form, setForm] = useState<BrandForm>(emptyForm())

  const sorted = [...(marketSAuthorisedBrands || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  )

  const openModal = (brand?: MarketSAuthorisedBrand) => {
    if (brand) {
      setEditing(brand)
      setForm({
        name: brand.name || '',
        tagline: brand.tagline || '',
        logoUrl: brand.logoUrl || '',
        linkUrl: brand.linkUrl || '',
        isActive: brand.isActive !== false,
      })
    } else {
      setEditing(null)
      setForm(emptyForm())
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditing(null)
    setForm(emptyForm())
  }

  const handleSave = () => {
    const name = form.name.trim()
    if (!name) {
      alert('Brand name is required.')
      return
    }
    const payload = {
      name,
      tagline: form.tagline.trim(),
      logoUrl: form.logoUrl.trim(),
      linkUrl: form.linkUrl.trim(),
      isActive: form.isActive,
    }
    if (editing) {
      updateMarketSAuthorisedBrand(editing.id, payload)
      void logAdminActivity({
        action: 'cms_content_updated',
        target: editing.id,
        field: 'marketSAuthorisedBrands',
        oldValue: editing.name,
        newValue: name,
        description: `Market S authorised brand updated: ${name}`,
      })
    } else {
      addMarketSAuthorisedBrand({
        ...payload,
        order: sorted.length,
      })
      void logAdminActivity({
        action: 'cms_content_created',
        target: name,
        field: 'marketSAuthorisedBrands',
        newValue: name,
        description: `Market S authorised brand added: ${name}`,
      })
    }
    closeModal()
  }

  const handleDelete = (brand: MarketSAuthorisedBrand) => {
    if (!confirm(`Remove authorised brand “${brand.name}”?`)) return
    deleteMarketSAuthorisedBrand(brand.id)
    void logAdminActivity({
      action: 'cms_content_deleted',
      target: brand.id,
      field: 'marketSAuthorisedBrands',
      oldValue: brand.name,
      description: `Market S authorised brand removed: ${brand.name}`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Authorised brands
          </h2>
          <p className="text-gray-600 mt-1 max-w-2xl text-sm leading-relaxed">
            Partners shown on the Market S hub trust strip. Set the same name on each product&apos;s{' '}
            <strong>Brand</strong> field for the Authorised badge on cards and product pages. Homepage
            category Description stays a short benefit line — do not paste long brand copy there.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="shrink-0 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add brand
        </button>
      </div>

      <div className="grid gap-4">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-500">
            <p className="font-medium">No authorised brands yet</p>
            <p className="text-sm mt-1">Add DermaFirm or the next supply partner to show the hub trust strip.</p>
          </div>
        ) : (
          sorted.map((brand) => (
            <div
              key={brand.id}
              className={`bg-white rounded-lg border-2 p-5 ${
                brand.isActive ? 'border-emerald-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logoUrl}
                      alt=""
                      className="w-12 h-12 object-contain rounded bg-gray-50 border border-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                      {brand.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{brand.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          brand.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {brand.tagline ? (
                      <p className="text-sm text-gray-600">{brand.tagline}</p>
                    ) : null}
                    {brand.linkUrl ? (
                      <p className="text-xs text-gray-400 mt-1 truncate">{brand.linkUrl}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleMarketSAuthorisedBrandActive(brand.id)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {brand.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(brand)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(brand)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit authorised brand' : 'Add authorised brand'}
              </h3>
              <button type="button" onClick={closeModal} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. DermaFirm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must match the product Brand field (spacing/case tolerant).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Official authorised partner in Australia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo (optional)</label>
                <MediaUpload
                  type="image"
                  currentUrl={form.logoUrl}
                  usage="general-content"
                  onUpload={(_file: File, url: string) => {
                    setForm((f) => ({ ...f, logoUrl: url }))
                  }}
                  onRemove={() => setForm((f) => ({ ...f, logoUrl: '' }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
                <input
                  type="url"
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="https://…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Active on Market S hub
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
