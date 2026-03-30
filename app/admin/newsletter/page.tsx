'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Mail, 
  Search, 
  Trash2, 
  Send,
  Users,
  ArrowLeft,
  Calendar,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  History,
  Tag,
  Megaphone,
  Gift,
  FileText,
  Save,
  Edit,
  Plus,
  BookOpen,
  Paperclip,
  File,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useAdminAuth } from '@/lib/adminAuth'
import { useStore, NewsletterSubscriber, NewsletterCampaign, NewsletterTemplate } from '@/lib/store'
import AdminRoute from '@/components/AdminRoute'
import { useTranslation } from '@/lib/useTranslation'

export default function NewsletterManagementPage() {
  const router = useRouter()
  const { adminUser } = useAdminAuth()
  const { 
    newsletterSubscribers, 
    getActiveNewsletterSubscribers,
    deleteNewsletterSubscriber,
    unsubscribeFromNewsletter,
    sendNewsletterCampaign,
    getNewsletterCampaigns,
    deleteNewsletterCampaign,
    defaultPageSize,
    newsletterTemplates,
    saveNewsletterTemplate,
    updateNewsletterTemplate,
    deleteNewsletterTemplate,
    getNewsletterTemplate,
    getNewsletterTemplatesByType
  } = useStore()
  const { t } = useTranslation()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'subscribers' | 'history'>('subscribers')
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize) // 기본 페이지 크기
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    type: 'general' as 'promotion' | 'announcement' | 'event' | 'newsletter' | 'general'
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([])
  const [sendMode, setSendMode] = useState<'all' | 'selected'>('all')
  const [templateData, setTemplateData] = useState({
    name: '',
    subject: '',
    message: '',
    type: 'general' as 'promotion' | 'announcement' | 'event' | 'newsletter' | 'general'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const campaigns = getNewsletterCampaigns()

  // 활성 구독자 목록 (newsletterSubscribers 변경 시 자동 재계산)
  const activeSubscribers = useMemo(() => {
    return newsletterSubscribers.filter(sub => sub.isActive)
  }, [newsletterSubscribers])

  // 비활성 구독자 수 계산
  const inactiveSubscribersCount = useMemo(() => {
    return newsletterSubscribers.length - activeSubscribers.length
  }, [newsletterSubscribers.length, activeSubscribers.length])

  // 필터링된 구독자 목록
  const filteredSubscribers = useMemo(() => {
    return newsletterSubscribers
      .filter(sub => {
        const matchesSearch = sub.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesActive = showActiveOnly ? sub.isActive : true
        return matchesSearch && matchesActive
      })
      .sort((a, b) => {
        const dateA = new Date(a.subscribedAt).getTime()
        const dateB = new Date(b.subscribedAt).getTime()
        return sortDesc ? dateB - dateA : dateA - dateB
      })
  }, [newsletterSubscribers, searchTerm, showActiveOnly, sortDesc])

  // 페이지네이션 계산
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredSubscribers.length / pageSize) || 1)
  }, [filteredSubscribers.length, pageSize])

  const paginatedSubscribers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredSubscribers.slice(start, end)
  }, [filteredSubscribers, currentPage, pageSize])

  // 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, showActiveOnly, sortDesc, pageSize])

  useEffect(() => {
    // 현재 페이지가 범위를 벗어나면 조정
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  // 템플릿 선택 핸들러
  const handleSelectTemplate = (templateId: string) => {
    const template = getNewsletterTemplate(templateId)
    if (template) {
      setEmailData({
        subject: template.subject,
        message: template.message,
        type: template.type
      })
      setSelectedTemplateId(templateId)
      setMessage('Template loaded successfully!')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // 템플릿으로 저장 핸들러
  const handleSaveAsTemplate = () => {
    if (!emailData.subject || !emailData.message) {
      setMessage('Please fill in subject and message before saving as template.')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    setTemplateData({
      name: emailData.subject.substring(0, 50),
      subject: emailData.subject,
      message: emailData.message,
      type: emailData.type
    })
    setIsTemplateModalOpen(true)
  }

  // 템플릿 저장/수정 핸들러
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!templateData.name || !templateData.subject || !templateData.message) {
      setMessage('Please fill in all template fields.')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (selectedTemplateId && !getNewsletterTemplate(selectedTemplateId)?.isDefault) {
      // 기존 템플릿 수정
      updateNewsletterTemplate(selectedTemplateId, templateData)
      setMessage('Template updated successfully!')
    } else {
      // 새 템플릿 저장
      saveNewsletterTemplate(templateData)
      setMessage('Template saved successfully!')
    }
    
    setIsTemplateModalOpen(false)
    setTemplateData({ name: '', subject: '', message: '', type: 'general' })
    setSelectedTemplateId(null)
    setTimeout(() => setMessage(''), 3000)
  }

  // 템플릿 삭제 핸들러
  const handleDeleteTemplate = (templateId: string) => {
    const template = getNewsletterTemplate(templateId)
    if (template?.isDefault) {
      setMessage('Cannot delete default template.')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    if (confirm(`Are you sure you want to delete template "${template?.name}"?`)) {
      deleteNewsletterTemplate(templateId)
      setMessage('Template deleted successfully!')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // 구독자 선택 토글
  const toggleSubscriber = (subscriberId: string) => {
    setSelectedSubscribers(prev => 
      prev.includes(subscriberId) 
        ? prev.filter(id => id !== subscriberId)
        : [...prev, subscriberId]
    )
  }

  // 전체 선택/해제 (현재 페이지의 구독자만)
  const toggleSelectAllSubscribers = () => {
    const currentPageSubscriberIds = paginatedSubscribers.map(sub => sub.id)
    const allCurrentPageSelected = currentPageSubscriberIds.every(id => selectedSubscribers.includes(id))
    
    if (allCurrentPageSelected) {
      // 현재 페이지의 선택 해제
      setSelectedSubscribers(prev => prev.filter(id => !currentPageSubscriberIds.includes(id)))
    } else {
      // 현재 페이지의 모든 활성 구독자 선택
      const activeSubscriberIds = paginatedSubscribers
        .filter(sub => sub.isActive)
        .map(sub => sub.id)
      setSelectedSubscribers((prev) =>
        Array.from(new Set([...prev, ...activeSubscriberIds]))
      )
    }
  }

  // 이메일 발송 핸들러
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!emailData.subject || !emailData.message) {
      setMessage('Please fill in all fields.')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // 선택 발송 모드인데 선택된 구독자가 없으면 경고
    if (sendMode === 'selected' && selectedSubscribers.length === 0) {
      setMessage('Please select at least one subscriber to send to.')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // 발송 대상 구독자 결정
    const recipients = sendMode === 'all' 
      ? activeSubscribers 
      : activeSubscribers.filter(sub => selectedSubscribers.includes(sub.id))
    
    if (recipients.length === 0) {
      setMessage('No active subscribers selected.')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)
    try {
      const success = await sendNewsletterCampaign({
        subject: emailData.subject,
        message: emailData.message,
        type: emailData.type,
        sentBy: adminUser?.username || 'Admin',
        recipientCount: recipients.length,
        recipientIds: sendMode === 'selected' ? selectedSubscribers : undefined
      })
      
      if (success) {
        setMessage(`Newsletter sent successfully to ${recipients.length} subscriber(s)!${attachedFiles.length > 0 ? ` (${attachedFiles.length} file(s) attached)` : ''}`)
        setIsEmailModalOpen(false)
        setEmailData({ subject: '', message: '', type: 'general' })
        setSelectedTemplateId(null)
        setAttachedFiles([])
        setSelectedSubscribers([])
        setSendMode('all')
        setActiveTab('history') // 발송 후 이력 탭으로 이동
      } else {
        setMessage('Failed to send newsletter. Please try again.')
      }
      
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('Newsletter email error:', error)
      setMessage('Failed to send newsletter. Please try again.')
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 정보 유형 아이콘 및 색상
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'promotion':
        return { icon: Gift, color: 'bg-purple-100 text-purple-800', label: 'Promotion' }
      case 'announcement':
        return { icon: Megaphone, color: 'bg-blue-100 text-blue-800', label: 'Announcement' }
      case 'event':
        return { icon: Calendar, color: 'bg-green-100 text-green-800', label: 'Event' }
      case 'newsletter':
        return { icon: Mail, color: 'bg-indigo-100 text-indigo-800', label: 'Newsletter' }
      default:
        return { icon: FileText, color: 'bg-gray-100 text-gray-800', label: 'General' }
    }
  }

  // 구독자 삭제 핸들러
  const handleDeleteSubscriber = (id: string, email: string) => {
    if (confirm(`Are you sure you want to delete ${email} from the newsletter subscribers?`)) {
      deleteNewsletterSubscriber(id)
      setMessage('Subscriber deleted successfully.')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // 구독 취소 핸들러
  const handleUnsubscribe = (email: string) => {
    if (confirm(`Are you sure you want to unsubscribe ${email}?`)) {
      unsubscribeFromNewsletter(email)
      setMessage('Subscriber unsubscribed successfully.')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // CSV 내보내기
  const handleExportCSV = () => {
    const csv = [
      ['Email', 'Subscribed At', 'Status'].join(','),
      ...filteredSubscribers.map(sub => [
        sub.email,
        sub.subscribedAt,
        sub.isActive ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <AdminRoute requiredPermissions={['users:read']}>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title="Newsletter Management"
          icon={<Mail className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel="Dashboard"
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Subscribers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{newsletterSubscribers.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{activeSubscribers.length}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Subscribers</p>
                  <p className="text-3xl font-bold text-gray-400 mt-2">
                    {inactiveSubscribersCount}
                  </p>
                </div>
                <AlertCircle className="w-12 h-12 text-gray-400" />
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('subscribers')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'subscribers'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Subscribers ({newsletterSubscribers.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>Send History ({campaigns.length})</span>
                </button>
              </nav>
            </div>
          </div>

          {/* 액션 바 */}
          {activeTab === 'subscribers' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-4">
                {/* 검색 */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 필터 */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showActiveOnly}
                      onChange={(e) => setShowActiveOnly(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active only</span>
                  </label>
                  <button
                    onClick={() => setSortDesc(!sortDesc)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {sortDesc ? 'Newest first' : 'Oldest first'}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Send className="w-4 h-4" />
                  Send Newsletter
                </button>
              </div>
            </div>
          </div>
          )}

          {/* 발송 이력 액션 바 */}
          {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Newsletter Send History</h3>
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Send className="w-4 h-4" />
                Send New Newsletter
              </button>
            </div>
          </div>
          )}

          {/* 메시지 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('success') || message.includes('sent')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* 구독자 목록 */}
          {activeTab === 'subscribers' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={paginatedSubscribers.length > 0 && paginatedSubscribers.filter(sub => sub.isActive).every(sub => selectedSubscribers.includes(sub.id))}
                        onChange={toggleSelectAllSubscribers}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscribed At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No subscribers found.
                      </td>
                    </tr>
                  ) : (
                    paginatedSubscribers.map((subscriber) => (
                      <tr 
                        key={subscriber.id} 
                        className={`hover:bg-gray-50 ${selectedSubscribers.includes(subscriber.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSubscribers.includes(subscriber.id)}
                            onChange={() => toggleSubscriber(subscriber.id)}
                            disabled={!subscriber.isActive}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{subscriber.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(subscriber.subscribedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            subscriber.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subscriber.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {subscriber.isActive && (
                              <button
                                onClick={() => handleUnsubscribe(subscriber.email)}
                                className="text-orange-600 hover:text-orange-900"
                                title="Unsubscribe"
                              >
                                Unsubscribe
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSubscriber(subscriber.id, subscriber.email)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* 페이지네이션 - 항상 표시 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* 왼쪽: 정보 및 Rows per page */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-sm text-gray-700 font-medium">
                    {filteredSubscribers.length === 0 
                      ? 'No subscribers found'
                      : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(filteredSubscribers.length, currentPage * pageSize)} of ${filteredSubscribers.length}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                
                {/* 오른쪽: 페이지 네비게이션 */}
                {totalPages > 1 ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                      title="First page"
                    >
                      <ChevronsLeft size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} className="text-gray-600" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors bg-white ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                      title="Next page"
                    >
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                      title="Last page"
                    >
                      <ChevronsRight size={16} className="text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Page 1 of 1
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* 발송 이력 목록 */}
          {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No newsletter campaigns sent yet.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => {
                      const typeInfo = getTypeInfo(campaign.type)
                      const TypeIcon = typeInfo.icon
                      return (
                        <tr key={campaign.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${typeInfo.color}`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{campaign.subject}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">{campaign.message.substring(0, 60)}...</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="w-4 h-4 mr-2" />
                              {new Date(campaign.sentAt).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">by {campaign.sentBy}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{campaign.recipientCount}</div>
                            {campaign.successCount !== undefined && campaign.failedCount !== undefined && (
                              <div className="text-xs text-gray-500">
                                {campaign.successCount} success, {campaign.failedCount} failed
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              campaign.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : campaign.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this campaign record?')) {
                                  deleteNewsletterCampaign(campaign.id)
                                  setMessage('Campaign record deleted successfully.')
                                  setTimeout(() => setMessage(''), 3000)
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>

        {/* 이메일 발송 모달 */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Send Newsletter</h3>
                  <button
                    onClick={() => {
                      setIsEmailModalOpen(false)
                      setSendMode('all')
                      setSelectedSubscribers([])
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {sendMode === 'all' 
                    ? `Send to all ${activeSubscribers.length} active subscribers`
                    : selectedSubscribers.length > 0
                    ? `Send to ${selectedSubscribers.length} selected subscriber(s)`
                    : 'Select subscribers from the list to send newsletter'}
                </p>
              </div>

              <form onSubmit={handleSendEmail} className="p-6">
                {/* 발송 모드 선택 */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Send Mode
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sendMode"
                        value="all"
                        checked={sendMode === 'all'}
                        onChange={(e) => {
                          setSendMode('all')
                          setSelectedSubscribers([])
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Send to All Active Subscribers ({activeSubscribers.length})
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sendMode"
                        value="selected"
                        checked={sendMode === 'selected'}
                        onChange={(e) => setSendMode('selected')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Send to Selected Subscribers ({selectedSubscribers.length} selected)
                      </span>
                    </label>
                  </div>
                  {sendMode === 'selected' && selectedSubscribers.length === 0 && (
                    <p className="text-xs text-orange-600 mt-2">
                      Please select subscribers from the list below before sending.
                    </p>
                  )}
                </div>

                {/* 템플릿 선택 섹션 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Templates
                    </label>
                    <button
                      type="button"
                      onClick={handleSaveAsTemplate}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Save as Template
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {newsletterTemplates
                      .filter(t => t.type === emailData.type || emailData.type === 'general')
                      .slice(0, 6)
                      .map((template) => {
                        const typeInfo = getTypeInfo(template.type)
                        const TypeIcon = typeInfo.icon
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleSelectTemplate(template.id)}
                            className={`p-2 text-left rounded border transition-all ${
                              selectedTemplateId === template.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <TypeIcon className="w-3 h-3 text-gray-500" />
                              <span className="text-xs font-medium text-gray-700 truncate">
                                {template.name}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {template.subject.substring(0, 20)}...
                            </div>
                          </button>
                        )
                      })}
                  </div>
                  {newsletterTemplates.filter(t => t.type === emailData.type || emailData.type === 'general').length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No templates available for this type.</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Information Type
                  </label>
                  <select
                    value={emailData.type}
                    onChange={(e) => {
                      setEmailData({ ...emailData, type: e.target.value as any })
                      setSelectedTemplateId(null)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="promotion">Promotion</option>
                    <option value="announcement">Announcement</option>
                    <option value="event">Event</option>
                    <option value="newsletter">Newsletter</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Newsletter subject"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Newsletter content..."
                    required
                  />
                </div>

                {/* 파일 첨부 섹션 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="file-attachment"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const newFiles = Array.from(e.target.files)
                          setAttachedFiles(prev => [...prev, ...newFiles])
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-attachment"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Files
                    </label>
                    
                    {attachedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-red-600 hover:text-red-800 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmailModalOpen(false)
                      setSelectedTemplateId(null)
                      setAttachedFiles([])
                      setSendMode('all')
                      setSelectedSubscribers([])
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Newsletter
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 템플릿 저장 모달 */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Save Template</h3>
                  <button
                    onClick={() => {
                      setIsTemplateModalOpen(false)
                      setTemplateData({ name: '', subject: '', message: '', type: 'general' })
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveTemplate} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateData.name}
                    onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter template name"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Information Type
                  </label>
                  <select
                    value={templateData.type}
                    onChange={(e) => setTemplateData({ ...templateData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="promotion">Promotion</option>
                    <option value="announcement">Announcement</option>
                    <option value="event">Event</option>
                    <option value="newsletter">Newsletter</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={templateData.subject}
                    onChange={(e) => setTemplateData({ ...templateData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={templateData.message}
                    onChange={(e) => setTemplateData({ ...templateData, message: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTemplateModalOpen(false)
                      setTemplateData({ name: '', subject: '', message: '', type: 'general' })
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}

