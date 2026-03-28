'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Truck, MapPin, Clock, Package, X, Eye, EyeOff } from 'lucide-react'
import { useContentStore, ShippingOption, PickupLocation } from '@/lib/contentStore'
import PickupLocationManager from './PickupLocationManager'

export default function ShippingOptionsManager() {
  const {
    shippingOptions,
    pickupLocations,
    freeShippingSettings,
    addShippingOption,
    updateShippingOption,
    deleteShippingOption,
    toggleShippingOptionActive,
    getActivePickupLocations,
    updateFreeShippingSettings
  } = useContentStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<ShippingOption | null>(null)
  const [activeTab, setActiveTab] = useState<'shipping' | 'pickup'>('shipping')

  const openModal = (option?: ShippingOption) => {
    if (option) {
      setEditingOption(option)
    } else {
      setEditingOption(null)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingOption(null)
  }

  const handleSave = (formData: any) => {
    if (editingOption) {
      updateShippingOption(editingOption.id, formData)
    } else {
      addShippingOption({
        ...formData,
        order: shippingOptions.length + 1
      })
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this shipping option?')) {
      deleteShippingOption(id)
    }
  }

  const getPickupLocationName = (locationId?: string) => {
    if (!locationId) return 'Not selected'
    const location = pickupLocations.find(loc => loc.id === locationId)
    return location ? location.name : 'Not found'
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('shipping')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'shipping'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Shipping Options
          </div>
        </button>
        <button
          onClick={() => setActiveTab('pickup')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'pickup'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Pickup Locations
          </div>
        </button>
      </div>

      {/* Shipping Options Tab */}
      {activeTab === 'shipping' && (
        <div className="space-y-6">
          {/* 전역 무료 배송 설정 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Free Shipping Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={freeShippingSettings.enabled}
                  onChange={(e) => updateFreeShippingSettings({ enabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Enable Free Shipping</span>
              </label>
              
              {freeShippingSettings.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Free Shipping Threshold ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={freeShippingSettings.threshold}
                      onChange={(e) => updateFreeShippingSettings({ threshold: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Free Shipping Message
                    </label>
                    <input
                      type="text"
                      value={freeShippingSettings.message}
                      onChange={(e) => updateFreeShippingSettings({ message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Free shipping on orders over $50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Shipping Options</h2>
              <p className="text-gray-600 mt-1">Manage delivery and pickup shipping methods</p>
            </div>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Shipping Option
            </button>
          </div>

          <div className="grid gap-4">
            {shippingOptions.map((option) => (
              <div
                key={option.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  option.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">{option.name}</h3>
                      {option.isDefault && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Default
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          option.type === 'pickup'
                            ? 'bg-purple-100 text-purple-800'
                            : option.type === 'cash-on-delivery'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {option.type === 'pickup'
                          ? 'Pickup'
                          : option.type === 'cash-on-delivery'
                          ? 'Cash on Delivery'
                          : 'Delivery'}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          option.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {option.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">Price:</span>
                        <span>${option.price.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">Delivery Time:</span>
                        <span>{option.deliveryTime || 'Not specified'}</span>
                      </div>

                      {option.description && (
                        <p className="text-gray-700">{option.description}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs ${option.tracking ? 'text-green-600' : 'text-gray-400'}`}>
                          {option.tracking ? '✓ Tracking' : '✗ No Tracking'}
                        </span>
                        <span className={`text-xs ${option.insurance ? 'text-green-600' : 'text-gray-400'}`}>
                          {option.insurance ? '✓ Insurance' : '✗ No Insurance'}
                        </span>
                      </div>

                      {option.type === 'pickup' && option.pickupLocationId && (
                        <div className="mt-3 p-2 bg-purple-50 rounded border border-purple-200">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold text-purple-900">Pickup Location:</span>
                            <span className="text-purple-700">{getPickupLocationName(option.pickupLocationId)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openModal(option)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleShippingOptionActive(option.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        option.isActive
                          ? 'text-gray-600 hover:bg-gray-100'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={option.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {option.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {!option.isDefault && (
                      <button
                        onClick={() => handleDelete(option.id)}
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

          {shippingOptions.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No shipping options added yet.</p>
              <button
                onClick={() => openModal()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Option
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pickup Locations Tab */}
      {activeTab === 'pickup' && (
        <div>
          <PickupLocationManager />
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ShippingOptionModal
          option={editingOption}
          pickupLocations={getActivePickupLocations()}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

function ShippingOptionModal({
  option,
  pickupLocations,
  onSave,
  onClose
}: {
  option: ShippingOption | null
  pickupLocations: PickupLocation[]
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: option?.name || '',
    description: option?.description || '',
    price: option?.price || 0,
    deliveryTime: option?.deliveryTime || '',
    tracking: option?.tracking ?? false,
    insurance: option?.insurance ?? false,
    type: option?.type || 'delivery',
    pickupLocationId: option?.pickupLocationId || '',
    isDefault: option?.isDefault || false,
    isActive: option?.isActive ?? true,
    alwaysFree: option?.alwaysFree ?? false,
    freeShippingWhenThresholdMet: option?.freeShippingWhenThresholdMet ?? false,
    discountWhenThresholdMet: option?.discountWhenThresholdMet || 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.deliveryTime) {
      alert('Please fill in all required fields.')
      return
    }
    if (formData.type === 'pickup' && !formData.pickupLocationId) {
      alert('Please select a pickup location for pickup options.')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            {option ? 'Edit Shipping Option' : 'Add Shipping Option'}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option Name <span className="text-red-500">*</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                  placeholder="e.g., 2-8 business days"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Type Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Shipping Type</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.type === 'delivery'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="delivery"
                  checked={formData.type === 'delivery'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="mr-2"
                />
                <span className="font-medium">Delivery</span>
              </label>
              <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.type === 'pickup'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="pickup"
                  checked={formData.type === 'pickup'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="mr-2"
                />
                <span className="font-medium">Pickup</span>
              </label>
              <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.type === 'cash-on-delivery'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="cash-on-delivery"
                  checked={formData.type === 'cash-on-delivery'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="mr-2"
                />
                <span className="font-medium">Cash on Delivery</span>
              </label>
            </div>

            {formData.type === 'pickup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.pickupLocationId}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupLocationId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={formData.type === 'pickup'}
                >
                  <option value="">Select a pickup location</option>
                  {pickupLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} - {location.address}, {location.suburb}
                    </option>
                  ))}
                </select>
                {pickupLocations.length === 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    No pickup locations available. Please add a pickup location first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Features</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.tracking}
                  onChange={(e) => setFormData(prev => ({ ...prev, tracking: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Tracking Included</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.insurance}
                  onChange={(e) => setFormData(prev => ({ ...prev, insurance: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Insurance Included</span>
              </label>
            </div>
          </div>

          {/* Free Shipping Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Free Shipping Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.alwaysFree}
                  onChange={(e) => setFormData(prev => ({ ...prev, alwaysFree: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Always Free (e.g., Cash on Delivery)</span>
              </label>
              
              {!formData.alwaysFree && (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.freeShippingWhenThresholdMet}
                      onChange={(e) => setFormData(prev => ({ ...prev, freeShippingWhenThresholdMet: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Free when threshold is met</span>
                  </label>
                  
                  {!formData.freeShippingWhenThresholdMet && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount when threshold is met ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discountWhenThresholdMet}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountWhenThresholdMet: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 2.40"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Amount to discount when order reaches free shipping threshold
                      </p>
                    </div>
                  )}
                </>
              )}
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
                <span className="text-sm">Set as default shipping option</span>
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
              {option ? 'Update' : 'Create'} Option
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

