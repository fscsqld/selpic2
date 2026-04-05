'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle, XCircle, Clock, ShoppingCart } from 'lucide-react'
import { useStore } from '@/lib/store'

interface AdminOrderNotificationProps {
  onDismiss?: (orderId: string) => void
}

export default function AdminOrderNotification({ onDismiss }: AdminOrderNotificationProps) {
  const { orders } = useStore()
  const [notifications, setNotifications] = useState<Array<{
    id: string
    orderId: string
    customerName: string
    total: number
    items: Array<{ name: string; quantity: number }>
    timestamp: string
    isRead: boolean
  }>>([])

  useEffect(() => {
    // 새로운 주문이 있을 때 알림 생성
    const newOrders = orders.filter(order => {
      const orderTime = new Date(order.createdAtIso).getTime()
      const now = Date.now()
      // 최근 1시간 내 주문만 알림으로 표시
      return (now - orderTime) < 60 * 60 * 1000
    })

    const newNotifications = newOrders.map(order => ({
      id: `notification-${order.id}`,
      orderId: order.id,
      customerName: order.customer.name,
      total: order.total,
      items: order.items,
      timestamp: order.createdAtIso,
      isRead: false
    }))

    setNotifications(prev => {
      const existingIds = prev.map(n => n.orderId)
      const uniqueNew = newNotifications.filter(n => !existingIds.includes(n.orderId))
      return [...prev, ...uniqueNew]
    })
  }, [orders])

  const handleDismiss = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    const notification = notifications.find(n => n.id === notificationId)
    if (notification && onDismiss) {
      onDismiss(notification.orderId)
    }
  }

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    )
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {/* 알림 개수 표시 */}
      {unreadCount > 0 && (
        <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 text-center min-w-[20px]">
          {unreadCount}
        </div>
      )}
      
      {/* 알림 목록 */}
      {notifications.slice(0, 3).map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm w-full bg-white rounded-lg shadow-lg border ${
            notification.isRead ? 'border-gray-200' : 'border-blue-300'
          } p-4 animate-in slide-in-from-right-2 duration-300`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                notification.isRead ? 'bg-gray-100' : 'bg-blue-100'
              }`}>
                <ShoppingCart className={`w-4 h-4 ${
                  notification.isRead ? 'text-gray-600' : 'text-blue-600'
                }`} />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-medium ${
                  notification.isRead ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  New Order
                </h4>
                <div className="flex items-center space-x-1">
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-blue-400 hover:text-blue-600"
                      title="Mark as read"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Dismiss"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-2 space-y-2">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">
                    Order ID:
                  </span> {notification.orderId}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">
                    Customer:
                  </span> {notification.customerName}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">
                    Total:
                  </span> ${notification.total.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">
                    Items:
                  </span>
                  <div className="mt-1 space-y-1">
                    {notification.items.slice(0, 2).map((item, index) => (
                      <div key={index} className="ml-2">
                        • {item.name} x {item.quantity}
                      </div>
                    ))}
                    {notification.items.length > 2 && (
                      <div className="ml-2 text-gray-400">
                        +{notification.items.length - 2} more items
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
              
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => window.open(`/admin/orders/${notification.orderId}`, '_blank')}
                  className="flex-1 bg-blue-600 text-white text-xs px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => window.open('/admin/orders', '_blank')}
                  className="flex-1 bg-gray-100 text-gray-700 text-xs px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Manage Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* 더 많은 알림이 있을 때 표시 */}
      {notifications.length > 3 && (
        <div className="text-center">
          <button
            onClick={() => window.open('/admin/orders', '_blank')}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {`View ${notifications.length - 3} more`}
          </button>
        </div>
      )}
    </div>
  )
}
