/**
 * Incoming Orders Component
 * 
 * 홈페이지에서 전송된 주문 데이터를 확인하고 승인/거부할 수 있는 Inbox
 */

'use client'

import { useState, useEffect } from 'react'
import { Inbox, CheckCircle, XCircle, Eye, Trash2, Loader2, Package, DollarSign, Calendar, User, Mail, CreditCard, AlertCircle, X } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface IncomingOrder {
  id: string
  orderId: string
  referenceNo: string
  paymentGateway: string
  paymentMethod: string
  totalPaid: number
  grossAmount: number
  gstCollected: number
  gstAmount: number
  transactionDate: string
  occurredAt: string
  customerName: string
  customerEmail: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  shipping: number
  discount?: number
  status: string
  currency?: string
  rawData: any
  receivedAt: string
  inboxStatus: 'pending' | 'approved' | 'rejected'
  approvedAt: string | null
  approvedBy: string | null
  rejectedAt: string | null
  rejectedBy: string | null
  rejectionReason: string | null
}

interface ErrorLog {
  orderId: string
  reason: string
  timestamp: string
}

export function IncomingOrders() {
  const [orders, setOrders] = useState<IncomingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedOrder, setSelectedOrder] = useState<IncomingOrder | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [showErrorLogs, setShowErrorLogs] = useState(false)

  // 🔧 NEW: Process orders array directly (from API response) and save to IndexedDB
  const processAndSaveOrders = async (ordersArray: any[]) => {
    if (!ordersArray || !Array.isArray(ordersArray) || ordersArray.length === 0) {
      console.log('[IncomingOrders] No orders to process')
      return { saved: 0, skipped: 0, errors: 0 }
    }

    console.log(`[IncomingOrders] 📦 Processing ${ordersArray.length} orders from API response...`)
    
    const savedOrders: string[] = []
    const skippedOrders: string[] = []
    const errorLogs: Array<{ orderId: string; reason: string }> = []

    // Save each order to IndexedDB
    for (const orderData of ordersArray) {
      try {
        // 필수 필드 검증
        if (!orderData.orderId) {
          errorLogs.push({ orderId: '알 수 없음', reason: 'order_id 누락' })
          continue
        }

        // 중복 체크
        const exists = await indexedDBStorage.checkOrderExists(orderData.orderId)
        if (exists) {
          console.log(`[IncomingOrders] ⚠️ Skipping duplicate: ${orderData.orderId}`)
          skippedOrders.push(orderData.orderId)
          continue
        }

        // IndexedDB에 저장
        await indexedDBStorage.saveIncomingOrder(orderData)
        savedOrders.push(orderData.orderId)
        console.log(`[IncomingOrders] ✅ Saved order: ${orderData.orderId}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[IncomingOrders] ❌ Error saving order ${orderData.orderId}:`, error)
        errorLogs.push({
          orderId: orderData.orderId || '알 수 없음',
          reason: `저장 실패: ${errorMessage}`
        })
      }
    }

    // Update error logs
    if (errorLogs.length > 0) {
      const errorLogKey = 'selpic_incoming_orders_error_log'
      const existingLogs = JSON.parse(localStorage.getItem(errorLogKey) || '[]')
      const newLogs = [...existingLogs, ...errorLogs.map(log => ({
        ...log,
        timestamp: new Date().toISOString()
      }))]
      localStorage.setItem(errorLogKey, JSON.stringify(newLogs))
      loadErrorLogs()
    }

    // Update UI if orders were saved
    if (savedOrders.length > 0) {
      console.log(`[IncomingOrders] ✅ Successfully saved ${savedOrders.length} new orders`)
      setMessage({
        type: 'success',
        text: `Successfully imported ${savedOrders.length} new order(s)`
      })
      // Refresh orders list immediately
      await loadOrders()
    }

    return {
      saved: savedOrders.length,
      skipped: skippedOrders.length,
      errors: errorLogs.length
    }
  }

  // 🔧 NEW: Directly call accounting program's pending orders API
  // This API returns orders that were recently received from homepage
  const fetchAndSaveOrdersFromAPI = async () => {
    try {
      console.log('[IncomingOrders] 🔍 Checking for pending orders via API...')
      
      // Call accounting program's own pending orders API
      const apiUrl = '/api/orders/pending'
      console.log('[IncomingOrders] Calling API:', apiUrl)

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          console.warn('[IncomingOrders] API call failed:', response.status, response.statusText)
          // Fallback to localStorage check
          await checkLocalStorageForOrders()
          return
        }

        const result = await response.json()
        console.log('[IncomingOrders] API response:', result)

        // Check if API returned orders array
        if (result.orders && Array.isArray(result.orders) && result.orders.length > 0) {
          console.log(`[IncomingOrders] 📦 Received ${result.orders.length} pending orders from API`)
          
          // Process and save orders
          const processResult = await processAndSaveOrders(result.orders)
          console.log('[IncomingOrders] ✅ Processed pending orders:', processResult)
        } else {
          console.log('[IncomingOrders] No pending orders from API')
          // Fallback to localStorage check
          await checkLocalStorageForOrders()
        }
      } catch (fetchError) {
        console.error('[IncomingOrders] ❌ Error calling API:', fetchError)
        // Fallback to localStorage check
        await checkLocalStorageForOrders()
      }
    } catch (error) {
      console.error('[IncomingOrders] ❌ Error fetching orders from API:', error)
      // Fallback to localStorage check
      await checkLocalStorageForOrders()
    }
  }

  // Helper: Check localStorage for pending orders (fallback method)
  const checkLocalStorageForOrders = async () => {
    try {
      // Check if there's a pending API response in localStorage
      const apiResponseKey = 'selpic_api_orders_response'
      const apiResponseJson = localStorage.getItem(apiResponseKey)
      
      if (apiResponseJson) {
        try {
          const apiResponse = JSON.parse(apiResponseJson)
          console.log('[IncomingOrders] Found API response in localStorage:', apiResponse)
          
          if (apiResponse.orders && Array.isArray(apiResponse.orders) && apiResponse.orders.length > 0) {
            // Process and save orders
            const result = await processAndSaveOrders(apiResponse.orders)
            
            // Remove processed response
            localStorage.removeItem(apiResponseKey)
            
            console.log('[IncomingOrders] Processed API response from localStorage:', result)
            return
          }
        } catch (parseError) {
          console.error('[IncomingOrders] Error parsing API response:', parseError)
          localStorage.removeItem(apiResponseKey)
        }
      }

      // Also check localStorage for pending orders (legacy method)
      const pendingOrdersKey = 'selpic_pending_orders'
      const pendingOrdersJson = localStorage.getItem(pendingOrdersKey)
      
      if (pendingOrdersJson) {
        try {
          const pendingOrders = JSON.parse(pendingOrdersJson)
          if (Array.isArray(pendingOrders) && pendingOrders.length > 0) {
            await processAndSaveOrders(pendingOrders)
            // Clear processed orders
            localStorage.removeItem(pendingOrdersKey)
          }
        } catch (parseError) {
          console.error('[IncomingOrders] Error parsing pending orders:', parseError)
          localStorage.removeItem(pendingOrdersKey)
        }
      }
    } catch (error) {
      console.error('[IncomingOrders] ❌ Error checking localStorage:', error)
    }
  }

  // Check localStorage for pending orders and save to IndexedDB
  const checkAndProcessPendingOrders = async () => {
    try {
      const pendingOrdersKey = 'selpic_pending_orders'
      const pendingOrdersJson = localStorage.getItem(pendingOrdersKey)
      
      if (pendingOrdersJson) {
        try {
          const pendingOrders = JSON.parse(pendingOrdersJson)
          console.log('[IncomingOrders] Found pending orders in localStorage:', pendingOrders.length)
          
          if (Array.isArray(pendingOrders) && pendingOrders.length > 0) {
            // 저장 직전 알림 표시
            const orderIds = pendingOrders.map((o: any) => o.orderId).join(', ')
            alert(`데이터 수신 성공: 주문번호 [${orderIds}]를 저장합니다.`)
            
            // 각 주문을 IndexedDB에 저장
            const savedOrders: string[] = []
            const errorLogs: Array<{ orderId: string; reason: string }> = []
            
            for (const orderData of pendingOrders) {
              try {
                // 필수 필드 검증
                if (!orderData.orderId) {
                  errorLogs.push({ orderId: '알 수 없음', reason: 'order_id 누락' })
                  continue
                }
                
                // 중복 체크
                const exists = await indexedDBStorage.checkOrderExists(orderData.orderId)
                if (exists) {
                  console.log(`[IncomingOrders] Skipping duplicate: ${orderData.orderId}`)
                  errorLogs.push({ orderId: orderData.orderId, reason: '중복된 주문 (이미 저장됨)' })
                  continue
                }

                // IndexedDB에 저장
                await indexedDBStorage.saveIncomingOrder(orderData)
                savedOrders.push(orderData.orderId)
                console.log(`[IncomingOrders] ✅ Saved order: ${orderData.orderId}`)
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                console.error(`[IncomingOrders] Error saving order ${orderData.orderId}:`, error)
                errorLogs.push({ 
                  orderId: orderData.orderId || '알 수 없음', 
                  reason: `저장 실패: ${errorMessage}` 
                })
              }
            }
            
            // 저장 완료된 주문은 localStorage에서 제거
            if (savedOrders.length > 0) {
              const remainingOrders = pendingOrders.filter((o: any) => !savedOrders.includes(o.orderId))
              if (remainingOrders.length > 0) {
                localStorage.setItem(pendingOrdersKey, JSON.stringify(remainingOrders))
              } else {
                localStorage.removeItem(pendingOrdersKey)
              }
              console.log(`[IncomingOrders] Processed ${savedOrders.length} orders`)
              
              // 에러 로그 저장
              if (errorLogs.length > 0) {
                const errorLogKey = 'selpic_incoming_orders_error_log'
                const existingLogs = JSON.parse(localStorage.getItem(errorLogKey) || '[]')
                const newLogs = [...existingLogs, ...errorLogs.map(log => ({
                  ...log,
                  timestamp: new Date().toISOString()
                }))]
                localStorage.setItem(errorLogKey, JSON.stringify(newLogs))
              }
              
              // 저장 후 목록 새로고침
              await loadOrders()
              loadErrorLogs()
            }
          }
        } catch (parseError) {
          console.error('[IncomingOrders] Error parsing pending orders:', parseError)
          localStorage.removeItem(pendingOrdersKey)
        }
      }
    } catch (error) {
      console.error('[IncomingOrders] Error checking for pending orders:', error)
    }
  }

  // Load incoming orders
  const loadOrders = async () => {
    try {
      setLoading(true)
      console.log('[IncomingOrders] ========================================')
      console.log('[IncomingOrders] Loading orders from IndexedDB...')
      
      // IndexedDB 초기화 확인
      if (!indexedDBStorage) {
        console.error('[IncomingOrders] ❌ indexedDBStorage is not available')
        setMessage({
          type: 'error',
          text: 'IndexedDB storage is not initialized'
        })
        return
      }
      
      const allOrders = await indexedDBStorage.getAllIncomingOrders()
      console.log('[IncomingOrders] Loaded orders count:', allOrders.length)
      console.log('[IncomingOrders] Orders data:', allOrders)
      console.log('[IncomingOrders] ========================================')
      
      setOrders(allOrders as IncomingOrder[])
      
      if (allOrders.length === 0) {
        console.log('[IncomingOrders] ⚠️ No orders found in IndexedDB')
        console.log('[IncomingOrders] Checking localStorage for pending orders...')
        // localStorage 확인
        const pendingOrdersKey = 'selpic_pending_orders'
        const pendingOrdersJson = localStorage.getItem(pendingOrdersKey)
        if (pendingOrdersJson) {
          const pendingOrders = JSON.parse(pendingOrdersJson)
          console.log('[IncomingOrders] Found pending orders in localStorage:', pendingOrders.length)
          setMessage({
            type: 'info',
            text: `localStorage에 ${pendingOrders.length}개의 대기 중인 주문이 있습니다. 자동으로 처리 중...`
          })
          // 자동으로 처리
          await checkAndProcessPendingOrders()
        }
      }
    } catch (error) {
      console.error('[IncomingOrders] ❌ Error loading orders:', error)
      console.error('[IncomingOrders] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      setMessage({
        type: 'error',
        text: `Failed to load orders: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 컴포넌트 마운트 시 실행
    const initialize = async () => {
      // 먼저 API 응답 처리 (가장 최신 데이터)
      await fetchAndSaveOrdersFromAPI()
      // 그 다음 localStorage에서 대기 중인 주문 확인 및 처리
      await checkAndProcessPendingOrders()
      // 그 다음 IndexedDB에서 로드
      await loadOrders()
      loadErrorLogs()
    }
    
    initialize()
    
    // 주기적으로 주문 목록 새로고침 (3초마다 - 더 빠른 반응)
    const interval = setInterval(() => {
      // 1. API 응답 확인 (가장 우선순위)
      fetchAndSaveOrdersFromAPI().then(() => {
        // 2. localStorage 확인
        checkAndProcessPendingOrders().then(() => {
          // 3. 목록 새로고침
          loadOrders()
        })
      })
    }, 3000) // 3초마다 체크 (더 빠른 반응)
    
    return () => clearInterval(interval)
  }, [])

  // 에러 로그 로드
  const loadErrorLogs = () => {
    try {
      const errorLogKey = 'selpic_incoming_orders_error_log'
      const logsJson = localStorage.getItem(errorLogKey)
      if (logsJson) {
        const logs = JSON.parse(logsJson) as ErrorLog[]
        // 최근 20개만 표시
        setErrorLogs(logs.slice(-20).reverse())
      }
    } catch (error) {
      console.error('[IncomingOrders] Error loading error logs:', error)
    }
  }

  // 에러 로그 삭제
  const clearErrorLogs = () => {
    if (confirm('수신 로그를 모두 삭제하시겠습니까?')) {
      localStorage.removeItem('selpic_incoming_orders_error_log')
      setErrorLogs([])
      setMessage({
        type: 'success',
        text: '수신 로그가 삭제되었습니다.'
      })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    return order.inboxStatus === filter
  })

  // Approve order (장부에 추가)
  const approveOrder = async (order: IncomingOrder) => {
    if (!confirm(`Approve order ${order.orderId} and add to transactions?`)) {
      return
    }

    setIsProcessing(true)
    try {
      // 주문을 거래 내역으로 변환
      const gstExcluded = order.grossAmount / 1.1
      const gstAmount = order.grossAmount - gstExcluded

      const transaction = {
        date: order.transactionDate,
        description: `Order ${order.orderId} - ${order.customerName}`,
        debit: null,
        credit: order.grossAmount, // 수입이므로 Credit
        category: 'INCOME_TRADING_REVENUE',
        department: 'Company',
        gstInfo: {
          isGSTIncluded: true,
          gstType: 'INCLUDED' as const,
          gstAmount: gstAmount,
          netAmount: gstExcluded
        },
        // 주문 메타데이터
        orderId: order.orderId,
        referenceNo: order.referenceNo,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        paymentMethod: order.paymentMethod,
        paymentGateway: order.paymentGateway,
        orderStatus: order.status,
        source: 'selpic_orders',
        occurredAt: order.occurredAt // 한 달 정산 기간 판단 기준
      }

      // Statement에 저장
      const statementId = await indexedDBStorage.saveStatement({
        bankName: 'SELPIC Orders',
        accountNumber: 'ORDERS',
        period: {
          startDate: order.transactionDate,
          endDate: order.transactionDate
        },
        openingBalance: 0,
        closingBalance: order.grossAmount,
        transactions: [transaction],
        fileName: `order_${order.orderId}.json`
      })

      // Inbox 상태 업데이트
      await indexedDBStorage.updateIncomingOrderStatus(
        order.id,
        'approved',
        'owner' // TODO: 실제 사용자 ID로 변경
      )

      setMessage({
        type: 'success',
        text: `Order ${order.orderId} approved and added to transactions.`
      })

      // 목록 즉시 새로고침
      await loadOrders()
      setSelectedOrder(null)
      
      // 강제 리로드 (UI 즉시 업데이트)
      setTimeout(() => {
        loadOrders()
      }, 100)
    } catch (error) {
      console.error('[IncomingOrders] Error approving order:', error)
      setMessage({
        type: 'error',
        text: `Failed to approve order: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setIsProcessing(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  // Reject order
  const rejectOrder = async (order: IncomingOrder, reason?: string) => {
    const rejectionReason = reason || prompt('Rejection reason (optional):') || 'No reason provided'
    
    if (!confirm(`Reject order ${order.orderId}?`)) {
      return
    }

    setIsProcessing(true)
    try {
      await indexedDBStorage.updateIncomingOrderStatus(
        order.id,
        'rejected',
        'owner', // TODO: 실제 사용자 ID로 변경
        rejectionReason
      )

      setMessage({
        type: 'success',
        text: `Order ${order.orderId} rejected.`
      })

      await loadOrders()
      setSelectedOrder(null)
      
      // 강제 리로드 (UI 즉시 업데이트)
      setTimeout(() => {
        loadOrders()
      }, 100)
      
      // 강제 리로드 (UI 즉시 업데이트)
      setTimeout(() => {
        loadOrders()
      }, 100)
    } catch (error) {
      console.error('[IncomingOrders] Error rejecting order:', error)
      setMessage({
        type: 'error',
        text: `Failed to reject order: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setIsProcessing(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  // Delete order
  const deleteOrder = async (order: IncomingOrder) => {
    if (!confirm(`Delete order ${order.orderId} from inbox? This action cannot be undone.`)) {
      return
    }

    setIsProcessing(true)
    try {
      await indexedDBStorage.deleteIncomingOrder(order.id)
      setMessage({
        type: 'success',
        text: `Order ${order.orderId} deleted.`
      })
      await loadOrders()
      setSelectedOrder(null)
      
      // 강제 리로드 (UI 즉시 업데이트)
      setTimeout(() => {
        loadOrders()
      }, 100)
    } catch (error) {
      console.error('[IncomingOrders] Error deleting order:', error)
      setMessage({
        type: 'error',
        text: `Failed to delete order: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setIsProcessing(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const pendingCount = orders.filter(o => o.inboxStatus === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Inbox className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-2xl font-semibold">Incoming Orders</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve orders from SELPIC homepage
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-semibold">
              {pendingCount} Pending
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'pending'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({orders.filter(o => o.inboxStatus === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'approved'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({orders.filter(o => o.inboxStatus === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'rejected'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Rejected ({orders.filter(o => o.inboxStatus === 'rejected').length})
          </button>
        </div>
      </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : message.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-600 hover:text-gray-800"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

      {/* Orders List */}
      {loading ? (
        <div className="card text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card text-center py-12">
          <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No orders received yet.'
              : `No ${filter} orders.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`card border-2 transition-all ${
                order.inboxStatus === 'pending'
                  ? 'border-purple-200 bg-purple-50/30'
                  : order.inboxStatus === 'approved'
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-red-200 bg-red-50/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-5 h-5 text-gray-600" />
                    <div>
                      <h3 className="font-semibold text-lg">
                        Order: {order.orderId}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Reference: {order.referenceNo}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.inboxStatus === 'pending'
                        ? 'bg-purple-100 text-purple-800'
                        : order.inboxStatus === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {order.inboxStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="font-medium">{formatDateAustralian(order.transactionDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Customer</p>
                        <p className="font-medium">{order.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="font-medium">{formatCurrency(order.grossAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Payment</p>
                        <p className="font-medium">{order.paymentGateway}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>GST: {formatCurrency(order.gstAmount)}</span>
                    <span>Items: {order.items.length}</span>
                    <span>Received: {new Date(order.receivedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {order.inboxStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => approveOrder(order)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => rejectOrder(order)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => deleteOrder(order)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Order Details: {selectedOrder.orderId}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Reference No</p>
                  <p className="font-medium">{selectedOrder.referenceNo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transaction Date</p>
                  <p className="font-medium">{formatDateAustralian(selectedOrder.transactionDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Occurred At</p>
                  <p className="font-medium">{new Date(selectedOrder.occurredAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{selectedOrder.status}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedOrder.customerEmail}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Payment Gateway</p>
                    <p className="font-medium">{selectedOrder.paymentGateway}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">{selectedOrder.paymentMethod}</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Financial Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discount && selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.shipping)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST Collected:</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold text-lg">
                    <span>Total Paid:</span>
                    <span>{formatCurrency(selectedOrder.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.grossAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Items ({selectedOrder.items.length})</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selectedOrder.inboxStatus === 'pending' && (
                <div className="border-t pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      approveOrder(selectedOrder)
                      setSelectedOrder(null)
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Approve & Add to Transactions
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      rejectOrder(selectedOrder)
                      setSelectedOrder(null)
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 수신 로그 박스 */}
      <div className="card border-t-2 border-gray-200 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">수신 로그</h3>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
              {errorLogs.length}개
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowErrorLogs(!showErrorLogs)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              {showErrorLogs ? '숨기기' : '보기'}
            </button>
            {errorLogs.length > 0 && (
              <button
                onClick={clearErrorLogs}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
              >
                모두 삭제
              </button>
            )}
          </div>
        </div>

        {showErrorLogs && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {errorLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>수신 로그가 없습니다.</p>
                <p className="text-sm mt-2">주문 저장 중 오류가 발생하면 여기에 표시됩니다.</p>
              </div>
            ) : (
              errorLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-red-800">
                          주문번호: {log.orderId}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-red-700">
                        오류 사유: {log.reason}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
