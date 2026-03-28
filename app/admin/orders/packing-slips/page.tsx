'use client'

import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { formatAuPhoneHyphen } from '@/lib/phone'
import { getColorName } from '@/lib/colorUtils'

// 단일 창에서 여러 패킹 슬립을 연속 렌더링하여 한 번에 인쇄
export default function PackingSlipsBatchPage() {
  const searchParams = useSearchParams()
  const { orders } = useStore()

  const targetIds = useMemo(() => {
    const idsParam = searchParams.get('ids')
    if (!idsParam) return []
    return idsParam.split(',').map(id => id.trim()).filter(Boolean)
  }, [searchParams])

  const targetOrders = useMemo(() => {
    if (!targetIds.length) return []
    // 전달된 순서를 유지
    const map = new Map(orders.map(o => [o.id, o]))
    return targetIds.map(id => map.get(id)).filter((o): o is NonNullable<typeof o> => !!o)
  }, [orders, targetIds])

  // 렌더 후 자동 인쇄(필요 시 주석 처리 가능)
  useEffect(() => {
    if (targetOrders.length === 0) return
    const timer = setTimeout(() => {
      window.print()
    }, 400)
    return () => clearTimeout(timer)
  }, [targetOrders])

  if (!targetIds.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">No order IDs provided.</div>
      </div>
    )
  }

  if (targetOrders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">No matching orders found.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <div className="max-w-5xl mx-auto space-y-8 print:space-y-0">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h1 className="text-2xl font-semibold">Packing Slips</h1>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            Print All
          </button>
        </div>

        {targetOrders.map((order, idx) => {
          const isClickAndCollect =
            order.shippingOptionId === 'local-pickup' ||
            order.shippingOptionId === 'click-collect-mansfield' ||
            order.shippingOptionName?.toLowerCase().includes('click & collect')

          return (
            <div key={order.id} className="page-break-after">
              <div className="border rounded-lg p-6 mb-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm text-gray-500">Order ID</div>
                    <div className="font-semibold text-lg">{order.id}</div>
                    <div className="text-sm text-gray-500 mt-2">Date</div>
                    <div className="text-sm">{new Date(order.createdAtIso).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Ship To</div>
                    {isClickAndCollect ? (
                      <>
                        <div className="font-semibold">Click & Collect (Mansfield)</div>
                        <div className="text-gray-700">Local pickup – hold for customer</div>
                        <div className="text-gray-700 text-sm mt-1">
                          Customer: {order.customer.name}
                        </div>
                        <div className="text-gray-700 text-sm">
                          {formatAuPhoneHyphen(order.customer.phone)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold">{order.customer.name}</div>
                        <div className="text-gray-700">{order.address.asSingleLine}</div>
                        <div className="text-gray-700 text-sm">
                          {formatAuPhoneHyphen(order.customer.phone)}
                        </div>
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
                      {order.items.map((it, itemIdx) => {
                        const isSetProduct = (it.customizations as any)?.setType === 'set'

                        if (isSetProduct) {
                          // SET 상품: 세로 레이아웃
                          return (
                            <tr key={itemIdx} className="border-b">
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
                                        const setItems: Record<number, { designName?: string; text?: string; font?: string; color?: string }> = {}
                                        Object.entries(it.customizations).forEach(([key, value]) => {
                                          if (key.startsWith('item') && (key.includes('_designName') || key.includes('_text') || key.includes('_font') || key.includes('_color'))) {
                                            const match = key.match(/item(\d+)_(designName|text|font|color)/)
                                            if (match) {
                                              const itemIndex = parseInt(match[1])
                                              const optionType = match[2] as 'designName' | 'text' | 'font' | 'color'
                                              if (!setItems[itemIndex]) setItems[itemIndex] = {}
                                              setItems[itemIndex][optionType] = String(value)
                                            }
                                          }
                                        })

                                        const sortedItems = Object.entries(setItems).sort(([a], [b]) => parseInt(a) - parseInt(b))

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
                                                    <span>{getColorName(options.color)}</span>
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

                        return (
                          <tr key={itemIdx} className="border-b">
                            <td className="py-2">
                              <div className="font-medium">{it.name}</div>
                              {it.customizations && (
                                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                  {it.customizations.text && <div>Text: {it.customizations.text}</div>}
                                  {it.customizations.font && <div>Font: {it.customizations.font}</div>}
                                  {it.customizations.color && <div>Color: {getColorName(it.customizations.color)}</div>}
                                  {it.customizations.size && <div>Size: {it.customizations.size}</div>}
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
              {/* 페이지 구분선 (인쇄 시 장 나눔) */}
              {idx !== targetOrders.length - 1 && <div className="print:page-break-after"></div>}
            </div>
          )
        })}
      </div>

      <style jsx global>{`
        @media print {
          .page-break-after {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  )
}

