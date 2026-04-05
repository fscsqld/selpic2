'use client'

import { CheckCircle, Calendar, User, Package } from 'lucide-react'
import { COMPANY_LEGAL, COMPANY_LEGAL_LINE } from '@/lib/companyLegal'
import { getOrderConfirmationPaymentNotice } from '@/lib/orderConfirmationPaymentNotice'

interface OrderConfirmationTemplateProps {
  order: {
    id: string
    customer: {
      name: string
      firstName?: string
      lastName?: string
      email: string
      phone: string
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
    subtotal: number
    shipping: number
    total: number
    discount?: number
    createdAtIso: string
    paymentMethod?: 'card' | 'paypal' | 'bank' | 'cash' | 'stripe'
  }
  company?: {
    name?: string
    abn?: string
    acn?: string
    address?: string
    email?: string
    phone?: string
  }
  template?: {
    greeting?: string
    customMessage?: string
    closing?: string
  }
}

export default function OrderConfirmationTemplate({
  order,
  company,
  template
}: OrderConfirmationTemplateProps) {
  const T = {
    confirmation: 'Order Confirmation',
    orderNumber: 'Order Number',
    orderDate: 'Order Date',
    customerInfo: 'Customer Information',
    orderItems: 'Order Items',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    thankYou: 'Thank you for your order!',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    quantity: 'Quantity',
    companyName: company?.name || COMPANY_LEGAL.companyName,
    companyLegal: (company?.abn && company?.acn)
      ? `ABN: ${company.abn}\nACN: ${company.acn}`
      : COMPANY_LEGAL_LINE,
    companyEmail: company?.email || 'Email: info@selpic.com.au',
    confirmed: 'Your order has been confirmed and is being processed.',
    shippingNotification: 'You will receive a shipping notification once your order has been dispatched.',
    contactUs: 'If you have any questions, please contact us.'
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace(/^/, '$')
  }

  const paymentNotice = getOrderConfirmationPaymentNotice(order.paymentMethod)

  const getSimpleCustomizationText = (customizations?: Record<string, string>): string | null => {
    if (!customizations) return null

    if (customizations.bundleType === 'bundle' || customizations.setType === 'set') {
      return null
    }

    const simpleKeys = ['text', 'font', 'color']
    const customTexts: string[] = []

    simpleKeys.forEach(key => {
      if (customizations[key]) {
        const value = customizations[key]
        if (key === 'color' && String(value).startsWith('#')) {
          customTexts.push(`${key}: ${String(value)}`)
        } else {
          customTexts.push(`${key}: ${String(value)}`)
        }
      }
    })

    return customTexts.length > 0 ? customTexts.join(', ') : null
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
      <div className="text-center border-b border-gray-200 pb-6 mb-6">
        <div className="mb-6 text-left">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{T.companyName}</h2>
          <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{T.companyLegal}</p>
        </div>
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="h-12 w-12 text-green-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">{T.confirmation}</h1>
        </div>

        <div className="text-gray-600">
          <p className="text-lg font-medium">{T.thankYou}</p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-gray-500" />
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

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
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

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Package className="h-5 w-5 mr-2" />
          {T.orderItems}
        </h3>
        <div className="space-y-4">
          {order.items.map((item, index) => {
            const simpleCustomization = getSimpleCustomizationText(item.customizations)
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {T.quantity}: {item.quantity} × {formatCurrency(item.product.price)} = {formatCurrency(item.product.price * item.quantity)}
                    </p>
                    {simpleCustomization && (
                      <p className="text-xs text-gray-600 mt-2 italic">
                        {simpleCustomization}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{T.subtotal}</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{T.shipping}</span>
              <span className="font-medium">{formatCurrency(order.shipping)}</span>
            </div>
            {order.discount !== undefined && order.discount > 0.01 && (
              <div className="flex justify-between text-green-700">
                <span className="text-sm font-medium">Discount</span>
                <span className="font-medium">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">{T.total}</span>
                <span className="text-lg font-bold text-indigo-600">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg space-y-3">
        {paymentNotice ? (
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{paymentNotice}</p>
        ) : (
          <p className="text-gray-700">{T.confirmed}</p>
        )}
        <p className="text-gray-700 text-sm">{T.shippingNotification}</p>
        {template?.customMessage && (
          <p className="text-gray-700 mt-2 text-sm">{template.customMessage}</p>
        )}
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="text-center text-gray-500 text-sm space-y-2">
          <p>{T.contactUs}</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <span>{T.companyEmail}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
