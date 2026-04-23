'use client'

import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import OrderTracking from '@/components/OrderTracking'
import OrderEmailConfirmation from '@/components/OrderEmailConfirmation'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { formatAuPhoneHyphen } from '@/lib/phone'
import { useTranslation } from '@/lib/useTranslation'
import { useCustomerOrdersLedgerSync } from '@/lib/useCustomerOrdersLedgerSync'
import { getColorName } from '@/lib/colorUtils'
import { getOrderItemLineMoney } from '@/lib/orderItemLineTotals'
import { getCustomizationSurchargeLabel } from '@/lib/orderCustomizationSurcharge'

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const { orders, _hasHydrated } = useStore()
  const { isLoggedIn, user } = useUserAuth()
  const { ledgerSyncDone } = useCustomerOrdersLedgerSync()

  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : params?.orderId
  const order = orders.find(o => o.id === orderId)

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

  // Wait for hydration before showing not found
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
            Loading order...
          </div>
        </div>
      </div>
    )
  }

  const awaitingLedgerMerge =
    Boolean(isLoggedIn && user?.email?.trim()) && !ledgerSyncDone

  if (awaitingLedgerMerge) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
            Loading order...
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t('ordersPage.notFound')}</h1>
            <button onClick={() => router.push('/orders')} className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
              {t('ordersPage.backToOrders')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-slate-900 tracking-wide">Order {order.id}</h1>
            <p className="text-gray-500 mt-1">{t('ordersPage.placedOn')}: {new Date(order.createdAtIso).toLocaleString()}</p>
          </div>
          <button onClick={() => router.push('/orders')} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800">
            {t('ordersPage.backToOrders')}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('ordersPage.items')}</h2>
              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.productId + item.name} className="py-4">
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
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
                        {item.subcategory && (
                          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                            {item.subcategory}
                          </span>
                        )}
                        {item.brand && (
                          <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                            {item.brand}
                          </span>
                        )}
                        {item.size && (
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            Size: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="px-2 py-1 rounded-full bg-pink-100 text-pink-700">
                            Color: {item.color}
                          </span>
                        )}
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
                                    
                                    return (
                                      <div key={key} className="flex items-center gap-2 pl-2">
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
                                        {options.designName && (
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
                            // 일반 상품 커스터마이징 정보 표시
                            Object.entries(item.customizations)
                              .filter(([key]) => !key.includes('customizedImage'))
                              .map(([key, value]) => {
                                const isColor = key.toLowerCase() === 'color' && String(value).startsWith('#')
                                return (
                                  <div key={key} className="flex items-center gap-2">
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

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('ordersPage.shipping')}</h2>
              <div className="text-sm text-gray-700">
                <div className="font-medium mb-1">{order.customer.name}</div>
                <div>{order.address.asSingleLine}</div>
                <div className="text-gray-500 mt-1">{order.customer.email} · {formatAuPhoneHyphen(order.customer.phone)}</div>
              </div>
            </div>

            {/* Order Tracking */}
            <OrderTracking order={order} />

            {/* Order Email Confirmation */}
            <OrderEmailConfirmation order={order} />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>{t('checkout.gstInclude')}</span><span>$0.00</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>${order.shippingPrice.toFixed(2)}</span></div>
                {order.paymentFee && order.paymentFee > 0 && (
                  <div className="flex justify-between"><span>Payment Fee</span><span>${order.paymentFee.toFixed(2)}</span></div>
                )}
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                    <span>-${order.discount.toFixed(2)}</span>
                  </div>
                )}
                {order.discount && order.discount > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Subtotal + Shipping{order.paymentFee && order.paymentFee > 0 ? ' + Payment Fee' : ''}</span>
                      <span>${(order.subtotal + order.shippingPrice + (order.paymentFee || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-green-600 font-medium">
                      <span>Promo Code Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                      <span>-${order.discount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="border-t pt-3 mt-3 flex justify-between text-base font-semibold"><span>{t('ordersPage.total')}</span><span>${order.total.toFixed(2)}</span></div>
                <div className="mt-2 text-gray-500">Payment: {order.paymentMethodName || order.paymentMethod.toUpperCase()}</div>
                {order.promoCode && (
                  <div className="text-gray-500">Promo Code: <span className="font-mono font-semibold text-green-600">{order.promoCode}</span></div>
                )}
                <div className="text-gray-500">Status: {order.status}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


