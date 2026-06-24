'use client'

import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useStore, ORDER_PLATFORM_LABEL, type OrderPlatformSource, type OrderStatus } from '@/lib/store'
import { orderPlatformBadge, summarizeOrderPersonalization } from '@/lib/adminOrderListUtils'
import { useAdminAuth } from '@/lib/adminAuth'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Truck, Clock, Search, Home, Printer, Download, ArrowUpDown, Filter, Trash2, Globe, RefreshCcw, Trash, Mail, ArrowRight, Edit, X, Calendar, DollarSign, Package, CreditCard, User, History, FileText, Save, Plus, Send, Loader2, Volume2, Store, RefreshCw, ExternalLink } from 'lucide-react'
import {
  formatEtsySyncSuccessMessage,
  runEtsyOrderSync,
  startEtsyOAuth,
} from '@/lib/admin/etsyAdminUi'
import { useEtsyOAuthReturn } from '@/components/admin/useEtsyOAuthReturn'
import { playNewOrderChime, unlockNewOrderChime, enableOrderAlertSoundWithTest, isOrderAlertSoundEnabled } from '@/lib/admin/orderAlertSound'
import { openInternalShippingLabelPdf } from '@/lib/admin/shippingLabelClient'
import ManualOrderCreateModal from '@/components/admin/ManualOrderCreateModal'
import QuickShipLabelModal from '@/components/admin/QuickShipLabelModal'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

const paymentMethodColors: Record<string, string> = {
  stripe: 'bg-indigo-100 text-indigo-800',
  bank: 'bg-emerald-100 text-emerald-800',
  card: 'bg-blue-100 text-blue-800',
  paypal: 'bg-sky-100 text-sky-800',
  cash: 'bg-amber-100 text-amber-800',
  marketplace: 'bg-fuchsia-100 text-fuchsia-800',
}

export default function AdminOrdersPage() {
  const {
    orders,
    products,
    updateOrderStatus,
    deleteOrder,
    updateOrderCustomer,
    updateOrderAddress,
    updateOrderItems,
    updateOrderDiscounts,
    updateOrderShipping,
    recalculateOrderTotal,
    addOrderNote,
    updateOrderNote,
    deleteOrderNote,
    defaultPageSize,
    refreshOrdersFromStorage,
    mergeOrdersFromServer,
    autoRefreshInterval,
  } = useStore()
  const { adminUser } = useAdminAuth()

  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [quickShipModalOpen, setQuickShipModalOpen] = useState(false)
  const manualCatalog = useMemo(
    () =>
      products.map((p) => ({
        id: String(p.id),
        name: p.name,
        price: Number(p.price) || 0,
        image: typeof p.image === 'string' ? p.image : '',
        size: typeof p.size === 'string' ? p.size : undefined,
        twoLineSurcharge: typeof p.twoLineSurcharge === 'number' ? p.twoLineSurcharge : undefined,
      })),
    [products]
  )

  const [ledgerSynced, setLedgerSynced] = useState(false)
  const [shippingLabelBusyId, setShippingLabelBusyId] = useState<string | null>(null)
  const [etsyConn, setEtsyConn] = useState<{
    connected: boolean
    shopName?: string | null
    shopId?: string
  } | null>(null)
  const [etsyBanner, setEtsyBanner] = useState<string | null>(null)
  const [etsySyncBusy, setEtsySyncBusy] = useState(false)

  const refreshEtsyStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/integrations/etsy/status', { credentials: 'same-origin' })
      if (!res.ok) {
        setEtsyConn({ connected: false })
        return
      }
      const data = (await res.json().catch(() => ({}))) as {
        connected?: boolean
        shopName?: string | null
        shopId?: string
      }
      if (typeof data.connected !== 'boolean') {
        setEtsyConn({ connected: false })
        return
      }
      setEtsyConn({
        connected: data.connected,
        shopName: data.shopName,
        shopId: data.shopId,
      })
    } catch {
      setEtsyConn({ connected: false })
    }
  }, [])

  useEffect(() => {
    void refreshEtsyStatus()
  }, [refreshEtsyStatus])

  const syncOrdersFromSupabase = useCallback(async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store', credentials: 'same-origin' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.orders) && data.orders.length > 0) {
        mergeOrdersFromServer(data.orders)
      }
    } catch {
      /* Supabase 미설정 또는 네트워크 오류 — 로컬 주문만 표시 */
    } finally {
      setLedgerSynced(true)
    }
  }, [mergeOrdersFromServer])

  useEtsyOAuthReturn({
    enabled: true,
    onBanner: setEtsyBanner,
    afterConnected: async () => {
      await refreshEtsyStatus()
      await syncOrdersFromSupabase()
    },
  })

  // Supabase ledger first — avoid refreshOrdersFromStorage() overwriting in-memory orders with stale
  // localStorage before mergeOrdersFromServer persists (previously queueMicrotask-only LS write).
  useEffect(() => {
    void (async () => {
      await syncOrdersFromSupabase()
      refreshOrdersFromStorage()
    })()
    const pollMs = autoRefreshInterval > 0 ? autoRefreshInterval : 15000
    const id = window.setInterval(() => {
      void syncOrdersFromSupabase()
    }, pollMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void (async () => {
          await syncOrdersFromSupabase()
          refreshOrdersFromStorage()
        })()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshOrdersFromStorage, syncOrdersFromSupabase, autoRefreshInterval])

  useEffect(() => {
    if (isOrderAlertSoundEnabled()) return
    const onFirstClick = () => {
      void unlockNewOrderChime()
      window.removeEventListener('click', onFirstClick, true)
    }
    window.addEventListener('click', onFirstClick, true)
    return () => window.removeEventListener('click', onFirstClick, true)
  }, [])

  const baselineReadyRef = useRef(false)
  const knownOrderIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!ledgerSynced) return
    if (!baselineReadyRef.current) {
      knownOrderIdsRef.current = new Set(orders.map((o) => o.id))
      baselineReadyRef.current = true
      return
    }
    for (const o of orders) {
      if (knownOrderIdsRef.current.has(o.id)) continue
      knownOrderIdsRef.current.add(o.id)
      if ((o.status === 'paid' || o.status === 'pending') && isOrderAlertSoundEnabled()) {
        playNewOrderChime()
      }
    }
  }, [orders, ledgerSynced])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'selpic-store') {
        refreshOrdersFromStorage()
      }
    }
    const handleOrdersUpdated = () => refreshOrdersFromStorage()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('selpic-store-orders-updated', handleOrdersUpdated)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('selpic-store-orders-updated', handleOrdersUpdated)
    }
  }, [refreshOrdersFromStorage])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [shippingFilter, setShippingFilter] = useState<string>('')
  const [paymentFilter, setPaymentFilter] = useState<string>('')
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [minTotal, setMinTotal] = useState<string>('')
  const [maxTotal, setMaxTotal] = useState<string>('')
  const [vipFilter, setVipFilter] = useState<string>('')
  const [promoFilter, setPromoFilter] = useState<string>('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [sortDesc, setSortDesc] = useState<boolean>(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [selectAll, setSelectAll] = useState(false)
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(defaultPageSize)
  
  // 회계 연동 관련 상태
  const [accountingStartDate, setAccountingStartDate] = useState<string>('')
  const [accountingEndDate, setAccountingEndDate] = useState<string>('')
  const [isSendingToAccounting, setIsSendingToAccounting] = useState(false)
  const [accountingMessage, setAccountingMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const selectedIds = Object.keys(selected).filter(id => selected[id])
  const performedBy = adminUser?.username || 'admin'
  const persistOrderPayloadToLedger = useCallback(
    async (orderId: string) => {
      const latest = useStore.getState().orders.find((o) => o.id === orderId)
      if (!latest) return
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: latest }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to persist order changes.')
      }
      if (data.order) {
        mergeOrdersFromServer([data.order])
      }
    },
    [mergeOrdersFromServer]
  )

  const persistAfterLocalEdit = useCallback(
    (orderId: string) => {
      void persistOrderPayloadToLedger(orderId).catch((e) => {
        void syncOrdersFromSupabase()
        alert(e instanceof Error ? e.message : 'Failed to save order changes')
      })
    },
    [persistOrderPayloadToLedger, syncOrdersFromSupabase]
  )

  const persistStatusToLedger = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, performedBy }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to persist order status.')
      }
      if (data.order) {
        mergeOrdersFromServer([data.order])
      }
    },
    [mergeOrdersFromServer, performedBy]
  )

  const applyStatusChange = useCallback(
    async (orderId: string, status: OrderStatus) => {
      // Keep existing local side effects (emails/grade updates), then persist to server ledger.
      updateOrderStatus(orderId, status, performedBy)
      try {
        await persistStatusToLedger(orderId, status)
      } catch (e) {
        // Roll back to canonical server state when persistence fails.
        void syncOrdersFromSupabase()
        alert(e instanceof Error ? e.message : 'Failed to save status')
      }
    },
    [performedBy, persistStatusToLedger, syncOrdersFromSupabase, updateOrderStatus]
  )

  /** Admin orders UI is English-only; storefront `language` does not apply here. */
  const isKo = false
  const T = isKo
    ? {
        title: '주문 관리',
        refresh: '새로고침',
        dashboard: '대시보드',
        all: '전체',
        printSlips: '패킹 슬립 출력',
        export: '내보내기',
        exportSelected: '선택 항목 내보내기',
        exportAll: '전체 내보내기',
        setProcessing: '처리중으로 변경',
        setShipped: '배송으로 변경',
        cancel: '취소',
        searchPlaceholder: '주문번호 또는 이메일 검색',
        statusAll: '전체 상태',
        pending: '대기',
        paid: '결제완료',
        approved: '승인됨',
        processing: '처리중',
        shipped: '배송',
        cancelled: '취소',
        sortByDate: '날짜 정렬',
        newest: '(최신순)',
        oldest: '(오래된순)',
        allShipping: '전체 배송',
        freeDelivery: '무료 배송',
        standardLetter: 'Standard Letter',
        trackedLetter: 'Tracked Letter',
        expressPost: 'Express Post',
        parcelPost: 'Parcel Post (Goods)',
        localPickup: 'Click & Collect',
        allPayments: '전체 결제',
        card: '신용카드',
        paypal: '페이팔',
        bank: '계좌이체',
        cash: '현장결제',
        minTotal: '최소 금액',
        maxTotal: '최대 금액',
        clear: '초기화',
        exportCsv: 'CSV 내보내기',
        saveViewAs: 'Save view as...',
        saveView: 'Save view',
        table: {
          order: '주문',
          customer: '고객',
          items: '항목',
          personalization: '개인화(이름 등)',
          total: '합계',
          payment: '결제수단',
          shipping: '배송',
          status: '상태',
          actions: '작업',
          followUp: '처리',
          subtotal: '소계',
          shippingLabel: '배송 라벨',
        },
        markPaid: '입금확인 → Paid',
        confirmMarkPaid: '이 주문의 입금을 확인하고 상태를 Paid로 변경할까요?',
        delete: '삭제',
        confirmDelete: '이 주문을 삭제할까요? 이 작업은 되돌릴 수 없습니다.',
        packingSlip: '패킹 슬립',
        noOrders: '주문이 없습니다',
        advancedFilters: '고급 필터',
        dateFrom: '시작일',
        dateTo: '종료일',
        bulkActions: '일괄 작업',
        bulkStatusChange: '상태 변경',
        bulkDelete: '일괄 삭제',
        bulkEmailResend: '이메일 재발송',
        editOrder: '주문 수정',
        orderHistory: '주문 이력',
        adminNotes: '관리자 메모',
        addNote: '메모 추가',
        notePlaceholder: '메모를 입력하세요...',
        save: '저장',
        close: '닫기'
      }
    : {
        title: 'Orders',
        refresh: 'Refresh',
        dashboard: 'Dashboard',
        all: 'All',
        printSlips: 'Print Slips',
        export: 'Export',
        exportSelected: 'Export Selected',
        exportAll: 'Export All',
        setProcessing: 'Set Processing',
        setShipped: 'Set Shipped',
        cancel: 'Cancel',
        searchPlaceholder: 'Search by Order ID or Email',
        statusAll: 'All Statuses',
        pending: 'Pending',
        paid: 'Paid',
        approved: 'Approved',
        processing: 'Processing',
        shipped: 'Shipped',
        cancelled: 'Cancelled',
        sortByDate: 'Sort by Date',
        newest: '(Newest)',
        oldest: '(Oldest)',
        allShipping: 'All Shipping',
        freeDelivery: 'Free Delivery',
        standardLetter: 'Standard Letter',
        trackedLetter: 'Tracked Letter',
        expressPost: 'Express Post',
        parcelPost: 'Parcel Post (Goods)',
        localPickup: 'Click & Collect',
        allPayments: 'All Payments',
        card: 'Credit Card',
        paypal: 'PayPal',
        bank: 'Bank Transfer',
        cash: 'Cash on Delivery',
        minTotal: 'Min Total',
        maxTotal: 'Max Total',
        clear: 'Clear',
        exportCsv: 'Export CSV',
        saveViewAs: 'Save view as...',
        saveView: 'Save View',
        table: {
          order: 'Order',
          customer: 'Customer',
          items: 'Items',
          personalization: 'Personalization',
          total: 'Total',
          payment: 'Payment',
          shipping: 'Shipping',
          status: 'Status',
          actions: 'Actions',
          followUp: 'Follow-up',
          subtotal: 'Subtotal',
          shippingLabel: 'Label',
        },
        markPaid: 'Confirm Deposit → Paid',
        confirmMarkPaid: 'Confirm this deposit and set order status to Paid?',
        delete: 'Delete',
        confirmDelete: 'Delete this order? This action cannot be undone.',
        packingSlip: 'Packing Slip',
        noOrders: 'No orders yet',
        advancedFilters: 'Advanced Filters',
        dateFrom: 'Date From',
        dateTo: 'Date To',
        bulkActions: 'Bulk Actions',
        bulkStatusChange: 'Change Status',
        bulkDelete: 'Bulk Delete',
        bulkEmailResend: 'Resend Emails',
        editOrder: 'Edit Order',
        orderHistory: 'Order History',
        adminNotes: 'Admin Notes',
        addNote: 'Add Note',
        notePlaceholder: 'Enter note...',
        save: 'Save',
        close: 'Close'
      }

  const filtered = useMemo(() => {
    let filteredOrders = orders.filter(o => {
      const c = o.customer
      const tQuery = query.trim().toLowerCase()
      const queryDigitsRaw = (query.match(/\d+/g) || []).join('')
      const queryDigits = queryDigitsRaw.replace(/^\+?61/, '0')
      const customerPhoneDigitsRaw = (c?.phone || '').replace(/\D/g, '')
      const customerPhoneDigits = customerPhoneDigitsRaw.replace(/^\+?61/, '0')
      const matchPhone = queryDigits.length > 0 && customerPhoneDigits.includes(queryDigits)
      const email = (c?.email || '').toLowerCase()
      const name = (c?.name || '').toLowerCase()
      const matchQuery = !tQuery ||
        o.id.toLowerCase().includes(tQuery) ||
        email.includes(tQuery) ||
        name.includes(tQuery) ||
        matchPhone
      
      const matchStatus = !statusFilter || o.status === statusFilter
      const matchShipping = !shippingFilter
        ? true
        : shippingFilter === 'free-delivery'
          ? o.shippingPrice === 0
          : o.shippingOptionId === shippingFilter
      const matchPayment = !paymentFilter || o.paymentMethod === paymentFilter
      const plat = (o.platformSource || 'website') as OrderPlatformSource
      const matchPlatform = !platformFilter || plat === platformFilter
      const orderDate = new Date(o.createdAtIso)
      const fromDate = dateFrom ? new Date(dateFrom) : null
      const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null
      const matchDateFrom = !fromDate || orderDate >= fromDate
      const matchDateTo = !toDate || orderDate <= toDate
      
      const min = minTotal ? parseFloat(minTotal) : null
      const max = maxTotal ? parseFloat(maxTotal) : null
      const matchMinTotal = min === null || o.total >= min
      const matchMaxTotal = max === null || o.total <= max
      
      const matchVip = !vipFilter || (vipFilter === 'with' && o.vipGradeCode !== undefined) || (vipFilter === 'without' && o.vipGradeCode === undefined)
      const matchPromo = !promoFilter || (promoFilter === 'with' && o.promoCode) || (promoFilter === 'without' && !o.promoCode)
      
      return matchQuery && matchStatus && matchShipping && matchPayment && matchPlatform && matchDateFrom && matchDateTo && matchMinTotal && matchMaxTotal && matchVip && matchPromo
    })
    
    return filteredOrders.sort((a, b) => {
      const aTime = new Date(a.createdAtIso).getTime()
      const bTime = new Date(b.createdAtIso).getTime()
      return sortDesc ? bTime - aTime : aTime - bTime
    })
  }, [orders, query, statusFilter, shippingFilter, paymentFilter, platformFilter, dateFrom, dateTo, minTotal, maxTotal, vipFilter, promoFilter, sortDesc])

  // 페이지네이션 계산
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  }, [filtered.length, pageSize])

  useEffect(() => {
    // 필터가 바뀌면 첫 페이지로 이동
    setCurrentPage(1)
  }, [query, statusFilter, shippingFilter, paymentFilter, platformFilter, dateFrom, dateTo, minTotal, maxTotal, vipFilter, promoFilter, sortDesc, pageSize])

  useEffect(() => {
    // 현재 페이지가 범위를 벗어나면 조정
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filtered.slice(start, end)
  }, [filtered, currentPage, pageSize])

  // 현재 페이지의 선택 상태로 selectAll 동기화
  useEffect(() => {
    const allSelectedCurrentPage = paginated.length > 0 && paginated.every(o => selected[o.id])
    if (selectAll !== allSelectedCurrentPage) {
      setSelectAll(allSelectedCurrentPage)
    }
  }, [paginated, selected, selectAll])

  const exportCsv = () => {
    const header = [
      'Order ID','Date','Customer Name','Email','Phone','Status','Subtotal','Shipping','Total','Shipping Option','Address','Items'
    ]
    const rows = filtered.map(o => [
      o.id,
      new Date(o.createdAtIso).toLocaleString(),
      o.customer.name,
      o.customer.email,
      o.customer.phone,
      o.status,
      o.subtotal.toFixed(2),
      o.shippingPrice.toFixed(2),
      o.total.toFixed(2),
      o.shippingOptionId,
      o.address.asSingleLine,
      o.items.map(it => `${it.name} x ${it.quantity}`).join('; ')
    ])
    const csv = [header, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('')
    setShippingFilter('')
    setPaymentFilter('')
    setPlatformFilter('')
    setDateFrom('')
    setDateTo('')
    setMinTotal('')
    setMaxTotal('')
    setVipFilter('')
    setPromoFilter('')
  }

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {}
    paginated.forEach(o => { next[o.id] = checked })
    setSelected(next)
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [id]: checked }))
  }

  const bulkPrint = () => {
    const ids = selectedIds.length ? selectedIds : filtered.map(o => o.id)
    if (ids.length === 0) {
      alert(isKo ? '출력할 주문이 없습니다.' : 'There are no orders to print.')
      return
    }
    const url = `/admin/orders/packing-slips?ids=${encodeURIComponent(ids.join(','))}`
    window.open(url, '_blank')
  }

  const bulkStatusChange = (status: 'processing' | 'shipped' | 'cancelled') => {
    if (selectedIds.length === 0) {
      alert(isKo ? '선택한 주문이 없습니다.' : 'No orders selected.')
      return
    }
    if (confirm(isKo ? `${selectedIds.length}개의 주문을 ${status} 상태로 변경하시겠습니까?` : `Change ${selectedIds.length} orders to ${status}?`)) {
      selectedIds.forEach((id) => {
        void applyStatusChange(id, status)
      })
      setSelected({})
      setSelectAll(false)
    }
  }

  const bulkDelete = () => {
    if (selectedIds.length === 0) {
      alert(isKo ? '선택한 주문이 없습니다.' : 'No orders selected.')
      return
    }
    if (confirm(isKo ? `${selectedIds.length}개의 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` : `Delete ${selectedIds.length} orders? This action cannot be undone.`)) {
      selectedIds.forEach(id => {
        deleteOrder(id, performedBy)
      })
      setSelected({})
      setSelectAll(false)
    }
  }

  const handleSaveOrder = (orderId: string, formData: any) => {
    if (formData.customer) {
      updateOrderCustomer(orderId, formData.customer, performedBy)
    }
    if (formData.address) {
      updateOrderAddress(orderId, formData.address, performedBy)
    }
    if (formData.discounts) {
      updateOrderDiscounts(orderId, formData.discounts, performedBy)
    }
    if (formData.shipping) {
      updateOrderShipping(orderId, formData.shipping.shippingOptionId, formData.shipping.shippingOptionName, performedBy)
    }
    persistAfterLocalEdit(orderId)
    setEditingOrder(null)
  }

  const handleAddNote = (orderId: string) => {
    if (newNote.trim()) {
      addOrderNote(orderId, newNote.trim(), performedBy)
      setNewNote('')
      persistAfterLocalEdit(orderId)
    }
  }

  // 회계 연동: 주문 데이터를 JSON으로 변환
  const convertOrdersToAccountingFormat = (ordersToConvert: typeof orders) => {
    return ordersToConvert.map(order => {
      // GST 계산 (호주 GST 10%)
      const gstExcluded = order.total / 1.1
      const gstAmount = order.total - gstExcluded
      
      return {
        orderId: order.id,
        orderDate: order.createdAtIso,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity
        })),
        subtotal: order.subtotal,
        gst: gstAmount,
        shipping: order.shippingPrice,
        discount: order.discount || 0,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        currency: 'AUD'
      }
    })
  }

  // 회계 연동: 유효한 주문 필터링 (paid, processing, shipped만)
  const getValidOrdersForAccounting = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate + 'T23:59:59')
    
    return orders.filter(order => {
      const orderDate = new Date(order.createdAtIso)
      const isValidDate = orderDate >= start && orderDate <= end
      const isValidStatus = ['paid', 'processing', 'shipped'].includes(order.status)
      return isValidDate && isValidStatus
    })
  }

  // 회계 프로그램으로 전송
  const sendToAccounting = async () => {
    if (!accountingStartDate || !accountingEndDate) {
      setAccountingMessage({
        type: 'error',
        text: isKo ? '시작일과 종료일을 모두 선택해주세요.' : 'Please select both start and end dates.'
      })
      return
    }

    if (new Date(accountingStartDate) > new Date(accountingEndDate)) {
      setAccountingMessage({
        type: 'error',
        text: isKo ? '시작일이 종료일보다 늦을 수 없습니다.' : 'Start date cannot be later than end date.'
      })
      return
    }

    const validOrders = getValidOrdersForAccounting(accountingStartDate, accountingEndDate)
    
    if (validOrders.length === 0) {
      setAccountingMessage({
        type: 'error',
        text: isKo ? '해당 기간에 유효한 주문이 없습니다.' : 'No valid orders found for the selected period.'
      })
      return
    }

    setIsSendingToAccounting(true)
    setAccountingMessage(null)

    try {
      const orderData = convertOrdersToAccountingFormat(validOrders)
      
      let response: Response
      let result: any
      
      try {
        response = await fetch('/api/accounting/orders/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orders: orderData,
            period: {
              startDate: accountingStartDate,
              endDate: accountingEndDate
            }
          })
        })
      } catch (networkError: any) {
        console.error('[Admin Orders] Network error:', networkError)
        setAccountingMessage({
          type: 'error',
          text: isKo 
            ? `네트워크 오류: ${networkError.message || '서버에 연결할 수 없습니다. 회계 프로그램이 실행 중인지 확인해주세요.'}`
            : `Network Error: ${networkError.message || 'Cannot connect to server. Please check if the accounting program is running.'}`
        })
        setIsSendingToAccounting(false)
        return
      }

      // Response가 비어있는지 확인
      if (!response) {
        setAccountingMessage({
          type: 'error',
          text: isKo 
            ? '서버 응답이 없습니다. 회계 프로그램이 실행 중인지 확인해주세요.'
            : 'No server response. Please check if the accounting program is running.'
        })
        setIsSendingToAccounting(false)
        return
      }

      // Response 상태 확인
      console.log('[Admin Orders] Response status:', response.status, response.statusText)
      
      try {
        const responseText = await response.text()
        if (!responseText) {
          setAccountingMessage({
            type: 'error',
            text: isKo 
              ? `서버 응답이 비어있습니다. (Status: ${response.status})`
              : `Empty server response. (Status: ${response.status})`
          })
          setIsSendingToAccounting(false)
          return
        }
        
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('[Admin Orders] JSON parse error:', parseError)
        setAccountingMessage({
          type: 'error',
          text: isKo 
            ? `서버 응답 파싱 오류: ${parseError instanceof Error ? parseError.message : String(parseError)} (Status: ${response.status})`
            : `Response parse error: ${parseError instanceof Error ? parseError.message : String(parseError)} (Status: ${response.status})`
        })
        setIsSendingToAccounting(false)
        return
      }

      if (response.ok) {
        // 🔧 CRITICAL: Save API response to localStorage for accounting program to process
        // 회계 프로그램이 이 응답을 읽어서 IndexedDB에 저장
        if (result.orders && Array.isArray(result.orders) && result.orders.length > 0) {
          // Save API response (new method - more reliable)
          const apiResponseKey = 'selpic_api_orders_response'
          localStorage.setItem(apiResponseKey, JSON.stringify({
            orders: result.orders,
            period: result.period,
            timestamp: new Date().toISOString(),
            importedCount: result.importedCount || result.orders.length
          }))
          console.log('[Admin Orders] ✅ Saved API response to localStorage:', {
            ordersCount: result.orders.length,
            orderIds: result.orders.map((o: any) => o.orderId).join(', ')
          })
          
          // Also save to legacy pending orders key for backward compatibility
          const pendingOrdersKey = 'selpic_pending_orders'
          const existingOrdersJson = localStorage.getItem(pendingOrdersKey)
          let existingOrders: any[] = []
          
          if (existingOrdersJson) {
            try {
              existingOrders = JSON.parse(existingOrdersJson)
            } catch (e) {
              console.error('Error parsing existing orders:', e)
            }
          }
          
          // 새 주문 추가 (중복 제거)
          const existingOrderIds = new Set(existingOrders.map((o: any) => o.orderId))
          const newOrders = result.orders.filter((o: any) => !existingOrderIds.has(o.orderId))
          const allOrders = [...existingOrders, ...newOrders]
          
          localStorage.setItem(pendingOrdersKey, JSON.stringify(allOrders))
          console.log('[Admin Orders] Saved orders to localStorage (legacy):', allOrders.length)
          
          // 저장 직전 알림 표시
          if (newOrders.length > 0) {
            const orderIds = newOrders.map((o: any) => o.orderId).join(', ')
            alert(`데이터 수신 성공: 주문번호 [${orderIds}]를 저장합니다.`)
          }
        }
        
        setAccountingMessage({
          type: 'success',
          text: isKo 
            ? `${result.importedCount || result.orders?.length || 0}개의 주문이 성공적으로 전송되었습니다. 회계 프로그램을 열면 자동으로 Inbox에 추가됩니다.`
            : `Successfully sent ${result.importedCount || result.orders?.length || 0} orders. Open the accounting program to process them.`
        })
        // 성공 후 메시지 5초 후 자동 제거
        setTimeout(() => setAccountingMessage(null), 5000)
      } else {
        // 구체적인 에러 메시지 표시
        const errorMessage = result.error || 'Unknown error'
        const errorDetails = result.details ? ` (${result.details})` : ''
        const errorSuggestion = result.suggestion ? `\n${result.suggestion}` : ''
        
        let fullErrorMessage = errorMessage + errorDetails + errorSuggestion
        
        // HTTP 상태 코드별 구체적인 메시지
        if (response.status === 404) {
          fullErrorMessage = isKo 
            ? `API 엔드포인트를 찾을 수 없습니다. (404 Not Found)\n회계 프로그램의 /api/orders/import 경로가 존재하는지 확인해주세요.`
            : `API endpoint not found. (404 Not Found)\nPlease check if /api/orders/import route exists in the accounting program.`
        } else if (response.status === 503) {
          fullErrorMessage = isKo 
            ? `회계 프로그램이 실행되지 않았습니다. (503 Service Unavailable)\n포트 3001에서 회계 프로그램을 실행해주세요.`
            : `Accounting program is not running. (503 Service Unavailable)\nPlease start the accounting program on port 3001.`
        } else if (response.status === 500) {
          fullErrorMessage = isKo 
            ? `서버 내부 오류가 발생했습니다. (500 Internal Server Error)\n${errorMessage}${errorDetails}`
            : `Internal server error occurred. (500 Internal Server Error)\n${errorMessage}${errorDetails}`
        }
        
        setAccountingMessage({
          type: 'error',
          text: fullErrorMessage
        })
      }
    } catch (error) {
      console.error('[Admin Orders] Error:', error)
      
      // 에러 타입별 구체적인 메시지
      let errorMessage = ''
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = isKo 
          ? `네트워크 연결 실패: 회계 프로그램(포트 3001)에 연결할 수 없습니다.\n회계 프로그램이 실행 중인지 확인해주세요.`
          : `Network connection failed: Cannot connect to accounting program (port 3001).\nPlease check if the accounting program is running.`
      } else if (error instanceof Error) {
        errorMessage = isKo 
          ? `오류 발생: ${error.message}`
          : `Error occurred: ${error.message}`
      } else {
        errorMessage = isKo 
          ? `알 수 없는 오류가 발생했습니다: ${String(error)}`
          : `Unknown error occurred: ${String(error)}`
      }
      
      setAccountingMessage({
        type: 'error',
        text: errorMessage
      })
    } finally {
      setIsSendingToAccounting(false)
    }
  }

  const currentOrder = editingOrder ? orders.find(o => o.id === editingOrder) : null
  const historyOrder = showHistory ? orders.find(o => o.id === showHistory) : null
  const notesOrder = showNotes ? orders.find(o => o.id === showNotes) : null

  const getPaymentMethodLabel = (order: any) => {
    const method = String(order?.paymentMethod || '').toLowerCase()
    if (method === 'stripe') return 'Stripe'
    if (method === 'marketplace') return String(order?.paymentMethodName || 'Marketplace').trim() || 'Marketplace'
    if (method === 'bank') return T.bank
    if (method === 'card') return T.card
    if (method === 'paypal') return T.paypal
    if (method === 'cash') return T.cash
    const fallback = String(order?.paymentMethodName || method || 'Unknown').trim()
    return fallback || 'Unknown'
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title={T.title}
          icon={<Truck className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel={T.dashboard}
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-white px-4 py-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white shadow">
                <Store className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Etsy shop</p>
                <p className="text-sm text-gray-600">
                  {etsyConn === null
                    ? isKo
                      ? 'Etsy 연결 상태를 확인하는 중…'
                      : 'Checking Etsy connection…'
                    : etsyConn.connected
                      ? isKo
                        ? `연결됨${etsyConn.shopName ? ` · ${etsyConn.shopName}` : ''}${etsyConn.shopId ? ` (shop ${etsyConn.shopId})` : ''}.`
                        : `Connected${etsyConn.shopName ? ` · ${etsyConn.shopName}` : ''}${etsyConn.shopId ? ` (shop ${etsyConn.shopId})` : ''}.`
                      : isKo
                        ? 'Etsy 샵이 연결되지 않았습니다.'
                        : 'Etsy shop is not connected.'}
                </p>
                <p className="mt-1 text-xs text-violet-800/90">
                  <Link href="/admin/integrations" className="font-medium underline hover:text-violet-950">
                    {isKo ? 'Integrations (연결·설정)' : 'Integrations (connect & settings)'}
                  </Link>
                </p>
              </div>
            </div>
            {etsyBanner ? (
              <div className="w-full rounded-lg border border-violet-200 bg-white/80 px-3 py-2 text-sm text-gray-800">
                {etsyBanner}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {etsyConn?.connected ? (
                <button
                  type="button"
                  disabled={etsySyncBusy}
                  onClick={() => {
                    void (async () => {
                      setEtsySyncBusy(true)
                      setEtsyBanner(null)
                      try {
                        const result = await runEtsyOrderSync()
                        if (!result.ok) {
                          setEtsyBanner(result.error ?? 'Sync failed.')
                          return
                        }
                        setEtsyBanner(
                          formatEtsySyncSuccessMessage(result.imported, result.scanned, result.sinceDays)
                        )
                        await syncOrdersFromSupabase()
                      } finally {
                        setEtsySyncBusy(false)
                      }
                    })()
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${etsySyncBusy ? 'animate-spin' : ''}`} aria-hidden />
                  {etsySyncBusy
                    ? isKo
                      ? '가져오는 중…'
                      : 'Syncing…'
                    : isKo
                      ? 'Etsy 주문 가져오기'
                      : 'Sync Etsy orders'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startEtsyOAuth('/admin/orders')}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 shadow-sm hover:bg-violet-50"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  {isKo ? 'Etsy 샵 연결하기' : 'Connect Etsy shop'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setQuickShipModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-50"
              >
                <Printer className="h-4 w-4" aria-hidden />
                {isKo ? '빠른 발송 라벨' : 'Quick ship label'}
              </button>
              <button
                type="button"
                onClick={() => setManualModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {isKo ? '주문 수동 추가' : 'Add order manually'}
              </button>
            </div>
          </div>
        </div>

        <QuickShipLabelModal
          open={quickShipModalOpen}
          onClose={() => setQuickShipModalOpen(false)}
          mergeOrdersFromServer={mergeOrdersFromServer}
          onCreated={() => {
            void syncOrdersFromSupabase()
          }}
        />

        <ManualOrderCreateModal
          open={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          products={manualCatalog}
          onCreated={(order) => {
            mergeOrdersFromServer([order])
            void syncOrdersFromSupabase()
          }}
        />

        {!isOrderAlertSoundEnabled() && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 shrink-0" />
                {isKo
                  ? '새 주문(결제 완료·무통장 대기)이 들어오면 알림 효과음이 납니다. 브라우저 정책상 한 번 클릭하거나 아래 버튼으로 재생을 허용해 주세요. 효과음 파일: public/sounds/new-order-alert.mp3'
                  : 'Plays your order alert sound when a new pending or paid order arrives. Click once or use the button below. Sound file: public/sounds/new-order-alert.mp3'}
              </span>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700"
                onClick={() => void enableOrderAlertSoundWithTest()}
              >
                {isKo ? '알림음 허용' : 'Enable chime'}
              </button>
            </div>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={T.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">{T.statusAll}</option>
                <option value="pending">{T.pending}</option>
                <option value="paid">{T.paid}</option>
                <option value="approved">{T.approved}</option>
                <option value="processing">{T.processing}</option>
                <option value="shipped">{T.shipped}</option>
                <option value="cancelled">{T.cancelled}</option>
              </select>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter size={16} />
                {T.advancedFilters}
              </button>
              <button
                onClick={() => setSortDesc(!sortDesc)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowUpDown size={16} />
                {T.sortByDate}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    refreshOrdersFromStorage()
                    syncOrdersFromSupabase()
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title={isKo ? '로컬 + Supabase 주문 동기화' : 'Sync local storage + Supabase orders'}
                >
                  <RefreshCcw size={16} />
                  {T.refresh}
                </button>
                <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Download size={16}/> {T.exportCsv}</button>
                <button onClick={bulkPrint} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"><Printer size={16}/> {T.printSlips}</button>
              </div>
            </div>

            {/* 회계 연동 섹션 */}
            <div className="border-t pt-4 mt-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {isKo ? '회계 프로그램 연동' : 'Accounting Integration'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isKo ? '시작일' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={accountingStartDate}
                    onChange={(e) => setAccountingStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isKo ? '종료일' : 'End Date'}
                  </label>
                  <input
                    type="date"
                    value={accountingEndDate}
                    onChange={(e) => setAccountingEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <button
                    onClick={sendToAccounting}
                    disabled={isSendingToAccounting || !accountingStartDate || !accountingEndDate}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isSendingToAccounting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isKo ? '전송 중...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>{isKo ? '회계 프로그램으로 전송' : 'Send to Accounting'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              {accountingMessage && (
                <div className={`mt-3 p-3 rounded-lg ${
                  accountingMessage.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {accountingMessage.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{accountingMessage.text}</span>
                  </div>
                </div>
              )}
              {accountingStartDate && accountingEndDate && (
                <div className="mt-3 text-sm text-gray-600">
                  {isKo ? (
                    <>
                      선택 기간: <strong>{accountingStartDate}</strong> ~ <strong>{accountingEndDate}</strong>
                      <br />
                      유효한 주문: <strong>{getValidOrdersForAccounting(accountingStartDate, accountingEndDate).length}개</strong> (paid, processing, shipped 상태만)
                    </>
                  ) : (
                    <>
                      Selected period: <strong>{accountingStartDate}</strong> ~ <strong>{accountingEndDate}</strong>
                      <br />
                      Valid orders: <strong>{getValidOrdersForAccounting(accountingStartDate, accountingEndDate).length}</strong> (paid, processing, shipped only)
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T.dateFrom}</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T.dateTo}</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T.minTotal}</label>
                  <input
                    type="number"
                    value={minTotal}
                    onChange={(e) => setMinTotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T.maxTotal}</label>
                  <input
                    type="number"
                    value={maxTotal}
                    onChange={(e) => setMaxTotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T.allShipping}</label>
                  <select
                    value={shippingFilter}
                    onChange={(e) => setShippingFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">{T.allShipping}</option>
                    <option value="free-delivery">{T.freeDelivery}</option>
                    <option value="standard-letter">{T.standardLetter}</option>
                    <option value="tracked-letter">{T.trackedLetter}</option>
                    <option value="express-post">{T.expressPost}</option>
                    <option value="parcel-post">{T.parcelPost}</option>
                    <option value="local-pickup">{T.localPickup}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T.allPayments}</label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">{T.allPayments}</option>
                    <option value="card">{T.card}</option>
                    <option value="paypal">{T.paypal}</option>
                    <option value="bank">{T.bank}</option>
                    <option value="cash">{T.cash}</option>
                    <option value="stripe">Stripe</option>
                    <option value="marketplace">Marketplace (Etsy, …)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All platforms</option>
                    {(Object.keys(ORDER_PLATFORM_LABEL) as OrderPlatformSource[]).map((k) => (
                      <option key={k} value={k}>
                        {ORDER_PLATFORM_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIP Grade</label>
                  <select
                    value={vipFilter}
                    onChange={(e) => setVipFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All</option>
                    <option value="with">With VIP</option>
                    <option value="without">Without VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                  <select
                    value={promoFilter}
                    onChange={(e) => setPromoFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All</option>
                    <option value="with">With Promo</option>
                    <option value="without">Without Promo</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    {T.clear}
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="border-t pt-4 mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">{isKo ? `${selectedIds.length}개 선택됨` : `${selectedIds.length} selected`}</span>
                <button
                  onClick={() => bulkStatusChange('processing')}
                  className="px-3 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-sm"
                >
                  {T.setProcessing}
                </button>
                <button
                  onClick={() => bulkStatusChange('shipped')}
                  className="px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm"
                >
                  {T.setShipped}
                </button>
                <button
                  onClick={() => bulkStatusChange('cancelled')}
                  className="px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm"
                >
                  {T.cancel}
                </button>
                <button
                  onClick={bulkDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  {T.bulkDelete}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3"><input type="checkbox" checked={selectAll} onChange={e => toggleAll(e.target.checked)} /></th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">{T.table.order}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">{T.table.customer}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">{T.table.items}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200 max-w-[14rem]">
                      {T.table.personalization}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">{T.table.actions}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">{T.table.followUp}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">{T.table.total}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">{T.table.payment}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">{T.table.status}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider border-r border-gray-200">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">{T.table.shippingLabel}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginated.map((order) => {
                    const plat = orderPlatformBadge(order)
                    const pers = summarizeOrderPersonalization(order)
                    return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm border-r border-gray-100"><input type="checkbox" checked={!!selected[order.id]} onChange={e => toggleOne(order.id, e.target.checked)} /></td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={plat.className}>{plat.text}</span>
                        </div>
                        <div className="font-medium text-gray-900">{order.id}</div>
                        <div className="text-gray-500">{new Date(order.createdAtIso).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-gray-900">{order.customer.name}</div>
                            <div className="text-gray-500">{order.customer.email}</div>
                            <div className="text-gray-500">{order.customer.phone}</div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(T.confirmDelete)) deleteOrder(order.id, performedBy)
                            }}
                            title={T.delete}
                            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md text-red-600 hover:bg-red-50 border border-red-200"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        <div className="space-y-1 text-gray-900">
                          {order.items.slice(0, 3).map((it, idx) => (
                            <div key={`${order.id}-${idx}`} className="truncate">
                              {it.name}
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{order.items.length - 3} more
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 text-sm border-r border-gray-100 max-w-[14rem] align-top"
                        title={pers === '—' ? undefined : pers}
                      >
                        <p className="text-xs text-gray-800 line-clamp-3 whitespace-pre-wrap break-words">{pers}</p>
                      </td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        <div className="flex gap-1">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs flex-1"
                          >
                            <Home size={12} /> View
                          </Link>
                          <button
                            onClick={() => setEditingOrder(order.id)}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs flex-1"
                          >
                            <Edit size={12} /> {T.editOrder}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setShowHistory(order.id)}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 text-xs flex-1"
                          >
                            <History size={12} /> {T.orderHistory}
                          </button>
                          <button
                            onClick={() => setShowNotes(order.id)}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 text-xs flex-1"
                          >
                            <FileText size={12} /> {T.adminNotes}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        <div className="font-semibold text-gray-900">${order.total.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            paymentMethodColors[String(order.paymentMethod || '').toLowerCase()] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {getPaymentMethodLabel(order)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={order.status}
                            onChange={(e) => {
                              void applyStatusChange(order.id, e.target.value as OrderStatus)
                            }}
                            className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-900"
                            aria-label="Order status"
                          >
                            <option value="pending">{T.pending}</option>
                            <option value="paid">{T.paid}</option>
                            <option value="approved">{T.approved}</option>
                            <option value="processing">{T.processing}</option>
                            <option value="shipped">{T.shipped}</option>
                            <option value="cancelled">{T.cancelled}</option>
                          </select>
                          {String(order.paymentMethod || '').toLowerCase() === 'bank' && order.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(T.confirmMarkPaid)) {
                                  void applyStatusChange(order.id, 'paid')
                                }
                              }}
                              className="block w-full text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              {T.markPaid}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-r border-gray-100">
                        {order.emailConfirmation ? (
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              order.emailConfirmation.status === 'sent' || order.emailConfirmation.status === 'delivered' ? 'bg-green-500' :
                              order.emailConfirmation.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                            }`}></span>
                            <span className="text-xs capitalize">{order.emailConfirmation.status}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not sent</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm align-top">
                        <button
                          type="button"
                          disabled={!!shippingLabelBusyId}
                          title="Open shipping label PDF (Standard Letter layout)"
                          onClick={(e) => {
                            e.stopPropagation()
                            void (async () => {
                              setShippingLabelBusyId(order.id)
                              try {
                                const r = await openInternalShippingLabelPdf(order.id, {
                                  onOrderMerged: (o) => mergeOrdersFromServer([o]),
                                })
                                if (!r.ok) window.alert(r.error || 'Failed to open label')
                              } finally {
                                setShippingLabelBusyId(null)
                              }
                            })()
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-gray-300 text-xs text-gray-800 bg-white hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
                        >
                          {shippingLabelBusyId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5 shrink-0" />
                          )}
                          Print label
                        </button>
                      </td>
                    </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <Clock size={18} /> {T.noOrders}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                {filtered.length === 0
                  ? 'No orders to display'
                  : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(filtered.length, currentPage * pageSize)} of ${filtered.length}`}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                  >
                    {[10, 25, 50, 100].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                  >
                    Prev
                  </button>
                  <div className="text-sm font-medium text-gray-700">
                    {currentPage} / {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || filtered.length === 0}
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Order Modal */}
        {editingOrder && currentOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">{T.editOrder} - {currentOrder.id}</h2>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <OrderEditForm order={currentOrder} onSave={(data) => handleSaveOrder(currentOrder.id, data)} onCancel={() => setEditingOrder(null)} T={T} />
              </div>
            </div>
          </div>
        )}

        {/* Order History Modal */}
        {showHistory && historyOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">{T.orderHistory} - {historyOrder.id}</h2>
                <button
                  onClick={() => setShowHistory(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <OrderHistoryView order={historyOrder} T={T} />
              </div>
            </div>
          </div>
        )}

        {/* Admin Notes Modal */}
        {showNotes && notesOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">{T.adminNotes} - {notesOrder.id}</h2>
                <button
                  onClick={() => setShowNotes(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <AdminNotesView 
                  order={notesOrder} 
                  newNote={newNote}
                  onNewNoteChange={setNewNote}
                  onAddNote={() => handleAddNote(notesOrder.id)}
                  onDeleteNote={(noteId) => {
                    deleteOrderNote(notesOrder.id, noteId, performedBy)
                    persistAfterLocalEdit(notesOrder.id)
                  }}
                  T={T}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}

// Order Edit Form Component
function OrderEditForm({ order, onSave, onCancel, T }: { order: any, onSave: (data: any) => void, onCancel: () => void, T: any }) {
  const [customer, setCustomer] = useState(order.customer)
  const [address, setAddress] = useState(order.address)
  const [discounts, setDiscounts] = useState({
    vipDiscount: order.vipDiscount || 0,
    promoDiscount: order.promoDiscount || 0,
    promoCode: order.promoCode || ''
  })
  const [shipping, setShipping] = useState({
    shippingOptionId: order.shippingOptionId,
    shippingOptionName: order.shippingOptionName || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ customer, address, discounts, shipping })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={address.streetAddress}
              onChange={(e) => setAddress({ ...address, streetAddress: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
            <input
              type="text"
              value={address.suburb}
              onChange={(e) => setAddress({ ...address, suburb: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
            <input
              type="text"
              value={address.postcode}
              onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Discounts</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIP Discount</label>
            <input
              type="number"
              step="0.01"
              value={discounts.vipDiscount}
              onChange={(e) => setDiscounts({ ...discounts, vipDiscount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Discount</label>
            <input
              type="number"
              step="0.01"
              value={discounts.promoDiscount}
              onChange={(e) => setDiscounts({ ...discounts, promoDiscount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
            <input
              type="text"
              value={discounts.promoCode}
              onChange={(e) => setDiscounts({ ...discounts, promoCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Shipping</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Option ID</label>
            <input
              type="text"
              value={shipping.shippingOptionId}
              onChange={(e) => setShipping({ ...shipping, shippingOptionId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Option Name</label>
            <input
              type="text"
              value={shipping.shippingOptionName}
              onChange={(e) => setShipping({ ...shipping, shippingOptionName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          {T.cancel}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {T.save}
        </button>
      </div>
    </form>
  )
}

// Order History View Component
function OrderHistoryView({ order, T }: { order: any, T: any }) {
  const auditLog = order.auditLog || []
  
  return (
    <div className="space-y-4">
      {auditLog.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No history available</p>
      ) : (
        <div className="space-y-3">
          {auditLog.map((entry: any) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-900">{entry.action.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-gray-500">{new Date(entry.timestamp).toLocaleString()}</div>
                </div>
                <div className="text-sm text-gray-600">By: {entry.performedBy}</div>
              </div>
              {entry.description && (
                <div className="text-sm text-gray-700 mt-2">{entry.description}</div>
              )}
              {entry.changes && entry.changes.length > 0 && (
                <div className="mt-3 space-y-1">
                  {entry.changes.map((change: any, idx: number) => (
                    <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                      <span className="font-medium">{change.field}:</span>{' '}
                      <span className="text-red-600">{String(change.oldValue)}</span> →{' '}
                      <span className="text-green-600">{String(change.newValue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Admin Notes View Component
function AdminNotesView({ order, newNote, onNewNoteChange, onAddNote, onDeleteNote, T }: { order: any, newNote: string, onNewNoteChange: (value: string) => void, onAddNote: () => void, onDeleteNote: (noteId: string) => void, T: any }) {
  const notes = order.adminNotes || []
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{T.addNote}</label>
        <div className="flex gap-2">
          <textarea
            value={newNote}
            onChange={(e) => onNewNoteChange(e.target.value)}
            placeholder={T.notePlaceholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            rows={3}
          />
          <button
            onClick={onAddNote}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No notes yet</p>
        ) : (
          notes.map((note: any) => (
            <div key={note.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm text-gray-500">
                    {new Date(note.createdAt).toLocaleString()} by {note.createdBy}
                  </div>
                  {note.updatedAt && (
                    <div className="text-xs text-gray-400">
                      Updated: {new Date(note.updatedAt).toLocaleString()} by {note.updatedBy}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash size={16} />
                </button>
              </div>
              <div className="text-gray-700 whitespace-pre-wrap">{note.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
