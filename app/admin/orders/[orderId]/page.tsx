'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import OrderTracking from '@/components/OrderTracking'
import OrderEmailConfirmation from '@/components/OrderEmailConfirmation'
import { useStore, ORDER_PLATFORM_LABEL } from '@/lib/store'
import { useAdminAuth } from '@/lib/adminAuth'
import { useTranslation } from '@/lib/useTranslation'
import { getColorName } from '@/lib/colorUtils'
import { getOrderItemLineMoney } from '@/lib/orderItemLineTotals'
import { getCustomizationSurchargeLabel } from '@/lib/orderCustomizationSurcharge'
import { useContentStore } from '@/lib/contentStore'
import { ArrowLeft, Package, Truck, User, MapPin, CreditCard, Calendar, DollarSign, MessageSquare, Printer, Copy, X } from 'lucide-react'
import Link from 'next/link'
// Accounting is an independent app — HTTP bridge only (never import sandbox modules).
import { recordOrderToAccountingAsyncWithRetry } from '@/lib/admin/recordOrderToAccountingBridge'
import { openInternalShippingLabelPdf } from '@/lib/admin/shippingLabelClient'
import type { AdminShippingLabelSlot } from '@/lib/shipping/buildAdminShippingLabelPdf'
import { orderRequiresTrackingNumber, resolveOrderShippingSnapshot } from '@/lib/shipping/shippingSnapshot'
import { getShippingFulfillmentBadge } from '@/lib/shipping/shippingFulfillmentBadge'

const LABEL_SLOT_OPTIONS: Array<{ value: AdminShippingLabelSlot; label: string }> = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
]

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const { adminUser } = useAdminAuth()
  const {
    orders,
    addTrackingNumber,
    updateDeliveryStatus,
    sendOrderConfirmationEmail: sendOrderConfirmationEmailFromStore,
    resendOrderConfirmationEmail: resendOrderConfirmationEmailFromStore,
    sendReceiptEmail: sendReceiptEmailFromStore,
    refreshOrdersFromStorage,
    mergeOrdersFromServer,
  } = useStore()
  const performedBy = adminUser?.username || 'admin'
  const { getDefaultPickupLocation } = useContentStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showCustomerMessage, setShowCustomerMessage] = useState(false)
  const [isSendingReceipt, setIsSendingReceipt] = useState(false)
  const [ausPostLabelBusy, setAusPostLabelBusy] = useState(false)
  const [labelSlot, setLabelSlot] = useState<AdminShippingLabelSlot>('top-left')
  const [ledgerReady, setLedgerReady] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)

  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : params?.orderId
  const order = orders.find(o => o.id === orderId)
  const persistOrderPayloadToLedger = useCallback(
    async (targetOrderId: string) => {
      const latest = useStore.getState().orders.find((o) => o.id === targetOrderId)
      if (!latest) return
      const res = await fetch(`/api/orders/${encodeURIComponent(targetOrderId)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: latest }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save order.')
      }
      if (data.order) {
        mergeOrdersFromServer([data.order])
      }
    },
    [mergeOrdersFromServer]
  )

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    ;(async () => {
      refreshOrdersFromStorage()
      try {
        const res = await fetch('/api/orders', { cache: 'no-store', credentials: 'same-origin' })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.orders) && data.orders.length > 0) {
            mergeOrdersFromServer(data.orders)
          }
        }
        const hasLocal = useStore.getState().orders.some((o) => o.id === orderId)
        if (!hasLocal) {
          const r2 = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
            cache: 'no-store',
            credentials: 'same-origin',
          })
          if (r2.ok) {
            const d = await r2.json()
            if (d.order) mergeOrdersFromServer([d.order])
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLedgerReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId, mergeOrdersFromServer, refreshOrdersFromStorage])

  useEffect(() => {
    if (!ledgerReady) return
    if (!order) {
      router.push('/admin/orders')
    }
  }, [order, router, ledgerReady])

  const handleAddTrackingNumber = async (trackingNumber: string, provider: string) => {
    if (order) {
      setIsLoading(true)
      try {
        addTrackingNumber(order.id, trackingNumber, provider)
        await persistOrderPayloadToLedger(order.id)
        // Do not email here — dispatch email is sent once when status becomes shipped.
        alert('Tracking number added successfully!')
      } catch (error) {
        console.error('Error adding tracking number:', error)
        alert('Failed to add tracking number')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleUpdateDeliveryStatus = async (status: string, location: string, description: string) => {
    if (order) {
      setIsLoading(true)
      try {
        updateDeliveryStatus(order.id, status as any, location, description)
        await persistOrderPayloadToLedger(order.id)
        // Show success message
        alert('Delivery status updated successfully!')
      } catch (error) {
        console.error('Error updating delivery status:', error)
        alert('Failed to update delivery status')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // ✅ 주문 승인 핸들러 (Supabase 반영 + 회계 장부 자동 기록 포함)
  const handleApproveOrder = async () => {
    if (!order) return

    try {
      await patchLedgerStatus('approved')

      // 2. 회계 장부 자동 기록 (비동기, await 하지 않음, 재시도 로직 포함)
      recordOrderToAccountingAsyncWithRetry(
        {
          id: order.id,
          orderId: order.id,
          transactionDate: order.createdAtIso || new Date().toISOString(),
          amount: order.total - (order.gst || order.total / 11), // GST 제외한 금액
          gst: order.gst || order.total / 11, // GST 금액
          status: 'approved',
          paymentMethod: order.paymentMethod || 'card',
          metadata: {
            customerName: order.customer?.name || 'Unknown',
            customerEmail: order.customer?.email || '',
            items: order.items?.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })) || [],
          },
          createdAt: order.createdAtIso || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        adminUser?.username,
        adminUser?.role
      )
      
      // 3. 성공 메시지
      alert('Order approved successfully!')
    } catch (error) {
      console.error('Error approving order:', error)
      alert('Failed to approve order')
    }
  }

  const sendOrderConfirmationEmail = async (orderId: string) => {
    return sendOrderConfirmationEmailFromStore(orderId)
  }

  const resendOrderConfirmationEmail = async (orderId: string) => {
    return resendOrderConfirmationEmailFromStore(orderId)
  }

  const formatShippingOption = (optionId: string) => {
    if (!optionId) return '-'
    if (optionId === 'mansfield-same-day') return 'mansfield-free delivery'
    const labels: Record<string, string> = {
      'standard-letter': 'Standard Letter',
      'tracked-letter': 'Tracked Letter',
      'express-post': 'Express Post',
      'parcel-post': 'Parcel Post (Goods)',
      'local-pickup': 'Click & Collect (Mansfield)',
      'auspost-letter': 'Standard Letter (legacy)',
      'auspost-regular': 'Parcel Post (legacy)',
      'auspost-tracked': 'Parcel + Signature (legacy)',
      'auspost-express': 'Express Post (legacy)',
      'cash-on-delivery': 'Cash on Delivery (legacy)',
    }
    return labels[optionId] || optionId
  }

  const getBundleCategoryLabel = (category?: string) => {
    switch (category) {
      case 'Stickers':
        return '🏷️ Sticker'
      case 'Stamps':
        return '📮 Stamp'
      case 'PhoneCases':
        return '📱 Phone Case'
      case 'HotGoods':
        return '🔥 Market S'
      default:
        return category || 'Item'
    }
  }

  if (!order && !ledgerReady) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading order…</p>
          </div>
        </div>
      </AdminRoute>
    )
  }

  if (!order && ledgerReady) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Order not found</h1>
              <button 
                onClick={() => router.push('/admin/orders')} 
                className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Back to Orders
              </button>
            </div>
          </div>
        </div>
      </AdminRoute>
    )
  }

  if (!order) {
    return null
  }

  const isClickAndCollect =
    order.shippingOptionId === 'local-pickup' ||
    order.shippingOptionId === 'click-collect-mansfield' ||
    order.shippingOptionName?.toLowerCase().includes('click & collect')

  const generateCustomerMessage = () => {
    const customerName = order.customer.name
    const phoneNumber = order.customer.phone
    const orderId = order.id
    const orderDate = new Date(order.createdAtIso).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const itemList = order.items.map(item => `- ${item.name} (Qty: ${item.quantity})`).join('\n')
    
    // Get pickup location from content store
    const pickupLocation = getDefaultPickupLocation()
    
    // Format business hours
    const formatBusinessHours = () => {
      if (!pickupLocation?.businessHours) {
        return 'Monday - Friday: 9:00 AM - 5:00 PM\nSaturday: 9:00 AM - 1:00 PM\nSunday: Closed'
      }
      
      const days = [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' }
      ]
      
      return days.map(day => {
        const hours = pickupLocation.businessHours[day.key as keyof typeof pickupLocation.businessHours]
        if (!hours || hours.closed) {
          return `${day.label}: Closed`
        }
        return `${day.label}: ${hours.open} - ${hours.close}`
      }).join('\n')
    }
    
    const storeAddress = pickupLocation
      ? `${pickupLocation.address}\n${pickupLocation.suburb}, ${pickupLocation.state} ${pickupLocation.postcode}\n${pickupLocation.country}`
      : '7 Harvest St, Mansfield, QLD 4122, Australia'
    
    const storeName = pickupLocation?.name || 'Mansfield Store'
    const businessHours = formatBusinessHours()
    
    return `Hi ${customerName},

Your order ${orderId} is ready for pickup!

Order Date: ${orderDate}

Items:
${itemList}

You can collect your order from our ${storeName} during business hours. Please bring a valid ID for verification.

Store Location:
${storeAddress}

Business Hours:
${businessHours}

If you have any questions, please contact us.

Thank you for your order!

Selpic Team`
  }

  const handleCopyMessage = () => {
    const message = generateCustomerMessage()
    navigator.clipboard.writeText(message)
    alert('Message copied to clipboard!')
  }

  const handleOpenSMS = () => {
    const message = generateCustomerMessage()
    const phoneNumber = order.customer.phone.replace(/[^\d+]/g, '') // 숫자와 +만 남기기
    const smsLink = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`
    window.location.href = smsLink
  }

  const patchLedgerStatus = async (next: 'approved' | 'processing' | 'shipped') => {
    if (!order) return
    if (
      next === 'shipped' &&
      orderRequiresTrackingNumber(order) &&
      !(order.tracking?.number || '').trim()
    ) {
      alert('This order uses tracked shipping. Add a tracking number before marking it as shipped.')
      return
    }
    setStatusSaving(true)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, performedBy }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Update failed')
      }
      if (data.order) {
        mergeOrdersFromServer([data.order])
      }
      if (typeof data.warning === 'string' && data.warning) {
        alert(data.warning)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setStatusSaving(false)
    }
  }

  const handlePrintMessage = () => {
    const message = generateCustomerMessage()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Customer Notification - Order ${order.id}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                max-width: 600px;
                margin: 0 auto;
              }
              .header {
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
                margin-bottom: 20px;
              }
              .customer-info {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
              }
              .message {
                white-space: pre-wrap;
                line-height: 1.6;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
              }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Customer Notification Message</h1>
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="customer-info">
              <p><strong>Customer:</strong> ${order.customer.name}</p>
              <p><strong>Phone:</strong> ${order.customer.phone}</p>
            </div>
            <div class="message">${message}</div>
            <div class="footer">
              <p>Send this message to the customer via SMS or phone call.</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/orders')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Order {order.id}</h1>
                <p className="text-gray-500 mt-1">
                  Placed on {new Date(order.createdAtIso).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                order.status === 'processing' ? 'bg-purple-100 text-purple-800' :
                order.status === 'shipped' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {order.status.toUpperCase()}
              </span>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={
                    statusSaving ||
                    order.status === 'processing' ||
                    order.status === 'shipped' ||
                    order.status === 'cancelled'
                  }
                  onClick={() => patchLedgerStatus('processing')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-900 hover:bg-purple-100 disabled:opacity-50"
                >
                  <Package className="w-4 h-4" />
                  Ready (processing)
                </button>
                <button
                  type="button"
                  disabled={statusSaving || order.status === 'shipped' || order.status === 'cancelled'}
                  onClick={() => patchLedgerStatus('shipped')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-100 disabled:opacity-50"
                >
                  <Truck className="w-4 h-4" />
                  Shipped
                </button>
              </div>
              <p className="max-w-xs text-right text-xs text-gray-500">
                Updates Supabase only. Does not resend customer emails (confirmation and receipt were sent at checkout).
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Order Items
                </h2>
                <div className="divide-y divide-gray-100">
                  {order.items.map((item, index) => (
                    <div key={index} className="py-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            {(() => {
                              const { baseUnit, surchargeUnit, lineTotal } = getOrderItemLineMoney(item)
                              const qty = item.quantity
                              const baseTotal = baseUnit * qty
                              const optionsTotal = surchargeUnit * qty
                              const label =
                                optionsTotal > 0.001
                                  ? getCustomizationSurchargeLabel(item.customizations, { size: item.size })
                                  : ''

                              return (
                                <div>
                                  <p className="font-semibold">${baseTotal.toFixed(2)}</p>
                                  {optionsTotal > 0.001 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      + {label} +${optionsTotal.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      {item.bundleItems && item.bundleItems.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          <p className="font-semibold text-gray-700">Included Items:</p>
                          <div className="space-y-1 mt-1">
                            {item.bundleItems.map((bundleItem, idx) => (
                              <div
                                key={`${bundleItem.productId || bundleItem.name}-${idx}`}
                                className="flex items-center gap-2 pl-2"
                              >
                                <span className="font-medium">
                                  {getBundleCategoryLabel(bundleItem.category)} {bundleItem.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.customizations &&
                        Object.entries(item.customizations).filter(([key]) => !key.includes('customizedImage')).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {(item.customizations as any)?.bundleType === 'bundle' ? (
                            // 묶음 상품 커스터마이징 정보 표시
                            <div className="space-y-1">
                              <p className="font-semibold text-gray-700 mb-1">Bundle Customization:</p>
                              {Object.entries(item.customizations)
                                .filter(([key]) => key !== 'bundleType' && !key.includes('customizedImage'))
                                .map(([key, value]) => {
                                  const parts = key.split('_')
                                  if (parts.length >= 3) {
                                    const category = parts[0]
                                    const index = parts[1]
                                    const option = parts.slice(2).join('_')
                                    
                                    const categoryLabel = category === 'sticker' ? '🏷️ Sticker' : 
                                                         category === 'stamp' ? '📮 Stamp' : 
                                                         category === 'phoneCase' ? '📱 Phone Case' : category
                                    
                                    const isColor = option === 'color' && String(value).startsWith('#')
                                    const isFont = option === 'font'
                                    
                                    return (
                                      <div key={key} className={isFont ? 'space-y-1 pl-2' : 'flex items-center gap-2 pl-2'}>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{categoryLabel} {parseInt(index) + 1} - {option}:</span>
                                          {isColor ? (
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-4 h-4 rounded border border-gray-300"
                                                style={{ backgroundColor: String(value) }}
                                                title={String(value)}
                                              />
                                              <span className="font-medium">{getColorName(String(value))}</span>
                                            </div>
                                          ) : (
                                            <span>{String(value)}</span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                })}
                            </div>
                          ) : (item.customizations as any)?.setType === 'set' ? (
                            // SET 상품 커스터마이징 정보 표시 (일반 스티커 형식으로)
                            (() => {
                              // SET 아이템들을 그룹화
                              const setItems: Record<number, { designName?: string; text?: string; font?: string; color?: string }> = {}
                              
                              Object.entries(item.customizations).forEach(([key, value]) => {
                                if (key.startsWith('item') && (key.includes('_designName') || key.includes('_text') || key.includes('_font') || key.includes('_color'))) {
                                  const match = key.match(/item(\d+)_(designName|text|font|color)/)
                                  if (match) {
                                    const itemIndex = parseInt(match[1])
                                    const optionType = match[2] as 'designName' | 'text' | 'font' | 'color'
                                    if (!setItems[itemIndex]) {
                                      setItems[itemIndex] = {}
                                    }
                                    setItems[itemIndex][optionType] = String(value)
                                  }
                                }
                              })
                              
                              return (
                                <div className="space-y-2">
                                  {Object.entries(setItems)
                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                    .map(([index, options]) => (
                                      <div key={index} className="space-y-1 pl-2 border-l-2 border-blue-200">
                                        <p className="font-semibold text-gray-700 mb-1">Item {index}</p>
                                        {options.designName && options.designName !== item.name && (
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">Design:</span>
                                            <span>{options.designName}</span>
                                          </div>
                                        )}
                                        {options.text && (
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">Text:</span>
                                            <span>{options.text}</span>
                                          </div>
                                        )}
                                        {options.font && (
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">Font:</span>
                                            <span>{options.font}</span>
                                          </div>
                                        )}
                                        {options.color && (
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">Color:</span>
                                            {options.color.startsWith('#') ? (
                                              <div className="flex items-center gap-2">
                                                <div 
                                                  className="w-4 h-4 rounded border border-gray-300"
                                                  style={{ backgroundColor: options.color }}
                                                  title={options.color}
                                                />
                                                <span className="font-medium">{getColorName(options.color)}</span>
                                              </div>
                                            ) : (
                                              <span>{options.color}</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )
                            })()
                          ) : (
                            // 일반 상품 커스터마이징 정보 표시 (상품명과 동일한 값은 중복이므로 제외)
                            Object.entries(item.customizations)
                              .filter(([key, value]) => !key.includes('customizedImage') && String(value).trim() !== item.name)
                              .map(([key, value]) => {
                                const isColor = key.toLowerCase() === 'color' && String(value).startsWith('#')
                                const isFont = key.toLowerCase() === 'font'
                                return (
                                  <div key={key} className={isFont ? 'space-y-1' : 'flex items-center gap-2'}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium capitalize">{key}:</span>
                                      {isColor ? (
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-6 h-6 rounded border border-gray-300"
                                            style={{ backgroundColor: String(value) }}
                                            title={String(value)}
                                          />
                                          <span className="font-medium">{getColorName(String(value))}</span>
                                        </div>
                                      ) : (
                                        <span>{String(value)}</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Customer Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Contact Details</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      {order.customer.firstName && order.customer.lastName ? (
                        <>
                          <p><span className="font-medium">First Name:</span> {order.customer.firstName}</p>
                          <p><span className="font-medium">Last Name:</span> {order.customer.lastName}</p>
                        </>
                      ) : (
                        <p><span className="font-medium">Name:</span> {order.customer.name}</p>
                      )}
                      <p><span className="font-medium">Email:</span> {order.customer.email}</p>
                      <p><span className="font-medium">Phone:</span> {order.customer.phone}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Shipping Address</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      {isClickAndCollect ? (
                        <>
                          <p className="font-semibold text-gray-900">Click & Collect (Mansfield)</p>
                          <p>Local pickup – order will be held at the Mansfield store for customer collection.</p>
                          <p className="text-gray-500 text-xs">
                            Customer: {order.customer.name} · {order.customer.phone}
                          </p>
                        </>
                      ) : (
                        <p className="whitespace-pre-line">
                          {order.address.streetAddress && (order.address.suburb || order.address.state || order.address.postcode)
                            ? [order.address.streetAddress, [order.address.suburb, order.address.state, order.address.postcode, order.address.country].filter(Boolean).join(' ')].join(', ')
                            : (order.address.asSingleLine || '')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Tracking */}
              <OrderTracking 
                order={order}
                isAdmin={true}
                onAddTrackingNumber={handleAddTrackingNumber}
                onUpdateStatus={handleUpdateDeliveryStatus}
              />

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-red-600" />
                  AusPost shipping label
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Generates a printable PDF for <strong>Avery L7169 / AV959020 A4 4-up</strong>. Choose the exact sheet
                  position before printing so a partially used label sheet still aligns correctly.
                </p>
                {isClickAndCollect ? (
                  <p className="text-sm text-gray-500">Click &amp; Collect — postal label not required.</p>
                ) : (
                  <>
                    {order.ausPostShippingLabel?.status === 'created' ? (
                      <p className="text-sm text-green-700 mb-3">
                        Label on file
                        {order.ausPostShippingLabel.updatedAtIso
                          ? ` · updated ${new Date(order.ausPostShippingLabel.updatedAtIso).toLocaleString()}`
                          : ''}
                        .
                      </p>
                    ) : (
                      <p className="text-sm text-amber-800 mb-3">Not generated yet.</p>
                    )}
                    <div className="mb-3 max-w-xs">
                      <label className="mb-1 block text-xs font-medium text-gray-700">Sheet position</label>
                      <select
                        value={labelSlot}
                        onChange={(e) => setLabelSlot(e.target.value as AdminShippingLabelSlot)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {LABEL_SLOT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={ausPostLabelBusy}
                        onClick={async () => {
                          if (!order) return
                          setAusPostLabelBusy(true)
                          try {
                            const r = await openInternalShippingLabelPdf(order.id, {
                              force: false,
                              slot: labelSlot,
                              onOrderMerged: (o) => mergeOrdersFromServer([o]),
                            })
                            if (!r.ok) alert(r.error || 'Failed to generate label.')
                          } finally {
                            setAusPostLabelBusy(false)
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {order.ausPostShippingLabel?.status === 'created' ? 'Open label (PDF)' : 'Generate label (PDF)'}
                      </button>
                      <button
                        type="button"
                        disabled={ausPostLabelBusy || order.ausPostShippingLabel?.status !== 'created'}
                        onClick={async () => {
                          if (!order) return
                          setAusPostLabelBusy(true)
                          try {
                            const r = await openInternalShippingLabelPdf(order.id, {
                              force: true,
                              slot: labelSlot,
                              onOrderMerged: (o) => mergeOrdersFromServer([o]),
                            })
                            if (!r.ok) alert(r.error || 'Failed to regenerate label.')
                          } finally {
                            setAusPostLabelBusy(false)
                          }
                        }}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                      >
                        Regenerate
                      </button>
                      <button
                        type="button"
                        disabled={ausPostLabelBusy || order.ausPostShippingLabel?.status !== 'created'}
                        onClick={async () => {
                          if (!order) return
                          setAusPostLabelBusy(true)
                          try {
                            const res = await fetch(
                              `/api/admin/shipping/auspost/label?orderId=${encodeURIComponent(order.id)}&slot=${encodeURIComponent(labelSlot)}`,
                              { credentials: 'same-origin' }
                            )
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}))
                              alert(typeof data.error === 'string' ? data.error : 'Download failed.')
                              return
                            }
                            const blob = await res.blob()
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `shipping-label-${order.id.replace(/[^a-zA-Z0-9_-]+/g, '')}.pdf`
                            a.click()
                            window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
                          } finally {
                            setAusPostLabelBusy(false)
                          }
                        }}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                      >
                        Download PDF
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      PDFs are generated on the server and stored in the order ledger metadata. Regenerate after address or
                      personalization changes.
                    </p>
                  </>
                )}
              </div>

              {/* Order Email Confirmation */}
              <OrderEmailConfirmation 
                order={order}
                isAdmin={true}
                onSendEmail={() => sendOrderConfirmationEmail(order.id)}
                onResendEmail={() => resendOrderConfirmationEmail(order.id)}
              />

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  Receipt email (PDF)
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  {order.paymentMethod === 'bank'
                    ? 'Bank transfer: send the receipt PDF after you confirm the customer deposit.'
                    : 'Sends the order receipt as a PDF attachment (same as checkout for card payments).'}
                </p>
                {order.receiptEmail?.sent ? (
                  <p className="text-sm text-green-700 mb-3">
                    Sent{order.receiptEmail.sentAt ? ` on ${new Date(order.receiptEmail.sentAt).toLocaleString()}` : ''}.
                  </p>
                ) : (
                  <p className="text-sm text-amber-800 mb-3">Not sent yet.</p>
                )}
                <button
                  type="button"
                  disabled={isSendingReceipt}
                  onClick={async () => {
                    if (!order) return
                    setIsSendingReceipt(true)
                    try {
                      const ok = await sendReceiptEmailFromStore(order.id)
                      alert(ok ? 'Receipt email sent.' : 'Failed to send receipt email.')
                    } finally {
                      setIsSendingReceipt(false)
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                >
                  {isSendingReceipt ? 'Sending…' : order.receiptEmail?.sent ? 'Send receipt again' : 'Send receipt email'}
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  Order Summary
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform:</span>
                    <span className="font-medium">
                      {ORDER_PLATFORM_LABEL[order.platformSource ?? 'website']}
                    </span>
                  </div>
                  {order.externalOrderKey ? (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>External key:</span>
                      <span className="font-mono break-all text-right max-w-[60%]">{order.externalOrderKey}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${order.subtotal.toFixed(2)}</span>
                  </div>
                  {(order.shippingPrice == null || order.shippingPrice > 0) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping:</span>
                      <span className="font-medium">${(order.shippingPrice ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                  {order.paymentFee && order.paymentFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Fee:</span>
                      <span className="font-medium">${order.paymentFee.toFixed(2)}</span>
                    </div>
                  )}
                  {/* VIP 등급 할인 표시 */}
                  {order.vipDiscount && order.vipDiscount > 0 && (
                    <div className="flex justify-between text-purple-600 font-medium">
                      <span>VIP {order.vipGradeName || `Grade ${order.vipGradeCode}`} Discount</span>
                      <span>-${order.vipDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* 프로모션 코드 할인 표시 */}
                  {order.promoDiscount && order.promoDiscount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Promo Code Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                      <span>-${order.promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* 총 할인 표시 (VIP + 프로모션) */}
                  {order.discount && order.discount > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Subtotal + Shipping{order.paymentFee && order.paymentFee > 0 ? ' + Payment Fee' : ''}</span>
                        <span>${(order.subtotal + order.shippingPrice + (order.paymentFee || 0)).toFixed(2)}</span>
                      </div>
                      {order.vipDiscount && order.vipDiscount > 0 && (
                        <div className="flex justify-between text-xs text-purple-600 font-medium">
                          <span>VIP {order.vipGradeName || `Grade ${order.vipGradeCode}`} Discount</span>
                          <span>-${order.vipDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {order.promoDiscount && order.promoDiscount > 0 && (
                        <div className="flex justify-between text-xs text-green-600 font-medium">
                          <span>Promo Code Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                          <span>-${order.promoDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-700 font-semibold mt-1">
                        <span>Total Discount</span>
                        <span>-${order.discount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between text-base font-semibold">
                    <span>Total:</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                  {order.promoCode && (
                    <div className="mt-2 text-xs text-gray-500">
                      Promo Code: <span className="font-mono font-semibold text-green-600">{order.promoCode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment & Shipping */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Payment & Shipping
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium capitalize">{order.paymentMethod}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-600">Shipping Option:</span>
                    <span className="font-medium">
                      {resolveOrderShippingSnapshot(order).shippingOptionName ||
                        formatShippingOption(order.shippingOptionId)}
                    </span>
                    {(() => {
                      const badge = getShippingFulfillmentBadge(order)
                      return (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Delivery window:</span>
                    <span className="font-medium">
                      {resolveOrderShippingSnapshot(order).shippingDeliveryTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Shipping charged:</span>
                    <span className="font-medium">${Number(order.shippingPrice || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium">
                      {new Date(order.createdAtIso).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  {/* ✅ 주문 승인 버튼 추가 */}
                  <button
                    onClick={() => {
                      void handleApproveOrder()
                    }}
                    disabled={statusSaving || order.status === 'approved'}
                    className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {order.status === 'approved' ? 'Already Approved' : 'Approve Order'}
                  </button>
                  <button
                    onClick={() => {
                      void patchLedgerStatus('processing')
                    }}
                    disabled={statusSaving || order.status === 'processing'}
                    className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Mark as Processing
                  </button>
                  <button
                    onClick={() => {
                      void patchLedgerStatus('shipped')
                    }}
                    disabled={statusSaving || order.status === 'shipped'}
                    className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Mark as Shipped
                  </button>
                  {isClickAndCollect && (
                    <button
                      onClick={() => setShowCustomerMessage(true)}
                      className="w-full px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Generate Customer Message
                    </button>
                  )}
                  <Link
                    href={`/admin/orders/${order.id}/packing-slip`}
                    className="block w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center transition-colors"
                  >
                    View Packing Slip
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Message Modal */}
        {showCustomerMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-orange-600" />
                  Customer Notification Message
                </h2>
                <button
                  onClick={() => setShowCustomerMessage(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{order.customer.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-2 font-medium">{order.customer.phone}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Order ID:</span>
                      <span className="ml-2 font-medium">{order.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Order Date:</span>
                      <span className="ml-2 font-medium">
                        {new Date(order.createdAtIso).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Preview */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Message Preview</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                      {generateCustomerMessage()}
                    </pre>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      onClick={handleOpenSMS}
                      className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Send SMS (Mobile)
                    </button>
                    <button
                      onClick={handleCopyMessage}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy to Clipboard
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrintMessage}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Print Message
                    </button>
                    <button
                      onClick={() => setShowCustomerMessage(false)}
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Instructions:</strong>
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li><strong>Mobile:</strong> Click "Send SMS (Mobile)" to open your SMS app with the message pre-filled.</li>
                    <li><strong>Desktop:</strong> Click "Copy to Clipboard" and paste into your messaging app.</li>
                    <li>You can also print this page for your records.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}
