'use client'

import { Package, Truck, MapPin, Calendar, User, CheckCircle, Clock, Navigation } from 'lucide-react'
import { COMPANY_LEGAL, COMPANY_LEGAL_LINE } from '@/lib/companyLegal'

interface ShippingNotificationProps {
  order: {
    id: string
    customer: {
      name: string
      firstName?: string
      lastName?: string
      email: string
      phone: string
    }
    address: {
      streetAddress: string
      suburb: string
      state: string
      postcode: string
      country: string
    }
    items: Array<{
      product: {
        name: string
        price: number
        image: string
      }
      quantity: number
      customizations?: Record<string, string>
    }>
    shippingOption: {
      name: string
      price: number
    }
    tracking?: {
      number: string
      provider: string
      status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned'
      estimatedDelivery: string
      actualDelivery?: string
      currentLocation?: string
      lastUpdate: string
      history?: Array<{
        timestamp: string
        status: string
        location: string
        description: string
      }>
      notes?: string
    }
    createdAtIso: string
  }
  company?: {
    name?: string
    abn?: string
    acn?: string
    phone?: string
    email?: string
    address?: string
  }
}

export default function ShippingNotificationTemplate({
  order,
  company
}: ShippingNotificationProps) {
  const T = {
    shippingNotification: 'Shipping Notification',
    orderNumber: 'Order Number',
    orderDate: 'Order Date',
    customerInfo: 'Customer Information',
    shippingAddress: 'Shipping Address',
    shippingMethod: 'Shipping Method',
    trackingNumber: 'Tracking Number',
    trackingProvider: 'Shipping Provider',
    estimatedDelivery: 'Estimated Delivery',
    currentLocation: 'Current Location',
    deliveryStatus: 'Delivery Status',
    trackingHistory: 'Tracking History',
    orderItems: 'Order Items',
    thankYou: 'Your order has been shipped!',
    contactInfo: 'Please contact us if you have any questions.',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    quantity: 'Quantity',
    companyName: company?.name || COMPANY_LEGAL.companyName,
    companyLegal: (company?.abn && company?.acn)
      ? `ABN: ${company.abn}\nACN: ${company.acn}`
      : COMPANY_LEGAL_LINE,
    companyEmail: company?.email || 'Email: info@selpic.com.au',
    companyAddress: company?.address || 'Mansfield QLD 4122',
    trackYourOrder: 'Track Your Order',
    onTheWay: 'Your order is on its way to you!',
    youCanTrack: 'You can track your shipment using the tracking number above.'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'failed':
      case 'returned':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5" />
      case 'out_for_delivery':
        return <Truck className="h-5 w-5" />
      case 'in_transit':
        return <Navigation className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getStatusText = (status?: string) => {
    if (!status) return 'Pending'
    switch (status) {
      case 'delivered':
        return 'Delivered'
      case 'out_for_delivery':
        return 'Out for Delivery'
      case 'in_transit':
        return 'In Transit'
      case 'pending':
        return 'Pending'
      case 'failed':
        return 'Failed'
      case 'returned':
        return 'Returned'
      default:
        return status
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
      {/* Header - Australian document format: legal name + ABN/ACN */}
      <div className="text-center border-b border-gray-200 pb-6 mb-6">
        <div className="mb-6 text-left">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{T.companyName}</h2>
          <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{T.companyLegal}</p>
        </div>
        <div className="flex items-center justify-center mb-4">
          <Package className="h-12 w-12 text-green-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">{T.shippingNotification}</h1>
        </div>
        <div className="text-gray-600">
          <p className="text-lg font-semibold text-green-700">{T.thankYou}</p>
          <p className="text-sm mt-2">{T.onTheWay}</p>
        </div>
      </div>

      {/* Tracking Number (강조 표시) */}
      {order.tracking?.number && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">{T.trackingNumber}</p>
              <p className="text-3xl font-bold text-green-700 mb-2 tracking-wider">
                {order.tracking.number}
              </p>
              {order.tracking.provider && (
                <p className="text-sm text-gray-600">
                  {T.trackingProvider}: <span className="font-semibold">{order.tracking.provider}</span>
                </p>
              )}
            </div>
            {order.tracking.status && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(order.tracking.status)}`}>
                {getStatusIcon(order.tracking.status)}
                <span className="font-semibold">{getStatusText(order.tracking.status)}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3 italic">{T.youCanTrack}</p>
        </div>
      )}

      {/* Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">{T.orderNumber}</p>
              <p className="text-lg font-semibold text-gray-900">{order.id}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">{T.orderDate}</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(order.createdAtIso)}</p>
            </div>
          </div>

          {order.tracking?.estimatedDelivery && (
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-500">{T.estimatedDelivery}</p>
                <p className="text-lg font-semibold text-green-700">
                  {formatDate(order.tracking.estimatedDelivery)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Truck className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">{T.shippingMethod}</p>
              <p className="text-lg font-semibold text-gray-900">{order.shippingOption.name}</p>
            </div>
          </div>

          {order.tracking?.currentLocation && (
            <div className="flex items-center space-x-3">
              <Navigation className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-500">{T.currentLocation}</p>
                <p className="text-lg font-semibold text-blue-700">{order.tracking.currentLocation}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-gray-500" />
          {T.customerInfo}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">{T.name}</p>
            <p className="font-semibold text-gray-900">{order.customer.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{T.email}</p>
            <p className="font-semibold text-gray-900">{order.customer.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{T.phone}</p>
            <p className="font-semibold text-gray-900">{order.customer.phone}</p>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          {T.shippingAddress}
        </h3>
        <div className="text-gray-900">
          <p className="font-semibold">{order.customer.name}</p>
          <p className="mt-1">{order.address.streetAddress}</p>
          <p>{order.address.suburb}, {order.address.state} {order.address.postcode}</p>
          <p>{order.address.country}</p>
        </div>
      </div>

      {/* Order Items */}
      {order.items && order.items.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{T.orderItems}</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                {item.product.image && (
                  <img 
                    src={item.product.image} 
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.product.name}</p>
                  <p className="text-sm text-gray-500">
                    {T.quantity}: {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking History */}
      {order.tracking?.history && order.tracking.history.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{T.trackingHistory}</h3>
          <div className="space-y-4">
            {order.tracking.history.map((entry, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{entry.description}</p>
                  <p className="text-sm text-gray-500">{entry.location}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(entry.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="text-center text-gray-600">
          <p className="font-semibold mb-2">{T.companyName}</p>
          <p className="text-sm">{T.companyAddress}</p>
          <p className="text-sm">{T.companyEmail}</p>
          <p className="text-xs text-gray-500 mt-4">{T.contactInfo}</p>
        </div>
      </div>
    </div>
  )
}

