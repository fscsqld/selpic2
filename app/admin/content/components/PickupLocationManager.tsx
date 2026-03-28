'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, MapPin, Clock, Phone, Mail, X } from 'lucide-react'
import { useContentStore, PickupLocation } from '@/lib/contentStore'

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
] as const

export default function PickupLocationManager() {
  const {
    pickupLocations,
    addPickupLocation,
    updatePickupLocation,
    deletePickupLocation,
    togglePickupLocationActive
  } = useContentStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<PickupLocation | null>(null)

  const openModal = (location?: PickupLocation) => {
    if (location) {
      setEditingLocation(location)
    } else {
      setEditingLocation(null)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingLocation(null)
  }

  const handleSave = (formData: any) => {
    if (editingLocation) {
      updatePickupLocation(editingLocation.id, formData)
    } else {
      addPickupLocation({
        ...formData,
        order: pickupLocations.length + 1
      })
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this pickup location?')) {
      deletePickupLocation(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pickup Locations</h2>
          <p className="text-gray-600 mt-1">Manage Click & Collect pickup locations</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      <div className="grid gap-4">
        {pickupLocations.map((location) => (
          <div
            key={location.id}
            className={`bg-white rounded-lg border-2 p-6 ${
              location.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">{location.name}</h3>
                  {location.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      Default
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      location.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {location.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                    <div>
                      <p>{location.address}</p>
                      <p>
                        {location.suburb}, {location.state} {location.postcode}
                      </p>
                      <p>{location.country}</p>
                    </div>
                  </div>

                  {location.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{location.phone}</span>
                    </div>
                  )}

                  {location.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{location.email}</span>
                    </div>
                  )}

                  <div className="flex items-start gap-2 mt-3">
                    <Clock className="w-4 h-4 mt-0.5 text-gray-400" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {daysOfWeek.map((day) => {
                        const hours = location.businessHours[day.key]
                        if (!hours || hours.closed) {
                          return (
                            <div key={day.key}>
                              <span className="font-medium">{day.label}:</span> Closed
                            </div>
                          )
                        }
                        return (
                          <div key={day.key}>
                            <span className="font-medium">{day.label}:</span> {hours.open} - {hours.close}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {location.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <span className="font-medium">Notes:</span> {location.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => openModal(location)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => togglePickupLocationActive(location.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    location.isActive
                      ? 'text-gray-600 hover:bg-gray-100'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                  title={location.isActive ? 'Deactivate' : 'Activate'}
                >
                  {location.isActive ? '✓' : '○'}
                </button>
                {!location.isDefault && (
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {pickupLocations.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No pickup locations added yet.</p>
          <button
            onClick={() => openModal()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add First Location
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <PickupLocationModal
          location={editingLocation}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

function PickupLocationModal({
  location,
  onSave,
  onClose
}: {
  location: PickupLocation | null
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    suburb: location?.suburb || '',
    state: location?.state || '',
    postcode: location?.postcode || '',
    country: location?.country || 'Australia',
    phone: location?.phone || '',
    email: location?.email || '',
    notes: location?.notes || '',
    isDefault: location?.isDefault || false,
    isActive: location?.isActive ?? true,
    businessHours: location?.businessHours || {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '13:00', closed: false },
      sunday: { closed: true }
    }
  })

  const updateBusinessHours = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day as keyof typeof prev.businessHours],
          [field]: value
        }
      }
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.address || !formData.suburb || !formData.state || !formData.postcode) {
      alert('Please fill in all required fields.')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            {location ? 'Edit Pickup Location' : 'Add Pickup Location'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suburb <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.suburb}
                  onChange={(e) => setFormData(prev => ({ ...prev, suburb: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
            <div className="space-y-3">
              {daysOfWeek.map((day) => {
                const hours = formData.businessHours[day.key]
                return (
                  <div key={day.key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-24 font-medium text-sm">{day.label}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!hours?.closed}
                        onChange={(e) =>
                          updateBusinessHours(day.key, 'closed', !e.target.checked)
                        }
                        className="rounded"
                      />
                      <span className="text-sm">Open</span>
                    </label>
                    {!hours?.closed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={hours?.open || '09:00'}
                          onChange={(e) => updateBusinessHours(day.key, 'open', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm text-gray-600">to</span>
                        <input
                          type="time"
                          value={hours?.close || '17:00'}
                          onChange={(e) => updateBusinessHours(day.key, 'close', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Set as default pickup location</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {location ? 'Update' : 'Create'} Location
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

