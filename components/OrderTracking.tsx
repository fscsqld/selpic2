'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'
import { Package, Truck, CheckCircle, XCircle, Clock, MapPin, Calendar, Info } from 'lucide-react'
import type { OrderRecord } from '@/lib/store'

interface OrderTrackingProps {
  order: OrderRecord
  isAdmin?: boolean
  onUpdateTracking?: (trackingInfo: OrderRecord['tracking']) => void
  onAddTrackingNumber?: (trackingNumber: string, provider: string) => void
  onUpdateStatus?: (status: string, location: string, description: string) => void
}

export default function OrderTracking({ 
  order, 
  isAdmin = false, 
  onUpdateTracking, 
  onAddTrackingNumber, 
  onUpdateStatus 
}: OrderTrackingProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAddTracking, setShowAddTracking] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [provider, setProvider] = useState('')
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const tracking = order.tracking

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'in_transit':
      case 'out_for_delivery':
        return <Truck className="w-5 h-5 text-blue-500" />
      case 'returned':
        return <XCircle className="w-5 h-5 text-orange-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'in_transit':
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'returned':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('ordersPage.inTransit')
      case 'in_transit':
        return t('ordersPage.inTransit')
      case 'out_for_delivery':
        return t('ordersPage.outForDelivery')
      case 'delivered':
        return t('ordersPage.delivered')
      case 'failed':
        return t('ordersPage.failedDelivery')
      case 'returned':
        return t('ordersPage.returned')
      default:
        return status
    }
  }

  const handleAddTracking = () => {
    if (trackingNumber.trim() && provider.trim()) {
      onAddTrackingNumber?.(trackingNumber.trim(), provider.trim())
      setTrackingNumber('')
      setProvider('')
      setShowAddTracking(false)
    }
  }

  const handleUpdateStatus = () => {
    if (newStatus && newLocation.trim() && newDescription.trim()) {
      onUpdateStatus?.(newStatus, newLocation.trim(), newDescription.trim())
      setNewStatus('')
      setNewLocation('')
      setNewDescription('')
      setShowStatusUpdate(false)
    }
  }

  if (!tracking) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">{t('ordersPage.tracking')}</h3>
            <p className="text-sm text-gray-500">{t('ordersPage.noTracking')}</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddTracking(true)}
              className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('admin.orders.addTrackingNumber')}
            </button>
          )}
        </div>

        {showAddTracking && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-3">{t('admin.orders.addTrackingNumber')}</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('ordersPage.trackingNumber')}
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tracking number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.orders.trackingProvider')}
                </label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., FedEx, UPS, DHL"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddTracking}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {t('admin.orders.addTrackingNumber')}
                </button>
                <button
                  onClick={() => setShowAddTracking(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">{t('ordersPage.tracking')}</h3>
              <p className="text-sm text-gray-500">
                {t('ordersPage.trackingNumber')}: {tracking.number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(tracking.status)}`}>
              {getStatusText(tracking.status)}
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Current Status */}
          <div className="flex items-center gap-3">
            {getStatusIcon(tracking.status)}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{getStatusText(tracking.status)}</p>
              {tracking.currentLocation && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {tracking.currentLocation}
                </p>
              )}
            </div>
          </div>

          {/* Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('ordersPage.estimatedDelivery')}</p>
                <p className="text-sm text-gray-500">
                  {new Date(tracking.estimatedDelivery).toLocaleDateString()}
                </p>
              </div>
            </div>
            {tracking.actualDelivery && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('ordersPage.actualDelivery')}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(tracking.actualDelivery).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery History */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">{t('ordersPage.deliveryHistory')}</h4>
            <div className="space-y-3">
              {tracking.history.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{event.description}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                      {event.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">{t('admin.orders.updateDeliveryStatus')}</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                    <option value="returned">Returned</option>
                  </select>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Location"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateStatus}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Update Status
                  </button>
                  <button
                    onClick={() => setShowStatusUpdate(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {tracking.notes && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('admin.orders.deliveryNotes')}</p>
                  <p className="text-sm text-gray-600">{tracking.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
