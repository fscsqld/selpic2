'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useMessageStore, ContactMessage } from '@/lib/messageStore'
import { useTranslation } from '@/lib/useTranslation'
import { 
  emailService, 
  emailTemplates, 
  EmailTemplate, 
  EmailHistory 
} from '@/lib/emailService'
import {
  emailTrackingService,
  getStatusColor as getEmailDeliveryStatusColor,
  getStatusText as getEmailDeliveryStatusText
} from '@/lib/emailTrackingService'
import { 
  Mail, MailOpen, Search, Filter, Eye, Reply, Trash2, 
  Clock, User, Tag, AlertCircle, CheckCircle, MessageSquare,
  Calendar, Archive, Star, ArrowLeft, Send, Save, FileText,
  Layout, History, Loader2, Paperclip, File, Plus, X
} from 'lucide-react'
import Link from 'next/link'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'

import AdminRoute from '@/components/AdminRoute'

export default function AdminMessagesPage() {
  return (
    <AdminRoute requiredPermissions={['messages:read']}>
      <AdminMessagesPageContent />
    </AdminRoute>
  )
}

function AdminMessagesPageContent() {
  const { t } = useTranslation()
  const { orders, defaultPageSize } = useStore()
  const { users } = useUserAuth()
  const { 
    messages, 
    unreadCount, 
    markAsRead, 
    markAsReplied, 
    updateStatus, 
    updatePriority, 
    addAdminNote, 
    addEmailToHistory,
    getEmailHistory,
    deleteMessage,
    getMessagesByStatus,
    searchMessages 
  } = useMessageStore()

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContactMessage['status']>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ContactMessage['category']>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'status'>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const prevUnreadRef = useRef<number>(0)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [showEmailHistory, setShowEmailHistory] = useState(false)
  const [refreshTrackingData, setRefreshTrackingData] = useState(false)

  // 필터링된 메시지 목록
  const filteredMessages = useMemo(() => messages.filter(message => {
    const matchesSearch = searchQuery === '' || searchMessages(searchQuery).some(m => m.id === message.id)
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || message.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  }), [messages, searchQuery, statusFilter, categoryFilter, searchMessages])

  const sortedMessages = useMemo(() => {
    const priorityRank: Record<ContactMessage['priority'], number> = {
      urgent: 1,
      high: 2,
      medium: 3,
      low: 4
    }
    const statusRank: Record<ContactMessage['status'], number> = {
      new: 1,
      read: 2,
      replied: 3,
      closed: 4
    }

    const base = [...filteredMessages]
    switch (sortBy) {
      case 'oldest':
        base.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'priority':
        base.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
        break
      case 'status':
        base.sort((a, b) => statusRank[a.status] - statusRank[b.status])
        break
      case 'newest':
      default:
        base.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }
    return base
  }, [filteredMessages, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedMessages.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedMessages = sortedMessages.slice(startIndex, endIndex)

  const handleMessageClick = (message: ContactMessage) => {
    setSelectedMessage(message)
    if (message.status === 'new') {
      markAsRead(message.id)
    }
    setAdminNote(message.adminNotes || '')
  }

  const handleReply = async () => {
    if (!selectedMessage || (!replyText.trim() && !selectedTemplate)) {
      alert('Please enter a message or select a template')
      return
    }

    setIsSendingEmail(true)

    try {
      let emailResponse
      
      if (selectedTemplate) {
        // Send using template
        emailResponse = await emailService.sendTemplateResponse({
          customerEmail: selectedMessage.email,
          customerName: selectedMessage.name,
          templateId: selectedTemplate.id,
          variables: {
            originalSubject: selectedMessage.subject,
            submissionDate: new Date(selectedMessage.createdAt).toLocaleDateString()
          },
          adminName: 'SELPIC Support Team',
          messageId: selectedMessage.id
        })
      } else {
        // Send custom message
        emailResponse = await emailService.sendResponse({
          customerEmail: selectedMessage.email,
          customerName: selectedMessage.name,
          subject: emailSubject || `Re: ${selectedMessage.subject}`,
          message: replyText,
          originalSubject: selectedMessage.subject,
          submissionDate: new Date(selectedMessage.createdAt).toLocaleDateString(),
          adminName: 'SELPIC Support Team',
          messageId: selectedMessage.id
        })
      }

      if (emailResponse.success) {
        // Add to email history with tracking info
        const emailHistory: EmailHistory = {
          id: `email_${Date.now()}`,
          messageId: selectedMessage.id,
          customerEmail: selectedMessage.email,
          customerName: selectedMessage.name,
          subject: emailSubject || `Re: ${selectedMessage.subject}`,
          content: selectedTemplate ? selectedTemplate.content : replyText,
          sentAt: new Date(),
          sentBy: 'SELPIC Support Team',
          templateUsed: selectedTemplate?.name,
          attachments: attachedFiles.length > 0 ? attachedFiles.map(f => f.name).join(', ') : undefined,
          status: 'sent',
          emailId: emailResponse.emailId,
          trackingId: emailResponse.trackingId,
          deliveryStatus: 'sent',
          openCount: 0,
          clickCount: 0
        }

        addEmailToHistory(selectedMessage.id, emailHistory)
        markAsReplied(selectedMessage.id)
        
        setShowReplyModal(false)
        setReplyText('')
        setEmailSubject('')
        setSelectedTemplate(null)
        setShowTemplates(false)
        setAttachedFiles([])
        
        alert(`✅ Email sent successfully!${attachedFiles.length > 0 ? ` (${attachedFiles.length} file(s) attached)` : ''} Check Email History for tracking details.`)
      } else {
        alert(`❌ Failed to send email: ${emailResponse.message}\n\n💡 This is simulation mode. Please try again or check the email setup guide.`)
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setEmailSubject(template.subject)
    setReplyText(template.content)
    setShowTemplates(false)
  }

  const handleStartReply = () => {
    if (selectedMessage) {
      setEmailSubject(`Re: ${selectedMessage.subject}`)
      setReplyText('')
      setSelectedTemplate(null)
      setShowTemplates(false)
      setShowReplyModal(true)
    }
  }

  const handleSaveNote = () => {
    if (selectedMessage) {
      addAdminNote(selectedMessage.id, adminNote)
      alert('Admin note saved!')
    }
  }

  // Get updated tracking data for email
  const getUpdatedTrackingData = (email: EmailHistory) => {
    if (!email.emailId) return email

    const trackingData = emailTrackingService.getTracking(email.emailId)
    if (!trackingData) return email

    return {
      ...email,
      deliveryStatus: trackingData.status,
      openCount: trackingData.openCount,
      clickCount: trackingData.clickCount,
      lastOpenedAt: trackingData.lastOpenedAt
    }
  }

  // Refresh tracking data
  const handleRefreshTracking = () => {
    setRefreshTrackingData(!refreshTrackingData)
  }

  // 새 메시지 알림 (간단한 배너/console; 팝업 차단 회피)
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      console.log(`🔔 New messages: +${unreadCount - prevUnreadRef.current}`)
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount])

  const getStatusColor = (status: ContactMessage['status']) => {
    switch (status) {
      case 'new': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'read': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'replied': return 'text-green-600 bg-green-50 border-green-200'
      case 'closed': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityColor = (priority: ContactMessage['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryDisplayName = (category: ContactMessage['category']) => {
    switch (category) {
      case 'general': return t('admin.products.contactForm.categoryGeneral')
      case 'order': return t('admin.products.contactForm.categoryOrder')
      case 'technical': return t('admin.products.contactForm.categoryTechnical')
      case 'business': return t('admin.products.contactForm.categoryBusiness')
      case 'complaint': return t('admin.products.contactForm.categoryComplaint')
      default: return category
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title={unreadCount > 0 ? `Customer Messages (${unreadCount})` : "Customer Messages"}
        icon={<MessageSquare className="w-6 h-6" />}
        showBackButton={true}
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Message List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                <div className="text-sm text-gray-500">
                  {filteredMessages.length} total
                </div>
              </div>

                {/* Sort & Rows */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort</span>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value as typeof sortBy)
                        setCurrentPage(1)
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="priority">Priority</option>
                      <option value="status">Status</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rows</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(parseInt(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    >
                      {[10, 20, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
                
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="general">General</option>
                  <option value="order">Order</option>
                  <option value="technical">Technical</option>
                  <option value="business">Business</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>
            </div>

            {/* Message List */}
            <div className="max-h-96 overflow-y-auto">
              {paginatedMessages.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No messages found</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {paginatedMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => handleMessageClick(message)}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedMessage?.id === message.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50 border-transparent'
                      } ${message.status === 'new' ? 'bg-blue-25' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {message.status === 'new' ? (
                            <Mail className="w-4 h-4 text-blue-600" />
                          ) : (
                            <MailOpen className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="font-medium text-gray-900 text-sm">
                            {message.name}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(message.priority)}`}>
                          {message.priority}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-gray-800 mb-1 line-clamp-1">
                        {message.subject}
                      </p>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {message.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(message.status)}`}>
                          {message.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {sortedMessages.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  {sortedMessages.length} total · Page {currentPage}/{totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Message Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {selectedMessage.subject}
                      </h3>
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {selectedMessage.name}
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {selectedMessage.email}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </div>
                        {/* Customer / Order linking */}
                        {(() => {
                          const matchedUser = users.find(u => u.email?.toLowerCase() === selectedMessage.email.toLowerCase())
                          const matchedOrder = orders.find(o => o.customer.email?.toLowerCase() === selectedMessage.email.toLowerCase())
                          return (
                            <>
                              {matchedUser && (
                                <button
                                  onClick={() => window.open(`/admin/users?email=${encodeURIComponent(matchedUser.email)}`, '_blank')}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100"
                                >
                                  Go to Customer
                                </button>
                              )}
                              {matchedOrder && (
                                <button
                                  onClick={() => window.open(`/admin/orders/${matchedOrder.id}`, '_blank')}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                                >
                                  Order #{matchedOrder.id}
                                </button>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedMessage.status)}`}>
                        {selectedMessage.status}
                      </span>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(selectedMessage.priority)}`}>
                        {selectedMessage.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Category: {getCategoryDisplayName(selectedMessage.category)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 flex-wrap gap-2">
                    <button
                      onClick={handleStartReply}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </button>
                    
                    <button
                      onClick={() => setShowEmailHistory(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Email History ({getEmailHistory(selectedMessage.id).length})
                    </button>
                    
                    <select
                      value={selectedMessage.status}
                      onChange={(e) => updateStatus(selectedMessage.id, e.target.value as ContactMessage['status'])}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                      <option value="closed">Closed</option>
                    </select>
                    
                    <select
                      value={selectedMessage.priority}
                      onChange={(e) => updatePriority(selectedMessage.id, e.target.value as ContactMessage['priority'])}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="p-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Message:</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>

                  {/* Admin Notes */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Admin Notes:</h4>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Add internal notes about this message..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <button
                      onClick={handleSaveNote}
                      className="mt-2 inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Note
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Message</h3>
                <p className="text-gray-600">Choose a message from the list to view details and manage it.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reply to {selectedMessage?.name}
                </h3>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  Templates
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Template Selection */}
              {showTemplates && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Email Templates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {emailTemplates
                      .filter(template => template.category === selectedMessage?.category || template.category === 'general')
                      .map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`p-3 text-left border rounded-lg transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{template.subject}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Template Info */}
              {selectedTemplate && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-blue-900">Using Template: {selectedTemplate.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTemplate(null)
                        setEmailSubject(`Re: ${selectedMessage?.subject}`)
                        setReplyText('')
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Remove Template
                    </button>
                  </div>
                </div>
              )}

              {/* Email Subject */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject:
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject"
                />
              </div>

              {/* Email Content */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message:
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={selectedTemplate ? "Template content will be used" : "Type your reply here..."}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={!!selectedTemplate}
                />
                {selectedTemplate && (
                  <p className="text-sm text-gray-500 mt-1">
                    Template content will be automatically personalized with customer details.
                  </p>
                )}
              </div>

              {/* 파일 첨부 섹션 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments (Optional)
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    id="message-file-attachment"
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
                    htmlFor="message-file-attachment"
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

              {/* Preview */}
              {(replyText.trim() || selectedTemplate) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview:
                  </label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <div className="font-medium mb-2">To: {selectedMessage?.email}</div>
                    <div className="font-medium mb-2">Subject: {emailSubject}</div>
                    <div className="whitespace-pre-wrap text-gray-700">
                      {selectedTemplate 
                        ? selectedTemplate.content
                            .replace(/\{\{customerName\}\}/g, selectedMessage?.name || '')
                            .replace(/\{\{originalSubject\}\}/g, selectedMessage?.subject || '')
                            .replace(/\{\{submissionDate\}\}/g, new Date(selectedMessage?.createdAt || '').toLocaleDateString())
                        : replyText
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReplyModal(false)
                  setSelectedTemplate(null)
                  setShowTemplates(false)
                  setReplyText('')
                  setEmailSubject('')
                  setAttachedFiles([])
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isSendingEmail}
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={isSendingEmail || (!replyText.trim() && !selectedTemplate)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email History Modal */}
      {showEmailHistory && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Email History - {selectedMessage.name}
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRefreshTracking}
                    className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Loader2 className="w-4 h-4 mr-2" />
                    Refresh Tracking
                  </button>
                  <button
                    onClick={() => setShowEmailHistory(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {getEmailHistory(selectedMessage.id).length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No emails sent yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getEmailHistory(selectedMessage.id).map((email, index) => {
                    const updatedEmail = getUpdatedTrackingData(email)
                    return (
                      <div key={email.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              email.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {email.status}
                            </span>
                            {updatedEmail.deliveryStatus && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEmailDeliveryStatusColor(updatedEmail.deliveryStatus)}`}>
                                {getEmailDeliveryStatusText(updatedEmail.deliveryStatus)}
                              </span>
                            )}
                            {email.templateUsed && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Template: {email.templateUsed}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(email.sentAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Tracking Stats */}
                        {updatedEmail.emailId && (
                          <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              Opens: {updatedEmail.openCount || 0}
                            </div>
                            <div className="flex items-center">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Clicks: {updatedEmail.clickCount || 0}
                            </div>
                            {updatedEmail.lastOpenedAt && (
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                Last opened: {new Date(updatedEmail.lastOpenedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Subject: </span>
                        <span className="text-sm text-gray-900">{email.subject}</span>
                      </div>
                      
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Sent by: </span>
                        <span className="text-sm text-gray-900">{email.sentBy}</span>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {email.content}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
