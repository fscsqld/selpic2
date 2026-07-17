'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { formatAuPhoneHyphen } from '@/lib/phone'
import { getColorName } from '@/lib/colorUtils'
import { formatPackingSlipShipToLines } from '@/lib/shipping/formatPackingSlipAddress'

export default function PackingSlipPage() {
  const params = useParams()
  const orderId = Array.isArray(params?.orderId) ? params?.orderId[0] : (params?.orderId as string)
  const { orders } = useStore()

  const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId])

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Order not found.</div>
      </div>
    )
  }

  const isClickAndCollect =
    order.shippingOptionId === 'local-pickup' ||
    order.shippingOptionId === 'click-collect-mansfield' ||
    order.shippingOptionName?.toLowerCase().includes('click & collect')
  const shipTo = formatPackingSlipShipToLines(order)

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Packing Slip</h1>
          <button onClick={() => window.print()} className="px-3 py-2 border rounded">Print</button>
        </div>
        <div className="border rounded-lg p-6">
          <div className="flex justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500">Order ID</div>
              <div className="font-semibold">{order.id}</div>
              <div className="text-sm text-gray-500 mt-2">Date</div>
              <div>{new Date(order.createdAtIso).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Ship To</div>
              {isClickAndCollect ? (
                <>
                  <div className="font-semibold">Click & Collect (Mansfield)</div>
                  <div className="text-gray-700">Local pickup – hold for customer</div>
                  <div className="text-gray-700 text-sm mt-1">
                    Customer: {shipTo.name}
                  </div>
                  <div className="text-gray-700">
                    {formatAuPhoneHyphen(shipTo.phone)}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold">{shipTo.name}</div>
                  <div className="text-gray-700 whitespace-pre-line">{shipTo.addressLine}</div>
                  <div className="text-gray-700">{formatAuPhoneHyphen(shipTo.phone)}</div>
                </>
              )}
            </div>
          </div>
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Item</th>
                  <th className="py-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, idx) => {
                  const isSetProduct = (it.customizations as any)?.setType === 'set'
                  
                  if (isSetProduct) {
                    // SET 상품인 경우 세로 레이아웃으로 표시
                    return (
                      <tr key={idx} className="border-b">
                        <td colSpan={2} className="py-3">
                          <div className="space-y-3">
                            <div className="font-medium text-base mb-2">{it.name}</div>
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Qty: </span>
                              <span>{it.quantity}</span>
                            </div>
                            {it.customizations &&
                              Object.entries(it.customizations).filter(([k]) => k !== 'customizedImage').length > 0 && (
                              <div className="mt-2 text-xs text-gray-600 space-y-1">
                                {(() => {
                                  // SET 아이템들을 그룹화
                                  const setItems: Record<number, { designName?: string; text?: string; font?: string; color?: string }> = {}
                                  
                                  Object.entries(it.customizations).forEach(([key, value]) => {
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
                                  
                                  const sortedItems = Object.entries(setItems)
                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                  
                                  return (
                                    <div className="flex flex-wrap gap-4">
                                      {sortedItems.map(([index, options]) => (
                                        <div key={index} className="flex-1 min-w-[200px] space-y-1 pl-2 border-l-2 border-blue-200">
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
                                                <div className="flex items-center gap-1">
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
                                })()}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }
                  
                  // Bundle 상품인 경우 bundleItems 표시
                  const isBundleProduct = it.isBundle || (it.customizations as any)?.bundleType === 'bundle'
                  
                  // 일반 상품인 경우 기존 테이블 형식 유지
                  return (
                    <tr key={idx} className="border-b">
                      <td className="py-2">
                        <div className="font-medium">{it.name}</div>
                        {/* Bundle Items 표시 */}
                        {isBundleProduct && it.bundleItems && it.bundleItems.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600 space-y-1">
                            <p className="font-semibold text-gray-700">Included Items:</p>
                            <div className="space-y-1 mt-1 pl-2">
                              {it.bundleItems.map((bundleItem, bundleIdx) => {
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
                                return (
                                  <div key={bundleIdx} className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {getBundleCategoryLabel(bundleItem.category)} {bundleItem.name}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        {it.customizations &&
                          Object.entries(it.customizations).filter(([k]) => k !== 'customizedImage').length > 0 && (
                          <div className="mt-1 text-xs text-gray-600 space-y-1">
                            {(it.customizations as any)?.bundleType === 'bundle' ? (
                              // 묶음 상품 커스터마이징 정보 표시
                              <div className="space-y-1">
                                <p className="font-semibold text-gray-700">Bundle Customization:</p>
                                {Object.entries(it.customizations)
                                  .filter(([k]) => !['bundleType', 'customizedImage'].includes(k))
                                  .map(([k, v]) => {
                                    const parts = k.split('_')
                                    if (parts.length >= 3) {
                                      const category = parts[0]
                                      const index = parts[1]
                                      const option = parts.slice(2).join('_')
                                      
                                      const categoryLabel = category === 'sticker' ? '🏷️ Sticker' : 
                                                           category === 'stamp' ? '📮 Stamp' : 
                                                           category === 'phoneCase' ? '📱 Phone Case' : 
                                                           category === 'hotGoods' ? '🔥 Market S' : category
                                      
                                      const isColor = option === 'color' && String(v).startsWith('#')
                                      
                                      return (
                                        <div key={k} className="flex items-center gap-2 pl-2">
                                          <span className="font-medium">{categoryLabel} {parseInt(index) + 1} - {option}:</span>
                                          {isColor ? (
                                            <div className="flex items-center gap-1">
                                              <div 
                                                className="w-4 h-4 rounded border border-gray-300"
                                                style={{ backgroundColor: String(v) }}
                                                title={String(v)}
                                              />
                                              <span className="font-medium">{getColorName(String(v))}</span>
                                            </div>
                                          ) : (
                                            <span>{String(v)}</span>
                                          )}
                                        </div>
                                      )
                                    }
                                    return null
                                  })}
                              </div>
                            ) : (
                              // 일반 상품 커스터마이징 정보 표시
                              Object.entries(it.customizations)
                                .filter(([k]) => k !== 'customizedImage')
                                .map(([k, v]) => {
                                  const isColor = k.toLowerCase() === 'color' && String(v).startsWith('#')
                                  return (
                                    <div key={k} className="flex items-center gap-2">
                                      <span className="font-medium capitalize">{k}:</span>
                                      {isColor ? (
                                        <div className="flex items-center gap-1">
                                          <div 
                                            className="w-4 h-4 rounded border border-gray-300"
                                            style={{ backgroundColor: String(v) }}
                                            title={String(v)}
                                          />
                                          <span className="font-medium">{getColorName(String(v))}</span>
                                        </div>
                                      ) : (
                                        <span>{String(v)}</span>
                                      )}
                                    </div>
                                  )
                                })
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2">{it.quantity}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


