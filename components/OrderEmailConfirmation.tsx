'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'
import { Mail, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, Receipt } from 'lucide-react'
import type { OrderRecord } from '@/lib/store'
import OrderReceipt from './OrderReceipt'

interface OrderEmailConfirmationProps {
  order: OrderRecord
  isAdmin?: boolean
  onSendEmail?: () => Promise<boolean>
  onResendEmail?: () => Promise<boolean>
}

export default function OrderEmailConfirmation({ 
  order, 
  isAdmin = false, 
  onSendEmail, 
  onResendEmail 
}: OrderEmailConfirmationProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  const emailConfirmation = order.emailConfirmation

  const getEmailStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getEmailStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEmailStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('ordersPage.orderProcessing')
      case 'sent':
        return t('ordersPage.emailSent')
      case 'delivered':
        return t('ordersPage.orderConfirmed')
      case 'failed':
        return t('ordersPage.emailFailed')
      default:
        return status
    }
  }

  const handleSendEmail = async () => {
    if (!onSendEmail) return
    
    setIsLoading(true)
    try {
      const success = await onSendEmail()
      if (success) {
        // Email sent successfully
        console.log('Order confirmation email sent successfully')
      } else {
        console.error('Failed to send order confirmation email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!onResendEmail) return
    
    setIsLoading(true)
    try {
      const success = await onResendEmail()
      if (success) {
        // Email resent successfully
        console.log('Order confirmation email resent successfully')
      } else {
        console.error('Failed to resend order confirmation email')
      }
    } catch (error) {
      console.error('Error resending email:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!emailConfirmation) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">{t('ordersPage.orderConfirmation')}</h3>
            <p className="text-sm text-gray-500">No email confirmation sent yet</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleSendEmail}
              disabled={isLoading}
              className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                t('admin.orders.sendConfirmationEmail')
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">{t('ordersPage.orderConfirmation')}</h3>
              <p className="text-sm text-gray-500">
                {emailConfirmation.sent ? 'Email sent to customer' : 'Email not sent'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getEmailStatusColor(emailConfirmation.status)}`}>
              {getEmailStatusText(emailConfirmation.status)}
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showDetails ? '−' : '+'}
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="p-4 space-y-4">
          {/* Current Status */}
          <div className="flex items-center gap-3">
            {getEmailStatusIcon(emailConfirmation.status)}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{getEmailStatusText(emailConfirmation.status)}</p>
              {emailConfirmation.errorMessage && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {emailConfirmation.errorMessage}
                </p>
              )}
            </div>
          </div>

          {/* Email Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emailConfirmation.sentAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('admin.orders.emailSentAt')}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(emailConfirmation.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {emailConfirmation.lastAttempt && (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Attempt</p>
                  <p className="text-sm text-gray-500">
                    {new Date(emailConfirmation.lastAttempt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Email Statistics */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Email Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Attempts:</span>
                <span className="ml-2 font-medium">{emailConfirmation.attempts}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium capitalize">{emailConfirmation.status}</span>
              </div>
            </div>
          </div>

          {/* Receipt View Button */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Order Receipt</h4>
            <button
              onClick={() => setShowReceipt(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              View Receipt
            </button>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Email Actions</h4>
              <div className="flex gap-2">
                {emailConfirmation.status === 'failed' || !emailConfirmation.sent ? (
                  <button
                    onClick={handleSendEmail}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      t('admin.orders.sendConfirmationEmail')
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleResendEmail}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      t('admin.orders.resendConfirmationEmail')
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Order Receipt</h3>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <OrderReceipt 
                order={{
                  id: order.id,
                  customer: order.customer,
                  address: order.address,
                  items: order.items.map(item => ({
                    product: {
                      name: item.name,
                      price: item.price,
                      image: item.image
                    },
                    quantity: item.quantity,
                    customizations: item.customizations
                  })),
                  subtotal: order.subtotal,
                  shipping: order.shippingPrice,
                  total: order.total,
                  // Discount information
                  vipDiscount: order.vipDiscount,
                  promoDiscount: order.promoDiscount,
                  discount: order.discount,
                  vipGradeName: order.vipGradeName,
                  vipGradeCode: order.vipGradeCode,
                  promoCode: order.promoCode,
                  paymentMethod: order.paymentMethod,
                  shippingOption: {
                    name: order.shippingOptionName || order.shippingOptionId,
                    price: order.shippingPrice
                  },
                  createdAtIso: order.createdAtIso
                }}
                language={t('language') === 'ko' ? 'ko' : 'en'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
