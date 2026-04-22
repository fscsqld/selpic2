'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMessageStore } from '@/lib/messageStore'
import { 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart, 
  Settings, 
  FileText, 
  Image, 
  LogOut,
  TrendingUp,
  Eye,
  Star,
  AlertCircle,
  Home,
  DollarSign,
  MessageSquare,
  MessageCircle,
  Mail,
  FileCheck,
  X,
  Calculator,
  Receipt,
  BookOpen,
  Building2
} from 'lucide-react'

import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/formatUtils'
import { useAdminAuth } from '@/lib/adminAuth'
import { useUserAuth } from '@/lib/userAuth'
import AdminRoute from '@/components/AdminRoute'
import { useTranslation } from '@/lib/useTranslation'
import AdminOrderNotification from '@/components/AdminOrderNotification'
import { useSalesGoals } from '@/lib/salesGoals'

export default function AdminDashboard() {
  const [isComponentReady, setIsComponentReady] = useState(false)
  const [showSELPICAModal, setShowSELPICAModal] = useState(false)
  
  const { adminUser, logout } = useAdminAuth()
  const { products, orders, currency, autoRefreshInterval, _hasHydrated, refreshProducts, refreshOrdersFromStorage } = useStore()
  const { users } = useUserAuth()
  const { unreadCount } = useMessageStore()
  const { notifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useSalesGoals()
  const router = useRouter()
  const { t } = useTranslation()
  const accountingBaseUrl = process.env.NEXT_PUBLIC_ACCOUNTING_URL || 'http://localhost:3001'
  
  const salesUnreadCount = getUnreadCount()
  const totalUnreadCount = unreadCount + salesUnreadCount

  // 컴포넌트 준비 상태 관리
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComponentReady(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 스토어 복원 후·대시보드 진입 시 상품·주문 동기화 (고객 주문이 통계에 반영되도록)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (_hasHydrated) {
      refreshProducts()
      refreshOrdersFromStorage()
    }
  }, [_hasHydrated, refreshProducts, refreshOrdersFromStorage])

  // 다른 탭/페이지에서 상품·주문 변경 시 대시보드 통계 갱신 (고객 주문 반영)
  useEffect(() => {
    const handleProductsUpdate = () => { refreshProducts() }
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'selpic-store') {
        refreshProducts()
        refreshOrdersFromStorage()
      }
    }
    const handleOrdersUpdated = () => {
      refreshOrdersFromStorage()
    }
    window.addEventListener('products-store-updated', handleProductsUpdate)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('selpic-store-orders-updated', handleOrdersUpdated)
    return () => {
      window.removeEventListener('products-store-updated', handleProductsUpdate)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('selpic-store-orders-updated', handleOrdersUpdated)
    }
  }, [refreshProducts, refreshOrdersFromStorage])

  // 자동 새로고침 기능
  useEffect(() => {
    if (autoRefreshInterval <= 0) return

    const interval = setInterval(() => {
      // 데이터 새로고침 (Zustand store는 자동으로 업데이트되지만, 강제 리렌더링을 위해)
      console.log('🔄 Auto refreshing dashboard data...')
      // 페이지 새로고침 대신 상태 업데이트 트리거
      setIsComponentReady(prev => !prev)
    }, autoRefreshInterval)

    return () => clearInterval(interval)
  }, [autoRefreshInterval])

  // 실시간 통계 계산 (useMemo로 최적화)
  const statsData = useMemo(() => {
    // 사용자 수 (createdAt이 있는 사용자만 카운트)
    const newUsersCount = users.filter(u => !!u.createdAt && !u.isDemo).length
    
    // 주문 수
    const ordersCount = orders.length
    
    // 최근 30일 주문 수
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentOrdersCount = orders.filter(order => {
      const orderDate = new Date(order.createdAtIso)
      return orderDate >= thirtyDaysAgo
    }).length
    
    // 총 매출 (취소된 주문 제외)
    const totalRevenue = orders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + (order.total || 0), 0)
    
    return {
      newUsersCount,
      ordersCount,
      recentOrdersCount,
      totalRevenue
    }
  }, [users, orders])

  const pendingBankOrders = useMemo(
    () =>
      orders
        .filter((o) => o.paymentMethod === 'bank' && o.status === 'pending')
        .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime())
        .slice(0, 8),
    [orders]
  )

  // 시간대별 인사말
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('admin.dashboard.greeting.morning')
    if (hour < 18) return t('admin.dashboard.greeting.afternoon')
    return t('admin.dashboard.greeting.evening')
  }

  const greeting = adminUser ? `${getGreeting()}, ${adminUser.username}!` : t('admin.dashboard.greeting.default')

  const handleLogout = () => {
    logout()
    router.push('/admin/login')
  }


  const displayAdminName = adminUser?.username || t('admin.common.admin')

  const stats = [
    {
      title: t('admin.dashboard.stats.products'),
      value: _hasHydrated ? products.length : '—',
      icon: Package,
      color: 'bg-blue-500',
      change: _hasHydrated ? '+12%' : '...'
    },
    {
      title: t('admin.dashboard.stats.newUsers'),
      value: statsData.newUsersCount,
      icon: Users,
      color: 'bg-indigo-500',
      change: '+0%'
    },
    {
      title: t('admin.dashboard.stats.orders'),
      value: statsData.ordersCount,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      change: statsData.recentOrdersCount > 0 ? `+${statsData.recentOrdersCount}` : '+0'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(statsData.totalRevenue, currency),
      icon: DollarSign,
      color: 'bg-green-500',
      change: statsData.recentOrdersCount > 0 ? `+${statsData.recentOrdersCount} orders` : 'No recent orders'
    }
  ]

  // Helper function to check if admin has permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!adminUser) return false
    // Super admin has all permissions
    if (adminUser.role === 'super_admin') return true
    return adminUser.permissions.includes(permission)
  }, [adminUser])

  // Helper function to check if admin is accounting manager
  const isAccountingManager = useCallback((): boolean => {
    if (!adminUser) return false
    // Super admin is always accounting manager
    if (adminUser.role === 'super_admin') return true
    // Check if admin has accounting:admin or accounting:full permission
    return adminUser.permissions.includes('accounting:admin') || 
           adminUser.permissions.includes('accounting:full')
  }, [adminUser])

  // Helper function to check if admin has payroll access only
  const hasPayrollAccessOnly = useCallback((): boolean => {
    if (!adminUser) return false
    // Super admin and accounting managers have full access
    if (isAccountingManager()) return false
    // Check if admin has payroll:read or payroll:access permission
    return adminUser.permissions.includes('payroll:read') || 
           adminUser.permissions.includes('payroll:access')
  }, [adminUser, isAccountingManager])

  // Listen for permission changes and force re-render
  const [permissionUpdateKey, setPermissionUpdateKey] = useState(0)
  
  useEffect(() => {
    const handleAuthUpdate = () => {
      console.log('🔄 Dashboard: Admin auth updated, refreshing Quick Actions...')
      // Get latest admin user from store
      const latestAdminUser = useAdminAuth.getState().adminUser
      console.log('🔄 Latest admin user permissions:', latestAdminUser?.permissions)
      // Force re-render by updating key
      setPermissionUpdateKey(prev => prev + 1)
    }

    window.addEventListener('admin-auth-updated', handleAuthUpdate)
    return () => window.removeEventListener('admin-auth-updated', handleAuthUpdate)
  }, [])

  // Memoize quickActions to recalculate when adminUser or permissionUpdateKey changes
  const quickActions = useMemo(() => [
    {
      title: t('admin.dashboard.quickActions.users.title'),
      description: t('admin.dashboard.quickActions.users.description'),
      icon: Users,
      href: '/admin/users',
      color: 'bg-indigo-500',
      requiredPermission: 'users:read'
    },
    {
      title: t('admin.dashboard.quickActions.products.title'),
      description: t('admin.dashboard.quickActions.products.description'),
      icon: Package,
      href: '/admin/products',
      color: 'bg-blue-500',
      requiredPermission: 'products:read'
    },
    {
      title: t('admin.dashboard.quickActions.content.title'),
      description: t('admin.dashboard.quickActions.content.description'),
      icon: FileText,
      href: '/admin/content',
      color: 'bg-green-500',
      requiredPermission: 'content:read'
    },
    {
      title: t('admin.dashboard.quickActions.images.title'),
      description: t('admin.dashboard.quickActions.images.description'),
      icon: Image,
      href: '/admin/images',
      color: 'bg-purple-500',
      requiredPermission: 'images:read'
    },
    {
      title: t('admin.dashboard.quickActions.orders.title'),
      description: t('admin.dashboard.quickActions.orders.description'),
      icon: ShoppingCart,
      href: '/admin/orders',
      color: 'bg-orange-500',
      requiredPermission: 'orders:read'
    },
    {
      title: t('admin.dashboard.quickActions.sales.title'),
      description: t('admin.dashboard.quickActions.sales.description'),
      icon: DollarSign,
      href: '/admin/sales-overview',
      color: 'bg-emerald-500',
      badge: salesUnreadCount > 0 ? salesUnreadCount : undefined,
      requiredPermission: 'analytics:read'
    },
    {
      title: 'Customer Messages',
      description: 'View and manage customer inquiries',
      icon: MessageSquare,
      href: '/admin/messages',
      color: 'bg-pink-500',
      badge: unreadCount > 0 ? unreadCount : undefined,
      requiredPermission: 'messages:read'
    },
    {
      title: 'Bespoke Label Requests',
      description: 'Logo/image uploads & custom label submissions',
      icon: Image,
      href: '/admin/bespoke-requests',
      color: 'bg-indigo-500',
      requiredPermission: 'messages:read'
    },
    {
      title: 'Newsletter',
      description: 'Manage newsletter subscribers and send emails',
      icon: Mail,
      href: '/admin/newsletter',
      color: 'bg-cyan-500',
      requiredPermission: 'users:read'
    },
    {
      title: 'Invoice & document sender',
      description: 'Tax invoices, quotes, receipts — email/PDF to customers',
      icon: FileCheck,
      href: '/admin/documents',
      color: 'bg-teal-500',
      requiredPermission: 'users:read'
    },
    {
      title: 'Invoice preview',
      description: 'Build and preview tax invoices before sending',
      icon: FileText,
      href: '/admin/invoices/preview',
      color: 'bg-orange-500',
      requiredPermission: 'invoices:read'
    },
    {
      title: 'Community Board',
      description: 'Manage community posts and discussions',
      icon: MessageCircle,
      href: '/admin/community',
      color: 'bg-cyan-500',
      requiredPermission: 'community:read'
    },
    {
      title: t('admin.settings.title'),
      description: t('admin.settings.subtitle'),
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-gray-500',
      requiredPermission: 'system:admin' // Only super admin or admin with system:admin permission
    },
    {
      title: 'Selpic A',
      description: 'Selpic A: AI Tax & Bookkeeping Analyzer',
      icon: Calculator,
      href: accountingBaseUrl,
      color: 'bg-amber-500',
      requiredPermission: 'system:admin', // Super Admin 또는 회계 관리자만 접근
      isExternal: true // 외부 링크 표시
    }
  ].filter(action => {
    // Filter actions based on permissions
    if (!action.requiredPermission) return true
    // Selpic A: super / accounting / payroll / site-level system admin
    if (action.title === 'Selpic A') {
      return (
        isAccountingManager() ||
        hasPayrollAccessOnly() ||
        adminUser?.permissions.includes('system:admin')
      )
    }
    return hasPermission(action.requiredPermission)
  }), [adminUser, permissionUpdateKey, hasPermission, isAccountingManager, hasPayrollAccessOnly, t, salesUnreadCount, unreadCount])

  const recentActivities = [
    {
      action: t('admin.dashboard.activities.productAdded.action'),
      item: t('admin.dashboard.activities.productAdded.item'),
      time: t('admin.dashboard.activities.productAdded.time'),
      type: 'success'
    },
    {
      action: t('admin.dashboard.activities.contentEdited.action'),
      item: t('admin.dashboard.activities.contentEdited.item'),
      time: t('admin.dashboard.activities.contentEdited.time'),
      type: 'info'
    },
    {
      action: t('admin.dashboard.activities.imageUploaded.action'),
      item: t('admin.dashboard.activities.imageUploaded.item'),
      time: t('admin.dashboard.activities.imageUploaded.time'),
      type: 'success'
    },
    {
      action: t('admin.dashboard.activities.systemUpdated.action'),
      item: t('admin.dashboard.activities.systemUpdated.item'),
      time: t('admin.dashboard.activities.systemUpdated.time'),
      type: 'warning'
    }
  ]

  // 컴포넌트가 준비되지 않았을 때 로딩 표시
  if (!isComponentReady) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">관리자 대시보드 로딩 중...</p>
          </div>
        </div>
      </AdminRoute>
    )
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* 주문 알림 */}
        <AdminOrderNotification />
        
        {/* Sales Notifications */}
        {salesUnreadCount > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-3">
            {(notifications || []).filter(n => !n.isRead).slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className={`max-w-sm w-full bg-white rounded-lg shadow-lg border ${
                  notification.type === 'goal_achieved' 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-orange-300 bg-orange-50'
                } p-4 animate-in slide-in-from-right-2 duration-300`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      notification.type === 'goal_achieved' 
                        ? 'bg-green-100' 
                        : 'bg-orange-100'
                    }`}>
                      {notification.type === 'goal_achieved' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        notification.type === 'goal_achieved' 
                          ? 'text-green-900' 
                          : 'text-orange-900'
                      }`}>
                        {notification.title}
                      </p>
                      <button
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className={`mt-1 text-sm ${
                      notification.type === 'goal_achieved' 
                        ? 'text-green-700' 
                        : 'text-orange-700'
                    }`}>
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.timestamp).toLocaleString()}
                      </span>
                      <button
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        Mark as read
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {salesUnreadCount > 3 && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-center">
                <p className="text-sm text-gray-600">
                  {salesUnreadCount - 3} more notification{salesUnreadCount - 3 > 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        )}
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative z-30">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{t('admin.dashboard.title')}</h1>
              <p className="text-sm text-gray-500">{adminUser ? `${getGreeting()}, ${adminUser.username}!` : t('admin.dashboard.greeting.default')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('admin.common.logout')}</span>
              </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-green-600 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bank transfer orders need explicit visibility (status stays pending until admin marks paid) */}
          <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-700" aria-hidden />
                <h3 className="text-lg font-semibold text-gray-900">
                  Bank transfer — awaiting payment
                </h3>
                <span className="text-sm font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {pendingBankOrders.length}
                </span>
              </div>
              <Link
                href="/admin/orders"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                View all orders →
              </Link>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Bank transfer orders stay «pending» until you confirm payment. Open an order to mark it paid or send the receipt.
            </p>
            {pendingBankOrders.length === 0 ? (
              <p className="text-sm text-gray-500">
                No bank transfer orders awaiting payment.
              </p>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-600">
                      <th className="px-3 py-2 font-medium">ID</th>
                      <th className="px-3 py-2 font-medium">Customer</th>
                      <th className="px-3 py-2 font-medium">Total</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBankOrders.map((o) => (
                      <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                        <td className="px-3 py-2 font-mono text-xs">{o.id}</td>
                        <td className="px-3 py-2">{o.customer?.name || '—'}</td>
                        <td className="px-3 py-2">{formatCurrency(o.total || 0, currency)}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {new Date(o.createdAtIso).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 빠른 액션 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.dashboard.sections.quickActions')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  // Selpic A 카드 - 클릭 시 모달 표시
                  if (action.title === 'Selpic A') {
                    const isStaff = adminUser?.role === 'admin' && !adminUser?.permissions.includes('accounting:admin') && !adminUser?.permissions.includes('accounting:full')
                    
                    return (
                      <React.Fragment key={index}>
                        <div
                          onClick={() => setShowSELPICAModal(true)}
                          className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200 relative bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer"
                        >
                          {/* 카드 제목 및 설명 */}
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${action.color} relative`}>
                              <action.icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{action.title}</h4>
                              <p className="text-sm text-gray-500">{action.description}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Selpic A Access Modal */}
                        {showSELPICAModal && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-900">Selpic A Access</h3>
                                <button
                                  onClick={() => setShowSELPICAModal(false)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-6">
                                Please select your access method.
                              </p>
                              
                              <div className="space-y-3">
                                {/* Admin Access Button - hidden for staff */}
                                {!isStaff && (
                                  <button
                                    onClick={() => {
                                      const token = btoa(JSON.stringify({
                                        username: adminUser?.username,
                                        role: adminUser?.role, // Actual DB Role
                                        permissions: adminUser?.permissions,
                                        timestamp: Date.now(),
                                        accessType: 'admin'
                                      }))
                                      const url = `${accountingBaseUrl}?token=${token}`
                                      window.open(url, '_blank')
                                      setShowSELPICAModal(false)
                                    }}
                                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Calculator className="h-5 w-5" />
                                    Admin Access
                                  </button>
                                )}
                                
                                {/* Staff Access Button - 직원 로그인 페이지로 이동 */}
                                <button
                                  onClick={() => {
                                    // 직원 로그인 페이지로 이동 (SSO 토큰 없이)
                                    const url = `${accountingBaseUrl}/employee/login`
                                    window.open(url, '_blank')
                                    setShowSELPICAModal(false)
                                  }}
                                  className="w-full py-3 px-4 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Users className="h-5 w-5" />
                                  Staff Access
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  }
                  
                  // 일반 카드
                  return (
                    <a
                      key={index}
                      href={action.href}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200 relative"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${action.color} relative`}>
                          <action.icon className="h-5 w-5 text-white" />
                          {action.badge && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                              {action.badge}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{action.title}</h4>
                          <p className="text-sm text-gray-500">{action.description}</p>
                        </div>
                      </div>
                    </a>
                  )
                })}
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.dashboard.sections.recentActivities')}</h3>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-100' :
                    activity.type === 'warning' ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}>
                    <AlertCircle className={`h-4 w-4 ${
                      activity.type === 'success' ? 'text-green-600' :
                      activity.type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.item} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </AdminRoute>
  )
} 