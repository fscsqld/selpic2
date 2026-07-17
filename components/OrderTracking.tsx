'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'
import { Package, Truck, CheckCircle, XCircle, Clock, MapPin, Calendar, Info, ClipboardPaste, ExternalLink } from 'lucide-react'
import type { OrderRecord } from '@/lib/store'
import {
  buildAusPostTrackUrl,
  normalizePastedTrackingInput,
} from '@/lib/shipping/normalizePastedTracking'

interface OrderTrackingProps {
  order: OrderRecord
  isAdmin?: boolean
  onUpdateTracking?: (trackingInfo: OrderRecord['tracking']) => void
  onAddTrackingNumber?: (trackingNumber: string, provider: string) => void
  onUpdateStatus?: (status: string, location: string, description: string) => void
}

const PROVIDER_AUSPOST = 'Australia Post'

export default function OrderTracking({
  order,
  isAdmin = false,
  onAddTrackingNumber,
  onUpdateStatus,
}: OrderTrackingProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAddTracking, setShowAddTracking] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [providerMode, setProviderMode] = useState<'auspost' | 'other'>('auspost')
  const [otherProvider, setOtherProvider] = useState('')
  const [pasteHint, setPasteHint] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const tracking = order.tracking
  const resolvedProvider =
    providerMode === 'auspost' ? PROVIDER_AUSPOST : otherProvider.trim()

  const applyPastedValue = (raw: string) => {
    const normalized = normalizePastedTrackingInput(raw)
    if (!normalized.number) {
      setPasteHint('Could not read a tracking number from that paste.')
      return
    }
    setTrackingNumber(normalized.number)
    if (normalized.providerHint === PROVIDER_AUSPOST) {
      setProviderMode('auspost')
      setPasteHint('Australia Post tracking detected from paste.')
    } else {
      setPasteHint('Tracking number cleaned from paste.')
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      applyPastedValue(text)
    } catch {
      setPasteHint('Clipboard access blocked — paste into the field with Ctrl+V.')
    }
  }

  const openAddForm = (prefill = false) => {
    setShowAddTracking(true)
    setPasteHint('')
    if (prefill && tracking?.number) {
      setTrackingNumber(tracking.number)
      setProviderMode(
        (tracking.provider || '').toLowerCase().includes('australia') ||
          (tracking.provider || '').toLowerCase().includes('auspost')
          ? 'auspost'
          : 'other'
      )
      if (
        tracking.provider &&
        !(
          tracking.provider.toLowerCase().includes('australia') ||
          tracking.provider.toLowerCase().includes('auspost')
        )
      ) {
        setOtherProvider(tracking.provider)
      }
    } else {
      setTrackingNumber('')
      setProviderMode('auspost')
      setOtherProvider('')
    }
  }

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
    if (trackingNumber.trim() && resolvedProvider) {
      onAddTrackingNumber?.(trackingNumber.trim(), resolvedProvider)
      setTrackingNumber('')
      setOtherProvider('')
      setProviderMode('auspost')
      setPasteHint('')
      setShowAddTracking(false)
    }
  }

  const handleUpdateStatus = () => {
    if (newStatus && newLocation.trim() && newDescription.trim()) {
      onUpdateStatus?.(newStatus, newLocation.trim(), newDescription.trim())
      setNewStatus('')
      setNewLocation('')
      setNewDescription('')
    }
  }

  const addTrackingForm = (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <h4 className="font-medium text-gray-900 mb-1">
        {tracking?.number ? 'Update tracking number' : t('admin.orders.addTrackingNumber')}
      </h4>
      {isAdmin && (
        <p className="mb-3 text-sm text-gray-600">
          Paste the tracking number (or AusPost track link) from{' '}
          <strong>MyPost Business</strong>. Provider defaults to Australia Post. Customer email
          still sends when you mark the order <strong>Shipped</strong>.
        </p>
      )}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('ordersPage.trackingNumber')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text')
                if (pasted && (pasted.includes('http') || /\s/.test(pasted))) {
                  e.preventDefault()
                  applyPastedValue(pasted)
                }
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder="Paste MyPost tracking # or AusPost track URL"
              autoFocus
            />
            {isAdmin && (
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <ClipboardPaste className="h-4 w-4" />
                Paste
              </button>
            )}
          </div>
          {pasteHint ? <p className="mt-1 text-xs text-green-700">{pasteHint}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('admin.orders.trackingProvider')}
          </label>
          <select
            value={providerMode}
            onChange={(e) => setProviderMode(e.target.value as 'auspost' | 'other')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="auspost">Australia Post (MyPost Business)</option>
            <option value="other">Other carrier</option>
          </select>
          {providerMode === 'other' ? (
            <input
              type="text"
              value={otherProvider}
              onChange={(e) => setOtherProvider(e.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder="Carrier name"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAddTracking}
            disabled={!trackingNumber.trim() || !resolvedProvider}
            className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {tracking?.number ? 'Save tracking' : t('admin.orders.addTrackingNumber')}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddTracking(false)
              setPasteHint('')
            }}
            className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  if (!tracking) {
    return (
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">{t('ordersPage.tracking')}</h3>
            <p className="text-sm text-gray-500">{t('ordersPage.noTracking')}</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => openAddForm(false)}
              className="ml-auto rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
            >
              {t('admin.orders.addTrackingNumber')}
            </button>
          )}
        </div>
        {showAddTracking ? addTrackingForm : null}
      </div>
    )
  }

  const ausPostUrl = buildAusPostTrackUrl(tracking.number)

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Package className="h-6 w-6 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900">{t('ordersPage.tracking')}</h3>
              <p className="truncate text-sm text-gray-500">
                {t('ordersPage.trackingNumber')}: {tracking.number}
                {tracking.provider ? ` · ${tracking.provider}` : ''}
              </p>
              {ausPostUrl &&
              (tracking.provider || '').toLowerCase().includes('australia') ? (
                <a
                  href={ausPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  Open AusPost track
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(tracking.status)}`}
            >
              {getStatusText(tracking.status)}
            </span>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => openAddForm(true)}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
              >
                Update #
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
            >
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>
      </div>

      {showAddTracking ? <div className="px-4 pb-2">{addTrackingForm}</div> : null}

      {isExpanded && (
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            {getStatusIcon(tracking.status)}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{getStatusText(tracking.status)}</p>
              {tracking.currentLocation && (
                <p className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  {tracking.currentLocation}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('ordersPage.estimatedDelivery')}</p>
                <p className="text-sm text-gray-500">
                  {new Date(tracking.estimatedDelivery).toLocaleDateString()}
                </p>
              </div>
            </div>
            {tracking.actualDelivery && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('ordersPage.actualDelivery')}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(tracking.actualDelivery).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-3 font-medium text-gray-900">{t('ordersPage.deliveryHistory')}</h4>
            <div className="space-y-3">
              {tracking.history.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-2 h-2 w-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{event.description}</p>
                    <p className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                      {event.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
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

          {isAdmin && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="mb-3 font-medium text-gray-900">{t('admin.orders.updateDeliveryStatus')}</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
                    className="rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description"
                    className="rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  Update Status
                </button>
              </div>
            </div>
          )}

          {tracking.notes && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 text-gray-400" />
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
