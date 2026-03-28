'use client'

import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useStore } from '@/lib/store'
import { useState, useMemo } from 'react'
import { ArrowLeft, DollarSign, TrendingUp, BarChart3, Calendar, ArrowRight, Download, FileText, Package, Tag, Award, FileDown, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function SalesOverviewPage() {
  return (
    <AdminRoute requiredPermissions={['analytics:read']}>
      <SalesOverviewPageContent />
    </AdminRoute>
  )
}

function SalesOverviewPageContent() {
  const { orders, products, language } = useStore()
  const router = useRouter()
  const [isKo] = useState(language === 'ko')
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')

  const T = isKo
    ? {
        title: '매출 현황',
        subtitle: '주문 데이터를 기반으로 한 매출 분석',
        back: '뒤로가기',
        totalRevenue: '총 매출',
        totalOrders: '총 주문 수',
        averageOrderValue: '평균 주문 금액',
        daily: '일간',
        weekly: '주간',
        monthly: '월간',
        yearly: '연간',
        revenue: '매출',
        orders: '주문 수',
        dateRange: '날짜 범위',
        noData: '데이터가 없습니다',
        exportData: '데이터 내보내기',
        realTimeStats: '실시간 통계',
        today: '오늘',
        yesterday: '어제',
        thisWeek: '이번 주',
        lastWeek: '지난 주',
        thisMonth: '이번 달',
        lastMonth: '지난 달',
        thisYear: '올해',
        lastYear: '작년',
        growth: '증가',
        decline: '감소',
        revenueChart: '매출 추이',
        productAnalysis: '제품별 분석',
        categoryAnalysis: '카테고리별 분석',
        vipAnalysis: 'VIP 등급별 분석',
        generateReport: '리포트 생성',
        exportPDF: 'PDF 내보내기',
        exportExcel: 'Excel 내보내기',
        reportTitle: '매출 리포트',
        selectPeriod: '기간 선택',
        custom: '커스텀',
        from: '시작일',
        to: '종료일',
        product: '제품',
        category: '카테고리',
        sales: '매출',
        quantity: '판매량',
        avgPrice: '평균 가격',
        vipGrade: 'VIP 등급',
        customers: '고객 수',
        orders: '주문 수',
        close: '닫기'
      }
    : {
        title: 'Sales Overview',
        subtitle: 'Sales analysis based on order data',
        back: 'Dashboard',
        totalRevenue: 'Total Revenue',
        totalOrders: 'Total Orders',
        averageOrderValue: 'Average Order Value',
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        yearly: 'Yearly',
        revenue: 'Revenue',
        orders: 'Orders',
        dateRange: 'Date Range',
        noData: 'No data available',
        exportData: 'Export Data',
        realTimeStats: 'Real-time Statistics',
        today: 'Today',
        yesterday: 'Yesterday',
        thisWeek: 'This Week',
        lastWeek: 'Last Week',
        thisMonth: 'This Month',
        lastMonth: 'Last Month',
        thisYear: 'This Year',
        lastYear: 'Last Year',
        growth: 'Growth',
        decline: 'Decline',
        revenueChart: 'Revenue Trend',
        productAnalysis: 'Product Analysis',
        categoryAnalysis: 'Category Analysis',
        vipAnalysis: 'VIP Grade Analysis',
        generateReport: 'Generate Report',
        exportPDF: 'Export PDF',
        exportExcel: 'Export Excel',
        reportTitle: 'Sales Report',
        selectPeriod: 'Select Period',
        custom: 'Custom',
        from: 'From',
        to: 'To',
        product: 'Product',
        category: 'Category',
        sales: 'Sales',
        quantity: 'Quantity',
        avgPrice: 'Average Price',
        vipGrade: 'VIP Grade',
        customers: 'Customers',
        orders: 'Orders',
        close: 'Close'
      }

  // Helper function to filter orders by date range
  const getOrdersInRange = (startDate: Date, endDate: Date) => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAtIso)
      return orderDate >= startDate && orderDate <= endDate && order.status !== 'cancelled'
    })
  }

  // Real-time Statistics with comparison
  const realTimeStats = useMemo(() => {
    const now = new Date()
    
    // Today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const todayOrders = getOrdersInRange(today, tomorrow)
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    // Yesterday
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayOrders = getOrdersInRange(yesterday, today)
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    // This Week
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
    const thisWeekOrders = getOrdersInRange(weekStart, weekEnd)
    const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    // Last Week
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekEnd = new Date(weekStart.getTime() - 24 * 60 * 60 * 1000)
    const lastWeekOrders = getOrdersInRange(lastWeekStart, lastWeekEnd)
    const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    // This Month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const thisMonthOrders = getOrdersInRange(monthStart, monthEnd)
    const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    // Last Month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const lastMonthOrders = getOrdersInRange(lastMonthStart, lastMonthEnd)
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    // This Year
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31)
    const thisYearOrders = getOrdersInRange(yearStart, yearEnd)
    const thisYearRevenue = thisYearOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    // Last Year
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
    const lastYearOrders = getOrdersInRange(lastYearStart, lastYearEnd)
    const lastYearRevenue = lastYearOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }
    
    return {
      today: {
        revenue: todayRevenue,
        orders: todayOrders.length,
        avgOrderValue: todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0,
        growth: calculateGrowth(todayRevenue, yesterdayRevenue)
      },
      thisWeek: {
        revenue: thisWeekRevenue,
        orders: thisWeekOrders.length,
        avgOrderValue: thisWeekOrders.length > 0 ? thisWeekRevenue / thisWeekOrders.length : 0,
        growth: calculateGrowth(thisWeekRevenue, lastWeekRevenue)
      },
      thisMonth: {
        revenue: thisMonthRevenue,
        orders: thisMonthOrders.length,
        avgOrderValue: thisMonthOrders.length > 0 ? thisMonthRevenue / thisMonthOrders.length : 0,
        growth: calculateGrowth(thisMonthRevenue, lastMonthRevenue)
      },
      thisYear: {
        revenue: thisYearRevenue,
        orders: thisYearOrders.length,
        avgOrderValue: thisYearOrders.length > 0 ? thisYearRevenue / thisYearOrders.length : 0,
        growth: calculateGrowth(thisYearRevenue, lastYearRevenue)
      }
    }
  }, [orders])

  // Period-based revenue chart data
  const chartData = useMemo(() => {
    const data: Array<{ period: string; revenue: number; orders: number }> = []
    
    if (selectedPeriod === 'daily') {
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
        const periodOrders = getOrdersInRange(date, nextDate)
        const revenue = periodOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        data.push({
          period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue,
          orders: periodOrders.length
        })
      }
    } else if (selectedPeriod === 'weekly') {
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + i * 7))
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
        const periodOrders = getOrdersInRange(weekStart, weekEnd)
        const revenue = periodOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        data.push({
          period: `Week ${i + 1}`,
          revenue,
          orders: periodOrders.length
        })
      }
    } else if (selectedPeriod === 'monthly') {
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const periodOrders = getOrdersInRange(monthStart, monthEnd)
        const revenue = periodOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        data.push({
          period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue,
          orders: periodOrders.length
        })
      }
    } else if (selectedPeriod === 'yearly') {
      const now = new Date()
      for (let i = 4; i >= 0; i--) {
        const yearStart = new Date(now.getFullYear() - i, 0, 1)
        const yearEnd = new Date(now.getFullYear() - i, 11, 31)
        const periodOrders = getOrdersInRange(yearStart, yearEnd)
        const revenue = periodOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        data.push({
          period: (now.getFullYear() - i).toString(),
          revenue,
          orders: periodOrders.length
        })
      }
    }
    
    return data
  }, [orders, selectedPeriod])

  // Product Analysis
  const productAnalysis = useMemo(() => {
    const productMap = new Map<string, { name: string; revenue: number; quantity: number; orders: number }>()
    
    orders.filter(o => o.status !== 'cancelled').forEach(order => {
      order.items.forEach(item => {
        const existing = productMap.get(item.productId) || {
          name: item.name,
          revenue: 0,
          quantity: 0,
          orders: 0
        }
        existing.revenue += item.price * item.quantity
        existing.quantity += item.quantity
        existing.orders += 1
        productMap.set(item.productId, existing)
      })
    })
    
    return Array.from(productMap.values())
      .map(p => ({
        ...p,
        avgPrice: p.quantity > 0 ? p.revenue / p.quantity : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [orders])

  // Category Analysis
  const categoryAnalysis = useMemo(() => {
    const categoryMap = new Map<string, { revenue: number; quantity: number; orders: number }>()
    
    orders.filter(o => o.status !== 'cancelled').forEach(order => {
      order.items.forEach(item => {
        const category = item.category || 'Other'
        const existing = categoryMap.get(category) || {
          revenue: 0,
          quantity: 0,
          orders: 0
        }
        existing.revenue += item.price * item.quantity
        existing.quantity += item.quantity
        existing.orders += 1
        categoryMap.set(category, existing)
      })
    })
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        ...data,
        avgPrice: data.quantity > 0 ? data.revenue / data.quantity : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [orders])

  // VIP Grade Analysis
  const vipAnalysis = useMemo(() => {
    const vipMap = new Map<number | string, { grade: string; revenue: number; orders: number; customers: Set<string> }>()
    
    orders.filter(o => o.status !== 'cancelled').forEach(order => {
      const grade = order.vipGradeCode !== undefined ? order.vipGradeCode : 'None'
      const gradeName = order.vipGradeName || `Grade ${grade}`
      const existing = vipMap.get(grade) || {
        grade: gradeName,
        revenue: 0,
        orders: 0,
        customers: new Set<string>()
      }
      existing.revenue += order.total || 0
      existing.orders += 1
      existing.customers.add(order.customer.email)
      vipMap.set(grade, existing)
    })
    
    return Array.from(vipMap.values())
      .map(v => ({
        ...v,
        customers: v.customers.size,
        avgOrderValue: v.orders > 0 ? v.revenue / v.orders : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [orders])

  const handleExportPDF = () => {
    // Simple PDF export using window.print() or generate HTML report
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const reportContent = generateReportContent()
      printWindow.document.write(`
        <html>
          <head>
            <title>${T.reportTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            ${reportContent}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const handleExportExcel = () => {
    const data: any[] = []
    
    // Real-time stats
    data.push(['Real-time Statistics'])
    data.push([T.today, `$${realTimeStats.today.revenue.toFixed(2)}`, realTimeStats.today.orders])
    data.push([T.thisWeek, `$${realTimeStats.thisWeek.revenue.toFixed(2)}`, realTimeStats.thisWeek.orders])
    data.push([T.thisMonth, `$${realTimeStats.thisMonth.revenue.toFixed(2)}`, realTimeStats.thisMonth.orders])
    data.push([T.thisYear, `$${realTimeStats.thisYear.revenue.toFixed(2)}`, realTimeStats.thisYear.orders])
    data.push([])
    
    // Product Analysis
    data.push([T.productAnalysis])
    data.push([T.product, T.sales, T.quantity, T.avgPrice])
    productAnalysis.forEach(p => {
      data.push([p.name, `$${p.revenue.toFixed(2)}`, p.quantity, `$${p.avgPrice.toFixed(2)}`])
    })
    data.push([])
    
    // Category Analysis
    data.push([T.categoryAnalysis])
    data.push([T.category, T.sales, T.quantity, T.orders])
    categoryAnalysis.forEach(c => {
      data.push([c.category, `$${c.revenue.toFixed(2)}`, c.quantity, c.orders])
    })
    data.push([])
    
    // VIP Analysis
    data.push([T.vipAnalysis])
    data.push([T.vipGrade, T.sales, T.orders, T.customers])
    vipAnalysis.forEach(v => {
      data.push([v.grade, `$${v.revenue.toFixed(2)}`, v.orders, v.customers])
    })
    
    const csv = data.map(row => row.map(field => `"${String(field)}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales_report_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateReportContent = () => {
    return `
      <h1>${T.reportTitle}</h1>
      <h2>${T.realTimeStats}</h2>
      <table>
        <tr><th>Period</th><th>Revenue</th><th>Orders</th><th>Growth</th></tr>
        <tr><td>${T.today}</td><td>$${realTimeStats.today.revenue.toFixed(2)}</td><td>${realTimeStats.today.orders}</td><td>${realTimeStats.today.growth.toFixed(1)}%</td></tr>
        <tr><td>${T.thisWeek}</td><td>$${realTimeStats.thisWeek.revenue.toFixed(2)}</td><td>${realTimeStats.thisWeek.orders}</td><td>${realTimeStats.thisWeek.growth.toFixed(1)}%</td></tr>
        <tr><td>${T.thisMonth}</td><td>$${realTimeStats.thisMonth.revenue.toFixed(2)}</td><td>${realTimeStats.thisMonth.orders}</td><td>${realTimeStats.thisMonth.growth.toFixed(1)}%</td></tr>
        <tr><td>${T.thisYear}</td><td>$${realTimeStats.thisYear.revenue.toFixed(2)}</td><td>${realTimeStats.thisYear.orders}</td><td>${realTimeStats.thisYear.growth.toFixed(1)}%</td></tr>
      </table>
      <h2>${T.productAnalysis}</h2>
      <table>
        <tr><th>${T.product}</th><th>${T.sales}</th><th>${T.quantity}</th><th>${T.avgPrice}</th></tr>
        ${productAnalysis.map(p => `<tr><td>${p.name}</td><td>$${p.revenue.toFixed(2)}</td><td>${p.quantity}</td><td>$${p.avgPrice.toFixed(2)}</td></tr>`).join('')}
      </table>
      <h2>${T.categoryAnalysis}</h2>
      <table>
        <tr><th>${T.category}</th><th>${T.sales}</th><th>${T.quantity}</th><th>${T.orders}</th></tr>
        ${categoryAnalysis.map(c => `<tr><td>${c.category}</td><td>$${c.revenue.toFixed(2)}</td><td>${c.quantity}</td><td>${c.orders}</td></tr>`).join('')}
      </table>
      <h2>${T.vipAnalysis}</h2>
      <table>
        <tr><th>${T.vipGrade}</th><th>${T.sales}</th><th>${T.orders}</th><th>${T.customers}</th></tr>
        ${vipAnalysis.map(v => `<tr><td>${v.grade}</td><td>$${v.revenue.toFixed(2)}</td><td>${v.orders}</td><td>${v.customers}</td></tr>`).join('')}
      </table>
    `
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title={T.title}
          icon={<DollarSign className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel={T.back}
          showHomepageLink={false}
          showLanguageSelector={false}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Real-time Statistics Dashboard */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  {T.realTimeStats}
                </h2>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <FileText size={16} />
                  {T.generateReport}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Today */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-red-700 font-medium mb-2">{T.today}</div>
                  <div className="text-2xl font-bold text-red-900">${realTimeStats.today.revenue.toFixed(2)}</div>
                  <div className="text-sm text-red-600 mt-1">{realTimeStats.today.orders} {T.orders}</div>
                  <div className={`text-xs mt-2 ${realTimeStats.today.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {realTimeStats.today.growth >= 0 ? '↑' : '↓'} {Math.abs(realTimeStats.today.growth).toFixed(1)}% vs {T.yesterday}
                  </div>
                </div>
                
                {/* This Week */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-700 font-medium mb-2">{T.thisWeek}</div>
                  <div className="text-2xl font-bold text-blue-900">${realTimeStats.thisWeek.revenue.toFixed(2)}</div>
                  <div className="text-sm text-blue-600 mt-1">{realTimeStats.thisWeek.orders} {T.orders}</div>
                  <div className={`text-xs mt-2 ${realTimeStats.thisWeek.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {realTimeStats.thisWeek.growth >= 0 ? '↑' : '↓'} {Math.abs(realTimeStats.thisWeek.growth).toFixed(1)}% vs {T.lastWeek}
                  </div>
                </div>
                
                {/* This Month */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-green-700 font-medium mb-2">{T.thisMonth}</div>
                  <div className="text-2xl font-bold text-green-900">${realTimeStats.thisMonth.revenue.toFixed(2)}</div>
                  <div className="text-sm text-green-600 mt-1">{realTimeStats.thisMonth.orders} {T.orders}</div>
                  <div className={`text-xs mt-2 ${realTimeStats.thisMonth.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {realTimeStats.thisMonth.growth >= 0 ? '↑' : '↓'} {Math.abs(realTimeStats.thisMonth.growth).toFixed(1)}% vs {T.lastMonth}
                  </div>
                </div>
                
                {/* This Year */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-purple-700 font-medium mb-2">{T.thisYear}</div>
                  <div className="text-2xl font-bold text-purple-900">${realTimeStats.thisYear.revenue.toFixed(2)}</div>
                  <div className="text-sm text-purple-600 mt-1">{realTimeStats.thisYear.orders} {T.orders}</div>
                  <div className={`text-xs mt-2 ${realTimeStats.thisYear.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {realTimeStats.thisYear.growth >= 0 ? '↑' : '↓'} {Math.abs(realTimeStats.thisYear.growth).toFixed(1)}% vs {T.lastYear}
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  {T.revenueChart}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPeriod('daily')}
                    className={`px-3 py-1 rounded ${selectedPeriod === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {T.daily}
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('weekly')}
                    className={`px-3 py-1 rounded ${selectedPeriod === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {T.weekly}
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('monthly')}
                    className={`px-3 py-1 rounded ${selectedPeriod === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {T.monthly}
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('yearly')}
                    className={`px-3 py-1 rounded ${selectedPeriod === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {T.yearly}
                  </button>
                </div>
              </div>
              
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name={T.revenue} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">{T.noData}</div>
              )}
            </div>

            {/* Product Analysis */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                {T.productAnalysis}
              </h3>
              {productAnalysis.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.product}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.sales}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.quantity}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.avgPrice}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productAnalysis.map((p, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">${p.revenue.toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{p.quantity}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">${p.avgPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">{T.noData}</div>
              )}
            </div>

            {/* Category Analysis */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                {T.categoryAnalysis}
              </h3>
              {categoryAnalysis.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.category}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.sales}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.quantity}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categoryAnalysis.map((c, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.category}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">${c.revenue.toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{c.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryAnalysis.map(c => ({ name: c.category, value: c.revenue }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">{T.noData}</div>
              )}
            </div>

            {/* VIP Grade Analysis */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                {T.vipAnalysis}
              </h3>
              {vipAnalysis.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.vipGrade}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.sales}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.orders}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{T.customers}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vipAnalysis.map((v, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{v.grade}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">${v.revenue.toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{v.orders}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{v.customers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={vipAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#3b82f6" name={T.sales} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">{T.noData}</div>
              )}
            </div>
          </div>
        </div>

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{T.generateReport}</h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{T.selectPeriod}</label>
                  <select
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="daily">{T.daily}</option>
                    <option value="weekly">{T.weekly}</option>
                    <option value="monthly">{T.monthly}</option>
                    <option value="yearly">{T.yearly}</option>
                    <option value="custom">{T.custom}</option>
                  </select>
                </div>
                {reportPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{T.from}</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{T.to}</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleExportPDF}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <FileText size={16} />
                    {T.exportPDF}
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <FileDown size={16} />
                    {T.exportExcel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}
