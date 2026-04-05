'use client'

import { Receipt, CreditCard, Building2, DollarSign, Truck, Calendar, User, MapPin } from 'lucide-react'
import { getColorName } from '@/lib/colorUtils'
import { COMPANY_LEGAL, COMPANY_CONTACT } from '@/lib/companyLegal'

interface OrderReceiptProps {
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
      customizations: Record<string, string>
    }>
    subtotal: number
    shipping: number
    total: number
    // Discounts (optional)
    vipDiscount?: number
    promoDiscount?: number
    discount?: number
    vipGradeName?: string
    vipGradeCode?: number
    promoCode?: string
    paymentMethod: string
    shippingOption: {
      name: string
      price: number
    }
    createdAtIso: string
  }
}

export default function OrderReceipt({ order }: OrderReceiptProps) {
  const T = {
    receipt: 'Order Receipt',
    orderNumber: 'Order Number',
    orderDate: 'Order Date',
    customerInfo: 'Customer Information',
    shippingAddress: 'Shipping Address',
    paymentMethod: 'Payment Method',
    shippingMethod: 'Shipping Method',
    orderItems: 'Order Items',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    thankYou: 'Thank you for your order!',
    contactInfo: 'Please contact us if you have any questions.',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    quantity: 'Quantity',
    price: 'Price',
    customizations: 'Customizations',
    companyName: COMPANY_LEGAL.companyName,
    companyLegal: `ABN: ${COMPANY_LEGAL.abn}\nACN: ${COMPANY_LEGAL.acn}`,
    companyAddress: COMPANY_CONTACT.address,
    companyEmail: `Email: ${COMPANY_CONTACT.email}`,
    free: 'Free'
  }

  // Normalize shipping option name to the desired label regardless of saved text/id
  const getShippingOptionDisplayName = (rawName: string): string => {
    const lower = (rawName || '').toLowerCase()
    if (
      rawName === 'mansfield-same-day' ||
      lower.includes('mansfield') && (lower.includes('same day') || lower.includes('same-day')) ||
      rawName.includes('Mansfield 당일') ||
      rawName.includes('당일 배송')
    ) {
      return 'Mansfield Free Delivery'
    }
    return rawName
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace(/^/, '$')
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
          <Receipt className="h-12 w-12 text-indigo-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">{T.receipt}</h1>
        </div>
        <div className="text-gray-600">
          <p className="text-lg">{T.thankYou}</p>
          <p className="text-sm">{T.contactInfo}</p>
        </div>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Receipt className="h-5 w-5 text-gray-500" />
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
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">{T.paymentMethod}</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{order.paymentMethod}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Truck className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">{T.shippingMethod}</p>
              <p className="text-lg font-semibold text-gray-900">{getShippingOptionDisplayName(order.shippingOption.name)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            {T.customerInfo}
          </h3>
          <div className="space-y-2">
            {order.customer.firstName && order.customer.lastName ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">First Name</p>
                  <p className="text-gray-900">{order.customer.firstName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Name</p>
                  <p className="text-gray-900">{order.customer.lastName}</p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-500">{T.name}</p>
                <p className="text-gray-900">{order.customer.name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">{T.email}</p>
              <p className="text-gray-900">{order.customer.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{T.phone}</p>
              <p className="text-gray-900">{order.customer.phone}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            {T.shippingAddress}
          </h3>
          <div className="space-y-2">
            <p className="text-gray-900">{order.address.streetAddress}</p>
            <p className="text-gray-900">
              {order.address.suburb}, {order.address.state} {order.address.postcode}
            </p>
            <p className="text-gray-900">{order.address.country}</p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{T.orderItems}</h3>
        <div className="space-y-4">
          {order.items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img 
                    src={item.product.image} 
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                    <p className="text-sm text-gray-500">
                      {T.quantity}: {item.quantity} × {formatCurrency(item.product.price)}
                    </p>
                    {item.customizations &&
                      Object.entries(item.customizations).filter(([key]) => key !== 'customizedImage').length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-500">{T.customizations}:</p>
                        <div className="text-sm text-gray-600">
                          {(item.customizations as any)?.bundleType === 'bundle' ? (
                            // 묶음 상품 커스터마이징 정보 표시
                            <div className="space-y-1">
                              <p className="font-semibold text-gray-700 mb-1">Bundle Customization:</p>
                              {Object.entries(item.customizations)
                                .filter(([key]) => !['bundleType', 'customizedImage'].includes(key))
                                .map(([key, value]) => {
                                  const parts = key.split('_')
                                  if (parts.length >= 3) {
                                    const category = parts[0]
                                    const index = parts[1]
                                    const option = parts.slice(2).join('_')
                                    
                                    const categoryLabel = category === 'sticker' ? '🏷️ Sticker' : 
                                                         category === 'stamp' ? '📮 Stamp' : 
                                                         category === 'phoneCase' ? '📱 Phone Case' : 
                                                         category === 'hotGoods' ? '🔥 Market S' : category
                                    
                                    const isColor = option === 'color' && String(value).startsWith('#')
                                    
                                    return (
                                      <div key={key} className="ml-2 flex items-center gap-2">
                                        <span>• {categoryLabel} {parseInt(index) + 1} - {option}:</span>
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
                                      <div key={index} className="space-y-1 ml-2 border-l-2 border-blue-200 pl-2">
                                        <p className="font-semibold text-gray-700 mb-1">Item {index}</p>
                                        {options.designName && (
                                          <div className="flex items-center gap-2">
                                            <span>• Design:</span>
                                            <span>{options.designName}</span>
                                          </div>
                                        )}
                                        {options.text && (
                                          <div className="flex items-center gap-2">
                                            <span>• Text:</span>
                                            <span>{options.text}</span>
                                          </div>
                                        )}
                                        {options.font && (
                                          <div className="flex items-center gap-2">
                                            <span>• Font:</span>
                                            <span>{options.font}</span>
                                          </div>
                                        )}
                                        {options.color && (
                                          <div className="flex items-center gap-2">
                                            <span>• Color:</span>
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
                              .filter(([key]) => key !== 'customizedImage')
                              .map(([key, value]) => {
                                const isColor = key.toLowerCase() === 'color' && String(value).startsWith('#')
                                return (
                                  <div key={key} className="ml-2 flex items-center gap-2">
                                    <span>• {key}:</span>
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
                              })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(item.product.price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="border-t border-gray-200 pt-6">
        <div className="max-w-md ml-auto space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">{T.subtotal}</span>
            <span className="font-medium">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">GST(include)</span>
            <span className="font-medium">$0.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{T.shipping}</span>
            <span className="font-medium">
              {order.shippingOption.name.includes('Cash on Delivery') ? T.free : formatCurrency(order.shipping)}
            </span>
          </div>
          
          {/* Discounts Section */}
          {(() => {
            // 할인 금액 계산: Subtotal + Shipping - Total
            const calculatedDiscount = order.subtotal + order.shipping - order.total
            
            // 할인 정보가 명시적으로 있으면 사용, 없으면 계산된 할인 금액 사용
            const hasExplicitDiscounts = (order.vipDiscount !== undefined && order.vipDiscount > 0) || 
                                        (order.promoDiscount !== undefined && order.promoDiscount > 0) || 
                                        (order.discount !== undefined && order.discount > 0)
            
            const hasCalculatedDiscount = calculatedDiscount > 0.01 // 소수점 오차 고려
            
            if (hasExplicitDiscounts || hasCalculatedDiscount) {
              return (
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  {/* VIP Grade Discount */}
                  {order.vipDiscount !== undefined && order.vipDiscount > 0 ? (
                    <div className="flex justify-between text-purple-700">
                      <span className="text-sm font-medium">
                        VIP {order.vipGradeName || (order.vipGradeCode !== undefined ? `Grade ${order.vipGradeCode}` : '')} Discount
                      </span>
                      <span className="font-medium">-{formatCurrency(order.vipDiscount)}</span>
                    </div>
                  ) : null}
                  
                  {/* Promo Code Discount */}
                  {order.promoDiscount !== undefined && order.promoDiscount > 0 ? (
                    <div className="flex justify-between text-green-700">
                      <span className="text-sm font-medium">
                        Promo Code Discount{order.promoCode ? ` (${order.promoCode})` : ''}
                      </span>
                      <span className="font-medium">-{formatCurrency(order.promoDiscount)}</span>
                    </div>
                  ) : null}
                  
                  {/* Total Discount Summary */}
                  {order.discount !== undefined && order.discount > 0 ? (
                    // 명시적인 총 할인 금액이 있으면 사용
                    <div className="flex justify-between text-gray-700 font-semibold pt-1 border-t border-gray-100">
                      <span className="text-sm">Total Discount</span>
                      <span className="text-sm">-{formatCurrency(order.discount)}</span>
                    </div>
                  ) : hasCalculatedDiscount && !hasExplicitDiscounts ? (
                    // 명시적인 할인 정보가 없지만 계산된 할인이 있으면 표시
                    <div className="flex justify-between text-gray-700 font-semibold pt-1 border-t border-gray-100">
                      <span className="text-sm">Discount</span>
                      <span className="text-sm">-{formatCurrency(calculatedDiscount)}</span>
                    </div>
                  ) : null}
                </div>
              )
            }
            return null
          })()}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between">
              <span className="text-lg font-semibold text-gray-900">{T.total}</span>
              <span className="text-lg font-bold text-indigo-600">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-gray-200 pt-6">
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
