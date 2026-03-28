'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle, XCircle, Clock } from 'lucide-react'

interface OrderNotificationProps {
  orderId: string
  customerName: string
  total: number
  items: Array<{ name: string; quantity: number }>
  timestamp: string
}

export default function OrderNotification({ 
  orderId, 
  customerName, 
  total, 
  items, 
  timestamp 
}: OrderNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // 10초 후 자동으로 숨김
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
  }

  if (isDismissed || !isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-in slide-in-from-right-2 duration-300">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Bell className="w-4 h-4 text-green-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              새로운 주문 알림
            </h4>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mt-2 space-y-2">
            <div className="text-xs text-gray-500">
              <span className="font-medium">주문번호:</span> {orderId}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-medium">고객명:</span> {customerName}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-medium">총액:</span> ${total.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-medium">주문 항목:</span>
              <div className="mt-1 space-y-1">
                {items.map((item, index) => (
                  <div key={index} className="ml-2">
                    • {item.name} x {item.quantity}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {new Date(timestamp).toLocaleString()}
            </div>
          </div>
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => window.open(`/admin/orders/${orderId}`, '_blank')}
              className="flex-1 bg-blue-600 text-white text-xs px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              주문 상세보기
            </button>
            <button
              onClick={() => window.open('/admin/orders', '_blank')}
              className="flex-1 bg-gray-100 text-gray-700 text-xs px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              주문 관리
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
