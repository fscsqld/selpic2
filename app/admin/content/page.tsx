'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  RefreshCw,
  FileText,
  Image,
  Video,
  Link,
  Settings,
  Eye,
  EyeOff,
  Package,
  MapPin,
  Home,
  ShoppingBag,
  FileCheck,
  Clock,
  Star,
  Award,
  Grid3x3,
  List,
  X,
  CreditCard,
  Tag,
  CheckCircle,
  AlertCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useContentStore, ContentItem, partializedSiteConfigForPersist } from '@/lib/contentStore'
import { persistSiteConfigPayloadNow, persistSiteConfigStateNow } from '@/lib/siteConfigClient'
import { pickLogoImageItem } from '@/lib/pickLogoImageItem'
import { useStore, NewsletterSubscriber } from '@/lib/store'
import { useAdminAuth } from '@/lib/adminAuth'
import AdminRoute from '@/components/AdminRoute'
import QuickEditCard from './components/QuickEditCard'
import ContentModal from './components/ContentModal'
import MediaUpload from '@/components/MediaUpload'
import { HeaderLogoImage } from '@/components/Header'
import HeroSlideManager from './components/HeroSlideManager'
import CategoryHeroSlideManager from './components/CategoryHeroSlideManager'
import CategoryManager from './components/CategoryManager'
import SubcategoryManager from './components/SubcategoryManager'
import SidebarMenuManager from './components/SidebarMenuManager'
import BundleManager from './components/BundleManager'
import ShippingOptionsManager from './components/ShippingOptionsManager'
import PaymentOptionsManager from './components/PaymentOptionsManager'
import PromoCodeManager from './components/PromoCodeManager'
import VIPGradeConfigManager from './components/VIPGradeConfigManager'
import VIPGradeBenefitManager from './components/VIPGradeBenefitManager'

export default function ContentManagementPage() {
  const router = useRouter()
  const { adminUser } = useAdminAuth()
  const { 
    contentItems, 
    addContent, 
    updateContent, 
    deleteContent, 
    getActiveContentBySection,
    toggleContentActive,
    heroSlides,
    heroSliderSettings,
    heroSlideTemplates,
    addHeroSlide,
    updateHeroSlide,
    deleteHeroSlide,
    toggleHeroSlideActive,
    reorderHeroSlide,
    updateHeroSliderSettings,
    addHeroSlideTemplate,
    updateHeroSlideTemplate,
    deleteHeroSlideTemplate,
    getHeroSlideTemplate,
    getHeroSlideTemplatesByCategory,
    categoryHeroSlides,
    addCategoryHeroSlide,
    updateCategoryHeroSlide,
    deleteCategoryHeroSlide,
    toggleCategoryHeroSlideActive,
    reorderCategoryHeroSlide,
    categoryItems, 
    addCategoryItem, 
    updateCategoryItem, 
    deleteCategoryItem, 
    toggleCategoryItemActive, 
    reorderCategoryItem,
    subcategoryItems,
    addSubcategoryItem,
    updateSubcategoryItem,
    deleteSubcategoryItem,
    toggleSubcategoryItemActive,
    reorderSubcategoryItem,
    getActiveSubcategoryItems,
    sidebarMenuItems,
    addSidebarMenuItem,
    updateSidebarMenuItem,
    deleteSidebarMenuItem,
    reorderSidebarMenuItem,
    updateDefaultSidebarMenu
  } = useContentStore()

  const {
    newsletterSubscribers,
    subscribeToNewsletter,
    unsubscribeFromNewsletter,
    deleteNewsletterSubscriber,
    defaultPageSize
  } = useStore()

  // State management
  const [selectedSection, setSelectedSection] = useState('header')
  const [searchTerm, setSearchTerm] = useState('')
  const [sectionSearchTerm, setSectionSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'info', message: '', show: false })
  const [newsletterSearch, setNewsletterSearch] = useState('')
  const [newsletterShowActiveOnly, setNewsletterShowActiveOnly] = useState(true) // 기본값: 활성 구독자만 표시
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Newsletter Subscribers 페이지네이션 상태
  const [newsletterCurrentPage, setNewsletterCurrentPage] = useState(1)
  const [newsletterPageSize, setNewsletterPageSize] = useState(defaultPageSize)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['homepage', 'products', 'payment', 'management']))

  // Recent sections management (localStorage)
  const [recentSections, setRecentSections] = useState<string[]>([])
  // Backup / Restore status
  const [isBackupInProgress, setIsBackupInProgress] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  // Load recent sections from localStorage on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('content-management-recent-sections')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setRecentSections(parsed)
          }
        }
      } catch (error) {
        console.error('Error loading recent sections:', error)
      }
    }
  }, [])

  // Generic helper: export a localStorage key as JSON file
  const exportLocalStorageKey = (key: string, filenamePrefix: string, emptyMessage: string) => {
    if (typeof window === 'undefined') return
    try {
      setIsBackupInProgress(true)
      setImportStatus(null)
      const raw = localStorage.getItem(key)
      if (!raw) {
        showNotificationToast('info', emptyMessage)
        setIsBackupInProgress(false)
        return
      }
      const blob = new Blob([raw], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      a.href = url
      a.download = `${filenamePrefix}-${timestamp}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showNotificationToast('success', 'Backup downloaded successfully.')
    } catch (error) {
      console.error('Error exporting backup:', error)
      showNotificationToast('error', 'Failed to export backup. Please try again.')
    } finally {
      setIsBackupInProgress(false)
    }
  }

  // Export helpers for each store
  const handleExportContentStore = () => {
    exportLocalStorageKey(
      'content-store',
      'selpic-content-store-backup',
      'No content backup data (content-store) found in this browser.'
    )
  }

  const handleExportSelpicStore = () => {
    exportLocalStorageKey(
      'selpic-store',
      'selpic-store-backup',
      'No store data (selpic-store) found in this browser.'
    )
  }

  const handleExportMediaStore = () => {
    exportLocalStorageKey(
      'media-store',
      'selpic-media-store-backup',
      'No media metadata (media-store) found in this browser.'
    )
  }

  // Import content-store from a JSON backup file
  const handleImportContentStore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof window === 'undefined') return
    const file = event.target.files?.[0]
    // 파일 선택 초기화 (같은 파일 재선택 가능하도록)
    event.target.value = ''
    if (!file) return

    if (!confirm('Importing a backup will overwrite the current homepage and content settings stored in this browser. Continue?')) {
      return
    }

    try {
      setIsBackupInProgress(true)
      setImportStatus(null)
      const text = await file.text()
      // JSON 형식 유효성만 간단히 확인
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid backup file format.')
      }

      await persistSiteConfigPayloadNow(text)
      showNotificationToast('success', 'Content backup imported successfully. The page will reload to apply changes.')
      setImportStatus('success')
      // 다른 탭/컴포넌트에도 변경 사항 알림 (선택적)
      try {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'content-store',
            newValue: text
          })
        )
      } catch {
        // 일부 브라우저에서는 직접 StorageEvent 생성이 제한될 수 있으므로 무시
      }
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error) {
      console.error('Error importing content-store backup:', error)
      setImportStatus('error')
      showNotificationToast('error', 'Failed to import content backup. Please check the file and try again.')
    } finally {
      setIsBackupInProgress(false)
    }
  }

  // Import helpers for other stores (selpic-store, media-store)
  const handleImportSelpicStore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof window === 'undefined') return
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!confirm('Importing this backup will overwrite product/cart and related store data (selpic-store) in this browser. Continue?')) {
      return
    }

    try {
      setIsBackupInProgress(true)
      setImportStatus(null)
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid backup file format.')
      }
      localStorage.setItem('selpic-store', text)
      showNotificationToast('success', 'Store backup (selpic-store) imported. The page will reload to apply changes.')
      setImportStatus('success')
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error) {
      console.error('Error importing selpic-store backup:', error)
      setImportStatus('error')
      showNotificationToast('error', 'Failed to import selpic-store backup. Please check the file and try again.')
    } finally {
      setIsBackupInProgress(false)
    }
  }

  const handleImportMediaStore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof window === 'undefined') return
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!confirm('Importing this backup will overwrite media metadata (media-store) in this browser. IndexedDB files themselves are not included. Continue?')) {
      return
    }

    try {
      setIsBackupInProgress(true)
      setImportStatus(null)
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid backup file format.')
      }
      localStorage.setItem('media-store', text)
      showNotificationToast('success', 'Media metadata backup imported. The page will reload to apply changes.')
      setImportStatus('success')
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error) {
      console.error('Error importing media-store backup:', error)
      setImportStatus('error')
      showNotificationToast('error', 'Failed to import media-store backup. Please check the file and try again.')
    } finally {
      setIsBackupInProgress(false)
    }
  }

  // Add to recent sections when a section is selected
  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId)
    const updated = [sectionId, ...recentSections.filter(id => id !== sectionId)].slice(0, 5)
    setRecentSections(updated)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('content-management-recent-sections', JSON.stringify(updated))
      } catch (error) {
        console.error('Error saving recent sections:', error)
      }
    }
  }

  // Remove a section from recent sections
  const handleRemoveRecentSection = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent section selection when clicking delete
    const updated = recentSections.filter(id => id !== sectionId)
    setRecentSections(updated)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('content-management-recent-sections', JSON.stringify(updated))
        showNotificationToast('success', 'Section removed from recently used')
      } catch (error) {
        console.error('Error saving recent sections:', error)
        showNotificationToast('error', 'Failed to remove section')
      }
    }
  }

  // Clear all recent sections
  const handleClearAllRecentSections = () => {
    if (confirm('Are you sure you want to clear all recently used sections?')) {
      setRecentSections([])
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('content-management-recent-sections', JSON.stringify([]))
          showNotificationToast('success', 'All recently used sections cleared')
        } catch (error) {
          console.error('Error clearing recent sections:', error)
          showNotificationToast('error', 'Failed to clear sections')
        }
      }
    }
  }

  // Section list (grouped by category)
  const sectionCategories = [
    {
      id: 'homepage',
      name: 'Homepage',
      icon: Home,
      color: 'blue',
      sections: [
        { id: 'header', name: 'Header', icon: Settings, color: 'indigo', description: 'Navigation and logo settings', priority: 1 },
        { id: 'hero', name: 'Hero Slides', icon: Image, color: 'purple', description: 'Main banner slides and promotions', priority: 1 },
        { id: 'category-hero', name: 'Category Backgrounds', icon: Video, color: 'pink', description: 'Sliding backgrounds for category pages', priority: 2 },
        { id: 'subcategories', name: 'Subcategories', icon: Grid3x3, color: 'amber', description: 'Manage subcategory cards for category pages', priority: 2 },
        { id: 'hot-goods', name: 'Market S', icon: Settings, color: 'red', description: 'Hot goods section content', priority: 2 },
        { id: 'footer', name: 'Footer', icon: FileText, color: 'gray', description: 'Footer content and links', priority: 2 },
        { id: 'how-it-works', name: 'How It Works', icon: Settings, color: 'green', description: 'Process explanation section', priority: 3 }
      ]
    },
    {
      id: 'products',
      name: 'Event & Shipping',
      icon: ShoppingBag,
      color: 'emerald',
      sections: [
        { id: 'bundle', name: 'Event Bundle', icon: Package, color: 'emerald', description: 'Promotional bundle products', priority: 1 },
        { id: 'shipping-pickup', name: 'Shipping & Pickup', icon: MapPin, color: 'orange', description: 'Delivery options and pickup locations', priority: 1 }
      ]
    },
    {
      id: 'payment',
      name: 'Payment & Promotions',
      icon: CreditCard,
      color: 'violet',
      sections: [
        { id: 'payment-options', name: 'Payment Options', icon: CreditCard, color: 'blue', description: 'Manage payment methods and fees', priority: 1 },
        { id: 'promo-codes', name: 'Promo Codes', icon: Tag, color: 'violet', description: 'Manage promotional discount codes', priority: 2 },
        { id: 'vip-benefits', name: 'VIP Grade Management', icon: Star, color: 'purple', description: 'Manage VIP grade criteria (sales thresholds) and benefits (discounts, free shipping, events) in one place', priority: 3 }
      ]
    },
    {
      id: 'legal',
      name: 'Legal & Policies',
      icon: FileCheck,
      color: 'amber',
      sections: [
        { id: 'privacy', name: 'Privacy Policy', icon: FileText, color: 'blue', description: 'Privacy policy content', priority: 1 },
        { id: 'terms', name: 'Terms of Service', icon: FileText, color: 'green', description: 'Terms and conditions', priority: 1 },
        { id: 'refund', name: 'Refund Policy', icon: FileText, color: 'orange', description: 'Refund and return policy', priority: 1 }
      ]
    },
    {
      id: 'company',
      name: 'Company Information',
      icon: FileText,
      color: 'purple',
      sections: [
        { id: 'about', name: 'About Us', icon: FileText, color: 'emerald', description: 'Company information and mission', priority: 1 }
      ]
    },
    {
      id: 'management',
      name: 'Management',
      icon: Mail,
      color: 'teal',
      sections: [
        { id: 'newsletter', name: 'Newsletter Subscribers', icon: Mail, color: 'teal', description: 'Manage subscribers, deactivate/activate, and export CSV', priority: 1 }
      ]
    }
  ]

  // Flatten all sections
  const allSections = sectionCategories.flatMap(category => 
    category.sections.map(section => ({ ...section, categoryId: category.id, categoryName: category.name }))
  )

  // Filter sections by search term
  const filteredSectionCategories = sectionCategories.map(category => ({
    ...category,
    sections: category.sections.filter(section =>
      section.name.toLowerCase().includes(sectionSearchTerm.toLowerCase()) ||
      section.description?.toLowerCase().includes(sectionSearchTerm.toLowerCase())
    )
  })).filter(category => category.sections.length > 0)

  // Get recently used section information
  const recentSectionsData = recentSections
    .map(id => {
      const section = allSections.find(s => s.id === id)
      if (!section) {
        console.warn(`Section not found in allSections: ${id}. Available sections:`, allSections.map(s => s.id))
      }
      return section
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section))
    .slice(0, 5)

  // Filter content for currently selected section only (dedupe by id — persisted data can contain duplicates)
  const filteredContent = useMemo(() => {
    const filtered = contentItems
      .filter(item => item.section === selectedSection)
      .filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.order - b.order)

    const seen = new Set<string>()
    return filtered.filter((item) => {
      if (seen.has(item.id)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[admin/content] Skipping duplicate content id in list:', item.id, item.title)
        }
        return false
      }
      seen.add(item.id)
      return true
    })
  }, [contentItems, selectedSection, searchTerm])

  // Newsletter subscriber filters
  const filteredNewsletterSubscribers = useMemo(() => {
    return newsletterSubscribers
      .filter((sub: NewsletterSubscriber) => {
        const matchesSearch = sub.email.toLowerCase().includes(newsletterSearch.toLowerCase())
        const matchesActive = newsletterShowActiveOnly ? sub.isActive : true
        return matchesSearch && matchesActive
      })
      .sort((a: NewsletterSubscriber, b: NewsletterSubscriber) =>
        (b.subscribedAt || '').localeCompare(a.subscribedAt || '')
      )
  }, [newsletterSubscribers, newsletterSearch, newsletterShowActiveOnly])

  // Newsletter Subscribers 페이지네이션 계산
  const newsletterTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredNewsletterSubscribers.length / newsletterPageSize) || 1)
  }, [filteredNewsletterSubscribers.length, newsletterPageSize])

  const paginatedNewsletterSubscribers = useMemo(() => {
    const start = (newsletterCurrentPage - 1) * newsletterPageSize
    const end = start + newsletterPageSize
    return filteredNewsletterSubscribers.slice(start, end)
  }, [filteredNewsletterSubscribers, newsletterCurrentPage, newsletterPageSize])

  // Newsletter 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setNewsletterCurrentPage(1)
  }, [newsletterSearch, newsletterShowActiveOnly, newsletterPageSize])

  useEffect(() => {
    // 현재 페이지가 범위를 벗어나면 조정
    if (newsletterCurrentPage > newsletterTotalPages) {
      setNewsletterCurrentPage(newsletterTotalPages)
    }
  }, [newsletterCurrentPage, newsletterTotalPages])

  // Notification helper function
  const showNotificationToast = (type: 'success' | 'error' | 'info', message: string) => {
    if (typeof window === 'undefined') return // Server-side guard
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification({ type: 'info', message: '', show: false })
    }, 3000)
  }

  const syncSiteConfigNow = async (): Promise<boolean> => {
    try {
      const payload = partializedSiteConfigForPersist(useContentStore.getState())
      await persistSiteConfigStateNow(payload)
      return true
    } catch (e) {
      console.error('❌ [Content Management] immediate cloud sync failed:', e)
      return false
    }
  }

  // Quick edit save function
  const handleQuickEditSave = async (data: any) => {
    console.log('Quick edit save started:', data)
    
    // Find existing content by section and title
    const existingContent = contentItems.find(item => 
      item.section === data.section && item.title === data.title
    )

    console.log('Existing content found:', existingContent)

    if (existingContent) {
      // Update existing content
      const updatedContent = {
        ...existingContent,
        content: data.content,
        linkUrl: data.linkUrl,
        updatedAt: new Date()
      }
      console.log('Content to update:', updatedContent)
      
      try {
        // Update content in store (Zustand persist middleware will handle localStorage automatically)
        updateContent(existingContent.id, updatedContent)
        console.log('✅ Content updated in store:', {
          id: existingContent.id,
          title: data.title,
          content: data.content,
          section: data.section
        })
        
        const synced = await syncSiteConfigNow()
        showNotificationToast(
          synced ? 'success' : 'error',
          synced
            ? 'Changes saved and synced to cloud.'
            : 'Changes saved locally, but cloud sync failed. Check network/Supabase settings.'
        )
        
      } catch (error) {
        console.error('Content update failed:', error)
        showNotificationToast('error', 'An error occurred while saving content.')
      }
    } else {
      // Add new content
      const newContent = {
        id: `content-${Date.now()}`,
        type: data.type || 'text',
        section: data.section || selectedSection,
        title: data.title,
        content: data.content,
        linkUrl: data.linkUrl,
        order: contentItems.filter(item => item.section === (data.section || selectedSection)).length + 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      console.log('Adding new content:', newContent)
      
      try {
        addContent(newContent)
        const synced = await syncSiteConfigNow()
        showNotificationToast(
          synced ? 'success' : 'error',
          synced
            ? `New content added: ${data.title}`
            : `New content added locally but cloud sync failed: ${data.title}`
        )
      } catch (error) {
        console.error('Content addition failed:', error)
        showNotificationToast('error', 'An error occurred while adding content.')
      }
    }
  }

  // Content editing
  const handleEdit = (content: any) => {
    setEditingContent(content)
    setIsModalOpen(true)
  }

  // Content deletion
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this content?')) {
      deleteContent(id)
      showNotificationToast('success', 'Content has been deleted.')
    }
  }

  // Status toggle
  const handleToggleStatus = (id: string) => {
    toggleContentActive(id)
  }

  // Newsletter subscriber actions
  const handleNewsletterToggle = (email: string, isActive: boolean) => {
    if (isActive) {
      unsubscribeFromNewsletter(email)
      showNotificationToast('success', 'Subscriber deactivated.')
    } else {
      const success = subscribeToNewsletter(email)
      showNotificationToast(success ? 'success' : 'info', success ? 'Subscriber reactivated.' : 'Already subscribed.')
    }
  }

  const handleNewsletterDelete = (id: string) => {
    if (confirm('Delete this subscriber?')) {
      deleteNewsletterSubscriber(id)
      showNotificationToast('success', 'Subscriber deleted.')
    }
  }

  const handleNewsletterExport = () => {
    if (newsletterSubscribers.length === 0) {
      showNotificationToast('info', 'No subscribers to export.')
      return
    }
    const headers = ['id', 'email', 'isActive', 'subscribedAt', 'unsubscribedAt']
    const rows = newsletterSubscribers.map(sub => [
      sub.id,
      sub.email,
      sub.isActive ? 'active' : 'inactive',
      sub.subscribedAt || '',
      sub.unsubscribedAt || ''
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminRoute requiredPermissions={['content:read']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <AdminPageHeader
          title="Content Management"
          icon={<FileText className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel="Dashboard"
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Toast Notification */}
          {notification && notification.show && (
            <div className={`fixed top-4 right-4 z-[9999] p-4 rounded-lg shadow-lg max-w-sm ${
              notification.type === 'success' 
                ? 'bg-green-500 text-white' 
                : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}>
              <div className="flex items-center space-x-2">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : notification.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{notification.message || ''}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Content Management System</h2>
            <p className="text-gray-600">Systematically manage text, images, and videos for each section of the website.</p>
          </div>

          {/* Backup & Restore for local stores */}
          <div className="mb-6">
            <div className="bg-white rounded-lg border border-blue-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Local Backup &amp; Restore</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Download or restore JSON backups for local stores (content, products/cart, media metadata)
                    stored in this browser.
                  </p>
                  {importStatus === 'success' && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Backup imported. Reloading to apply changes...
                    </p>
                  )}
                  {importStatus === 'error' && (
                    <p className="text-xs text-red-600 mt-1">
                      Import failed. Please check the backup file format and try again.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* content-store */}
                <div className="flex flex-col gap-2 border border-slate-200 rounded-lg p-3">
                  <div className="font-semibold text-slate-800">Content (content-store)</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportContentStore}
                      disabled={isBackupInProgress}
                      className="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Download
                    </button>
                    <div className="relative">
                      <input
                        id="content-backup-file-input"
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={handleImportContentStore}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof document !== 'undefined') {
                            const input = document.getElementById('content-backup-file-input') as HTMLInputElement | null
                            input?.click()
                          }
                        }}
                        disabled={isBackupInProgress}
                        className="px-2 py-1.5 rounded-md border border-blue-500 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                </div>

                {/* selpic-store */}
                <div className="flex flex-col gap-2 border border-slate-200 rounded-lg p-3">
                  <div className="font-semibold text-slate-800">Store (selpic-store)</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportSelpicStore}
                      disabled={isBackupInProgress}
                      className="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Download
                    </button>
                    <div className="relative">
                      <input
                        id="selpic-backup-file-input"
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={handleImportSelpicStore}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof document !== 'undefined') {
                            const input = document.getElementById('selpic-backup-file-input') as HTMLInputElement | null
                            input?.click()
                          }
                        }}
                        disabled={isBackupInProgress}
                        className="px-2 py-1.5 rounded-md border border-blue-500 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                </div>

                {/* media-store */}
                <div className="flex flex-col gap-2 border border-slate-200 rounded-lg p-3">
                  <div className="font-semibold text-slate-800">Media Metadata (media-store)</div>
                  <p className="text-[10px] text-slate-500">
                    Note: This includes media metadata and links, not the actual image/video files stored in IndexedDB.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportMediaStore}
                      disabled={isBackupInProgress}
                      className="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Download
                    </button>
                    <div className="relative">
                      <input
                        id="media-backup-file-input"
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={handleImportMediaStore}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof document !== 'undefined') {
                            const input = document.getElementById('media-backup-file-input') as HTMLInputElement | null
                            input?.click()
                          }
                        }}
                        disabled={isBackupInProgress}
                        className="px-2 py-1.5 rounded-md border border-blue-500 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced section navigation */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            {/* Header: Search and view mode */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search sections..."
                    value={sectionSearchTerm}
                    onChange={(e) => setSectionSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {sectionSearchTerm && (
                    <button
                      onClick={() => setSectionSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title="Grid View"
                  >
                    <Grid3x3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title="List View"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Recently used sections */}
            {recentSectionsData.length > 0 && !sectionSearchTerm && (
              <div className="border-b border-gray-200 p-4 bg-blue-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Recently Used</h3>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                      {recentSectionsData.length}
                    </span>
                  </div>
                  <button
                    onClick={handleClearAllRecentSections}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                    title="Clear all recently used sections"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSectionsData.map((section) => {
                    if (!section) return null
                    const Icon = section.icon
                    const isActive = selectedSection === section.id
                    return (
                      <div
                        key={section.id}
                        className="relative group flex items-center"
                      >
                        <button
                          onClick={() => handleSectionSelect(section.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            isActive
                              ? `bg-${section.color}-600 text-white shadow-sm`
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{section.name}</span>
                        </button>
                        <button
                          onClick={(e) => handleRemoveRecentSection(section.id, e)}
                          className={`ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isActive
                              ? 'bg-red-500 text-white hover:bg-red-600 opacity-80 hover:opacity-100'
                              : 'bg-gray-300 text-gray-600 hover:bg-red-500 hover:text-white opacity-60 hover:opacity-100'
                          }`}
                          title="Remove from recently used"
                        >
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 카테고리별 섹션 그리드/리스트 */}
            <div className="p-4">
              {viewMode === 'grid' ? (
                <div className="space-y-6">
                  {filteredSectionCategories.map((category) => {
                    const CategoryIcon = category.icon
                    const isExpanded = expandedCategories.has(category.id)
                    return (
                      <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedCategories)
                            if (isExpanded) {
                              newExpanded.delete(category.id)
                            } else {
                              newExpanded.add(category.id)
                            }
                            setExpandedCategories(newExpanded)
                          }}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <CategoryIcon className={`w-5 h-5 text-${category.color}-600`} />
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                              {category.sections.length}
                            </span>
                          </div>
                          <span className="text-gray-400">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {category.sections
                              .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                              .map((section) => {
                                const Icon = section.icon
                                const isActive = selectedSection === section.id
                                return (
                                  <button
                                    key={section.id}
                                    onClick={() => handleSectionSelect(section.id)}
                                    className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                                      isActive
                                        ? `border-${section.color}-500 bg-${section.color}-50`
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`p-2 rounded-lg bg-${section.color}-100`}>
                                        <Icon className={`w-5 h-5 text-${section.color}-600`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className={`font-semibold text-sm mb-1 ${
                                          isActive ? `text-${section.color}-900` : 'text-gray-900'
                                        }`}>
                                          {section.name}
                                        </h4>
                                        {section.description && (
                                          <p className="text-xs text-gray-500 line-clamp-2">
                                            {section.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                )
                              })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSectionCategories.map((category) => {
                    const CategoryIcon = category.icon
                    return (
                      <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 flex items-center gap-3">
                          <CategoryIcon className={`w-5 h-5 text-${category.color}-600`} />
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                            {category.sections.length}
                          </span>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {category.sections
                            .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                            .map((section) => {
                              const Icon = section.icon
                              const isActive = selectedSection === section.id
                              return (
                                <button
                                  key={section.id}
                                  onClick={() => handleSectionSelect(section.id)}
                                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                                    isActive ? `bg-${section.color}-50 border-l-4 border-${section.color}-500` : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Icon className={`w-5 h-5 ${
                                      isActive ? `text-${section.color}-600` : 'text-gray-400'
                                    }`} />
                                    <div className="flex-1">
                                      <h4 className={`font-medium text-sm ${
                                        isActive ? `text-${section.color}-900` : 'text-gray-900'
                                      }`}>
                                        {section.name}
                                      </h4>
                                      {section.description && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {section.description}
                                        </p>
                                      )}
                                    </div>
                                    {isActive && (
                                      <div className={`w-2 h-2 rounded-full bg-${section.color}-500`} />
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Hero section slide management */}
          {selectedSection === 'hero' && (
            <div className="space-y-6">
              {/* Hero Slider Settings */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
                <h4 className="text-md font-semibold text-indigo-900 mb-4">⚙️ Hero Slider Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Autoplay Delay */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Autoplay Delay (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={heroSliderSettings?.autoplayDelay ? heroSliderSettings.autoplayDelay / 1000 : 5}
                      onChange={(e) => {
                        const delay = parseInt(e.target.value) * 1000
                        updateHeroSliderSettings({ autoplayDelay: delay })
                        showNotificationToast('success', 'Autoplay delay updated')
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Time between slides (1-30 seconds)</p>
                  </div>

                  {/* Effect */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transition Effect
                    </label>
                    <select
                      value={heroSliderSettings?.effect || 'fade'}
                      onChange={(e) => {
                        updateHeroSliderSettings({ effect: e.target.value as 'fade' | 'cube' | 'coverflow' | 'flip' })
                        showNotificationToast('success', 'Transition effect updated')
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="fade">Fade</option>
                      <option value="cube">Cube</option>
                      <option value="coverflow">Coverflow</option>
                      <option value="flip">Flip</option>
                    </select>
                  </div>

                  {/* Speed */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transition Speed (ms)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="3000"
                      step="100"
                      value={heroSliderSettings?.speed || 1000}
                      onChange={(e) => {
                        const speed = parseInt(e.target.value)
                        updateHeroSliderSettings({ speed })
                        showNotificationToast('success', 'Transition speed updated')
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Animation speed (100-3000ms)</p>
                  </div>

                  {/* Loop */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loop Slides
                    </label>
                    <button
                      onClick={() => {
                        updateHeroSliderSettings({ loop: !heroSliderSettings?.loop })
                        showNotificationToast('success', `Loop ${!heroSliderSettings?.loop ? 'enabled' : 'disabled'}`)
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        heroSliderSettings?.loop !== false 
                          ? 'bg-indigo-600' 
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          heroSliderSettings?.loop !== false 
                            ? 'translate-x-6' 
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <p className="text-xs text-gray-500 mt-1">Continuously loop through slides</p>
                  </div>
                </div>
              </div>

              {/* Hero slide management */}
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <HeroSlideManager
                  heroSlides={heroSlides}
                  heroSlideTemplates={heroSlideTemplates}
                  onAddSlide={addHeroSlide}
                  onUpdateSlide={(id, updates) => {
                    console.log('🔄 Content Management: Updating hero slide', id, updates)
                    updateHeroSlide(id, updates)
                  }}
                  onDeleteSlide={deleteHeroSlide}
                  onToggleSlideActive={toggleHeroSlideActive}
                  onReorderSlide={reorderHeroSlide}
                  onSaveTemplate={(template) => {
                    addHeroSlideTemplate(template)
                    showNotificationToast('success', 'Template saved successfully!')
                  }}
                  onUpdateTemplate={(id, template) => {
                    try {
                      updateHeroSlideTemplate(id, template)
                      showNotificationToast('success', 'Template updated successfully!')
                    } catch (error) {
                      console.error('Failed to update template:', error)
                      showNotificationToast('error', 'Failed to update template.')
                    }
                  }}
                  onDeleteTemplate={(id) => {
                    try {
                      deleteHeroSlideTemplate(id)
                      showNotificationToast('success', 'Template deleted successfully!')
                    } catch (error) {
                      console.error('Failed to delete template:', error)
                      showNotificationToast('error', 'Failed to delete template.')
                    }
                  }}
                  showNotification={showNotificationToast}
                />
              </div>

              {/* Shop by Category 섹션 관리 */}
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-6 border border-pink-200">
                <CategoryManager
                  categoryItems={categoryItems}
                  onAddCategory={addCategoryItem}
                  onUpdateCategory={updateCategoryItem}
                  onDeleteCategory={deleteCategoryItem}
                  onToggleCategoryActive={toggleCategoryItemActive}
                  onReorderCategory={reorderCategoryItem}
                  showNotification={showNotificationToast}
                />
              </div>
            </div>
          )}

          {/* Bundle product management */}
          {selectedSection === 'bundle' && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <BundleManager
                showNotification={showNotificationToast}
              />
            </div>
          )}

          {/* Shipping & Pickup management */}
          {selectedSection === 'shipping-pickup' && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <ShippingOptionsManager />
            </div>
          )}

          {/* Payment Options management */}
          {selectedSection === 'payment-options' && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <PaymentOptionsManager />
            </div>
          )}

          {/* Promo Codes 관리 */}
          {selectedSection === 'promo-codes' && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <PromoCodeManager />
            </div>
          )}

          {/* VIP Grade Management (통합: Criteria + Benefits) */}
          {selectedSection === 'vip-benefits' && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <VIPGradeBenefitManager />
            </div>
          )}

        {/* Subcategories Management */}
        {selectedSection === 'subcategories' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Subcategories Management</h2>
              <p className="text-gray-600 mb-6">
                Manage subcategory cards displayed on category pages (e.g., Basic, Premium, Custom on Stickers page, or Sunscreen, Sunstick on Market S page).
              </p>
              
              <div className="space-y-8">
                {/* Stickers Subcategories */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <SubcategoryManager
                    subcategoryItems={subcategoryItems}
                    category="stickers"
                    onAddSubcategory={addSubcategoryItem}
                    onUpdateSubcategory={updateSubcategoryItem}
                    onDeleteSubcategory={deleteSubcategoryItem}
                    onToggleSubcategoryActive={toggleSubcategoryItemActive}
                    onReorderSubcategory={(fromIndex, toIndex) => {
                      const stickers = subcategoryItems.filter(s => s.category === 'stickers').sort((a, b) => a.order - b.order)
                      const fromId = stickers[fromIndex]?.id
                      const toId = stickers[toIndex]?.id
                      if (fromId && toId) {
                        const fromGlobalIndex = subcategoryItems.findIndex(s => s.id === fromId)
                        const toGlobalIndex = subcategoryItems.findIndex(s => s.id === toId)
                        reorderSubcategoryItem(fromGlobalIndex, toGlobalIndex)
                      }
                    }}
                    showNotification={showNotificationToast}
                  />
                </div>

                {/* Market S (Hot Goods) Subcategories */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <SubcategoryManager
                    subcategoryItems={subcategoryItems}
                    category="hot-goods"
                    onAddSubcategory={addSubcategoryItem}
                    onUpdateSubcategory={updateSubcategoryItem}
                    onDeleteSubcategory={deleteSubcategoryItem}
                    onToggleSubcategoryActive={toggleSubcategoryItemActive}
                    onReorderSubcategory={(fromIndex, toIndex) => {
                      const hotGoods = subcategoryItems.filter(s => s.category === 'hot-goods').sort((a, b) => a.order - b.order)
                      const fromId = hotGoods[fromIndex]?.id
                      const toId = hotGoods[toIndex]?.id
                      if (fromId && toId) {
                        const fromGlobalIndex = subcategoryItems.findIndex(s => s.id === fromId)
                        const toGlobalIndex = subcategoryItems.findIndex(s => s.id === toId)
                        reorderSubcategoryItem(fromGlobalIndex, toGlobalIndex)
                      }
                    }}
                    showNotification={showNotificationToast}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Hero Backgrounds */}
        {selectedSection === 'category-hero' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Category Hero Backgrounds</h2>
              <p className="text-gray-600 mb-6">
                Manage sliding background animations for each category page. These backgrounds will appear behind the hero section.
              </p>
              
              <div className="space-y-8">
                {/* Stickers */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <CategoryHeroSlideManager
                    categoryHeroSlides={categoryHeroSlides}
                    category="stickers"
                    onAddSlide={addCategoryHeroSlide}
                    onUpdateSlide={(id, updates) => {
                      updateCategoryHeroSlide(id, updates)
                    }}
                    onDeleteSlide={deleteCategoryHeroSlide}
                    onToggleSlideActive={toggleCategoryHeroSlideActive}
                    onReorderSlide={(fromIndex, toIndex) => {
                      reorderCategoryHeroSlide('stickers', fromIndex, toIndex)
                      showNotificationToast('success', 'Slide order updated successfully!')
                    }}
                    showNotification={showNotificationToast}
                  />
                </div>

                {/* Stamps */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <CategoryHeroSlideManager
                    categoryHeroSlides={categoryHeroSlides}
                    category="stamps"
                    onAddSlide={addCategoryHeroSlide}
                    onUpdateSlide={(id, updates) => {
                      updateCategoryHeroSlide(id, updates)
                    }}
                    onDeleteSlide={deleteCategoryHeroSlide}
                    onToggleSlideActive={toggleCategoryHeroSlideActive}
                    onReorderSlide={(fromIndex, toIndex) => {
                      reorderCategoryHeroSlide('stamps', fromIndex, toIndex)
                      showNotificationToast('success', 'Slide order updated successfully!')
                    }}
                    showNotification={showNotificationToast}
                  />
                </div>

                {/* Phone Cases */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <CategoryHeroSlideManager
                    categoryHeroSlides={categoryHeroSlides}
                    category="phone-cases"
                    onAddSlide={addCategoryHeroSlide}
                    onUpdateSlide={(id, updates) => {
                      updateCategoryHeroSlide(id, updates)
                    }}
                    onDeleteSlide={deleteCategoryHeroSlide}
                    onToggleSlideActive={toggleCategoryHeroSlideActive}
                    onReorderSlide={(fromIndex, toIndex) => {
                      reorderCategoryHeroSlide('phone-cases', fromIndex, toIndex)
                      showNotificationToast('success', 'Slide order updated successfully!')
                    }}
                    showNotification={showNotificationToast}
                  />
                </div>

                {/* Market S (Hot Goods) */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <CategoryHeroSlideManager
                    categoryHeroSlides={categoryHeroSlides}
                    category="hot-goods"
                    onAddSlide={addCategoryHeroSlide}
                    onUpdateSlide={(id, updates) => {
                      updateCategoryHeroSlide(id, updates)
                    }}
                    onDeleteSlide={deleteCategoryHeroSlide}
                    onToggleSlideActive={toggleCategoryHeroSlideActive}
                    onReorderSlide={(fromIndex, toIndex) => {
                      reorderCategoryHeroSlide('hot-goods', fromIndex, toIndex)
                      showNotificationToast('success', 'Slide order updated successfully!')
                    }}
                    showNotification={showNotificationToast}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How It Works Quick Edit */}
        {selectedSection === 'how-it-works' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">⚙️ How It Works Quick Edit</h3>
                  <p className="text-sm text-green-700">Edit title and subtitle for the How It Works section.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickEditCard
                  title="How It Works Title"
                  value={contentItems.find(item => item.section === 'how-it-works' && item.title === 'How It Works Title')?.content || contentItems.find(item => item.section === 'how-it-works' && item.title === 'How It Works 제목')?.content || 'How It Works'}
                  placeholder="Enter section title"
                  type="text"
                  description="Main title of How It Works section"
                  section="how-it-works"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'how-it-works' && item.title === 'How It Works Title') || contentItems.find(item => item.section === 'how-it-works' && item.title === 'How It Works 제목')}
                  showNotification={showNotificationToast}
                />

                <QuickEditCard
                  title="How It Works Subtitle"
                  value={contentItems.find(item => item.section === 'how-it-works' && item.title === 'How It Works Subtitle')?.content || contentItems.find(item => item.section === 'how-it-works' && item.title === 'How It Works 부제목')?.content || ''}
                  placeholder="Enter section subtitle (optional)"
                  type="text"
                  description="Subtitle of How It Works section (leave blank to hide)"
                  section="how-it-works"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'how-it-works' && item.title === 'How It Works Subtitle') || contentItems.find(item => item.section === 'how-it-works' && item.title === 'How It Works 부제목')}
                  showNotification={showNotificationToast}
                />
              </div>

              {/* Step 1 */}
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
                  Step 1
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <QuickEditCard
                    title="Step 1 Title"
                    value={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 1 Title')?.content || contentItems.find(item => item.section === 'how-it-works' && item.title === '1단계 제목')?.content || ''}
                    placeholder="Enter step 1 title"
                    type="text"
                    description="Title for Step 1"
                    section="how-it-works"
                    onSave={handleQuickEditSave}
                    existingContent={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 1 Title') || contentItems.find(item => item.section === 'how-it-works' && item.title === '1단계 제목')}
                    showNotification={showNotificationToast}
                  />
                  <QuickEditCard
                    title="Step 1 Description"
                    value={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 1 Description')?.content || contentItems.find(item => item.section === 'how-it-works' && item.title === '1단계 설명')?.content || ''}
                    placeholder="Enter step 1 description"
                    type="textarea"
                    description="Description for Step 1"
                    section="how-it-works"
                    onSave={handleQuickEditSave}
                    existingContent={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 1 Description') || contentItems.find(item => item.section === 'how-it-works' && item.title === '1단계 설명')}
                    showNotification={showNotificationToast}
                  />
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
                  Step 2
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <QuickEditCard
                    title="Step 2 Title"
                    value={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 2 Title')?.content || contentItems.find(item => item.section === 'how-it-works' && item.title === '2단계 제목')?.content || ''}
                    placeholder="Enter step 2 title"
                    type="text"
                    description="Title for Step 2"
                    section="how-it-works"
                    onSave={handleQuickEditSave}
                    existingContent={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 2 Title') || contentItems.find(item => item.section === 'how-it-works' && item.title === '2단계 제목')}
                    showNotification={showNotificationToast}
                  />
                  <QuickEditCard
                    title="Step 2 Description"
                    value={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 2 Description')?.content || contentItems.find(item => item.section === 'how-it-works' && item.title === '2단계 설명')?.content || ''}
                    placeholder="Enter step 2 description"
                    type="textarea"
                    description="Description for Step 2"
                    section="how-it-works"
                    onSave={handleQuickEditSave}
                    existingContent={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 2 Description') || contentItems.find(item => item.section === 'how-it-works' && item.title === '2단계 설명')}
                    showNotification={showNotificationToast}
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
                  Step 3
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <QuickEditCard
                    title="Step 3 Title"
                    value={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 3 Title')?.content || contentItems.find(item => item.section === 'how-it-works' && item.title === '3단계 제목')?.content || ''}
                    placeholder="Enter step 3 title"
                    type="text"
                    description="Title for Step 3"
                    section="how-it-works"
                    onSave={handleQuickEditSave}
                    existingContent={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 3 Title') || contentItems.find(item => item.section === 'how-it-works' && item.title === '3단계 제목')}
                    showNotification={showNotificationToast}
                  />
                  <QuickEditCard
                    title="Step 3 Description"
                    value={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 3 Description')?.content || contentItems.find(item => item.section === 'how-it-works' && item.title === '3단계 설명')?.content || ''}
                    placeholder="Enter step 3 description"
                    type="textarea"
                    description="Description for Step 3"
                    section="how-it-works"
                    onSave={handleQuickEditSave}
                    existingContent={contentItems.find(item => item.section === 'how-it-works' && item.title === 'Step 3 Description') || contentItems.find(item => item.section === 'how-it-works' && item.title === '3단계 설명')}
                    showNotification={showNotificationToast}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Quick Edit */}
        {selectedSection === 'footer' && (
          <div className="space-y-6 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">📄 Footer Quick Edit</h3>
                  <p className="text-sm text-gray-700">Quickly edit frequently used footer content.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Company Name */}
                <QuickEditCard
                  title="Company Name"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Company Name')?.content || 'Selpic'}
                  placeholder="Enter company name"
                  type="text"
                  description="Company name displayed in footer"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Company Name')}
                  showNotification={showNotificationToast}
                />

                {/* Company Description */}
                <QuickEditCard
                  title="Company Description"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Company Description')?.content || 'Your digital sticker journey starts here. Customize and print your own stickers with ease.'}
                  placeholder="Enter company description"
                  type="text"
                  description="Company description displayed in footer"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Company Description')}
                  showNotification={showNotificationToast}
                />

                {/* Quick Links Title */}
                <QuickEditCard
                  title="Quick Links Title"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Title')?.content || 'Quick Links'}
                  placeholder="Enter quick links title"
                  type="text"
                  description="Quick Links section title"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Title')}
                  showNotification={showNotificationToast}
                />

                {/* Quick Links Items (default: homepage navigation links) */}
                <QuickEditCard
                  title="Quick Links Item 1 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 1 Label')?.content || 'Stickers'}
                  placeholder="Enter link label"
                  type="text"
                  description="Quick Links first item label"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 1 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 1 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 1 URL')?.linkUrl || '/stickers'}
                  placeholder="Enter link URL"
                  type="url"
                  description="Quick Links first item URL"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 1 URL')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 2 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 2 Label')?.content || 'Customize'}
                  placeholder="Enter link label"
                  type="text"
                  description="Quick Links second item label"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 2 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 2 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 2 URL')?.linkUrl || '/custom-design'}
                  placeholder="Enter link URL"
                  type="url"
                  description="Quick Links second item URL"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 2 URL')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 3 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 3 Label')?.content || 'About Us'}
                  placeholder="Enter link label"
                  type="text"
                  description="Quick Links third item label"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 3 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 3 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 3 URL')?.linkUrl || '/about'}
                  placeholder="Enter link URL"
                  type="url"
                  description="Quick Links third item URL"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 3 URL')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 4 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 4 Label')?.content || ''}
                  placeholder="Enter link label (optional, e.g., Contact)"
                  type="text"
                  description="Quick Links fourth item label (leave empty to hide)"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 4 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 4 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 4 URL')?.linkUrl || ''}
                  placeholder="Enter link URL (optional, e.g., /contact)"
                  type="url"
                  description="Quick Links fourth item URL (leave empty to hide)"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 4 URL')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 5 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 5 Label')?.content || ''}
                  placeholder="Enter link label (optional)"
                  type="text"
                  description="Quick Links fifth item label (leave empty to hide)"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 5 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Quick Links Item 5 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 5 URL')?.linkUrl || ''}
                  placeholder="Enter link URL (optional)"
                  type="url"
                  description="Quick Links fifth item URL (leave empty to hide)"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Quick Links Item 5 URL')}
                  showNotification={showNotificationToast}
                />

                {/* Help/Useful Links Title */}
                <QuickEditCard
                  title="Help/Useful Links Title"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help/Useful Links Title')?.content || 'Help/Useful Links'}
                  placeholder="Enter help/useful links title"
                  type="text"
                  description="Help/Useful Links section title"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help/Useful Links Title')}
                  showNotification={showNotificationToast}
                />

                {/* Resources / Help Links Items */}
                <QuickEditCard
                  title="Help Links Item 1 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 1 Label')?.content || 'Help Center'}
                  placeholder="Enter link label"
                  type="text"
                  description="Help/Useful Links first item label"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 1 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Help Links Item 1 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 1 URL')?.linkUrl || '/help'}
                  placeholder="Enter link URL"
                  type="url"
                  description="Help/Useful Links first item URL"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 1 URL')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Help Links Item 2 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 2 Label')?.content || 'Benefits & Promo Codes'}
                  placeholder="Enter link label"
                  type="text"
                  description="Help/Useful Links second item label"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 2 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Help Links Item 2 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 2 URL')?.linkUrl || '/benefits'}
                  placeholder="Enter link URL"
                  type="url"
                  description="Help/Useful Links second item URL"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 2 URL')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Help Links Item 3 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 3 Label')?.content || 'About Us'}
                  placeholder="Enter link label"
                  type="text"
                  description="Help/Useful Links third item label"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 3 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Help Links Item 3 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 3 URL')?.linkUrl || '/privacy'}
                  placeholder="Enter link URL"
                  type="url"
                  description="Help/Useful Links third item URL"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 3 URL')}
                  showNotification={showNotificationToast}
                />

                {/* Additional Help Links (for Terms & Refund) */}
                <QuickEditCard
                  title="Help Links Item 4 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 4 Label')?.content || 'Terms and Conditions'}
                  placeholder="Enter link label"
                  type="text"
                  description="Help/Useful Links fourth item label"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 4 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Help Links Item 4 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 4 URL')?.linkUrl || '/terms'}
                  placeholder="Enter link URL"
                  type="url"
                  description="Help/Useful Links fourth item URL"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 4 URL')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Help Links Item 5 Label"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 5 Label')?.content || 'Refund Policy'}
                  placeholder="Enter link label"
                  type="text"
                  description="Help/Useful Links fifth item label"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 5 Label')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Help Links Item 5 URL"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 5 URL')?.linkUrl || '/refund'}
                  placeholder="Enter link URL"
                  type="url"
                  description="Help/Useful Links fifth item URL"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Help Links Item 5 URL')}
                  showNotification={showNotificationToast}
                />

                {/* Newsletter Title */}
                <QuickEditCard
                  title="Newsletter Title"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Newsletter Title')?.content || 'Newsletter'}
                  placeholder="Enter newsletter title"
                  type="text"
                  description="Newsletter section title"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Newsletter Title')}
                  showNotification={showNotificationToast}
                />

                {/* Newsletter Description */}
                <QuickEditCard
                  title="Newsletter Description"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Newsletter Description')?.content || 'Subscribe to our newsletter for updates.'}
                  placeholder="Enter newsletter description"
                  type="text"
                  description="Newsletter section description"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Newsletter Description')}
                  showNotification={showNotificationToast}
                />

                {/* Copyright Information */}
                <QuickEditCard
                  title="Copyright Information"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Copyright Information')?.content || 'Selpic'}
                  placeholder="Enter copyright information"
                  type="text"
                  description="Copyright text displayed at bottom of footer"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Copyright Information')}
                  showNotification={showNotificationToast}
                />
              </div>
            </div>

            {/* Social Media Links Quick Edit - Reserved for future use */}
            <div className="bg-white rounded-xl border shadow-sm p-6 border-dashed border-gray-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-500">🔗 Social Media Links (Reserved)</h3>
                  <p className="text-sm text-gray-500">Social media links are reserved for future use. You can manage them here when needed.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Instagram Link */}
                <QuickEditCard
                  title="Instagram Link"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Instagram Link')?.linkUrl || '#'}
                  placeholder="Enter Instagram URL"
                  type="url"
                  description="Instagram social media link URL (reserved for future use)"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Instagram Link')}
                  showNotification={showNotificationToast}
                />

                {/* Facebook Link */}
                <QuickEditCard
                  title="Facebook Link"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Facebook Link')?.linkUrl || '#'}
                  placeholder="Enter Facebook URL"
                  type="url"
                  description="Facebook social media link URL (reserved for future use)"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Facebook Link')}
                  showNotification={showNotificationToast}
                />

                {/* Twitter Link */}
                <QuickEditCard
                  title="Twitter Link"
                  value={contentItems.find(item => item.section === 'footer' && item.title === 'Twitter Link')?.linkUrl || '#'}
                  placeholder="Enter Twitter URL"
                  type="url"
                  description="Twitter social media link URL (reserved for future use)"
                  section="footer"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'footer' && item.title === 'Twitter Link')}
                  showNotification={showNotificationToast}
                />
              </div>
            </div>
          </div>
        )}

          {/* Header content quick edit */}
          {selectedSection === 'header' && (
            <div className="space-y-6">
              {/* Header basic content */}
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-900">🚀 Header Content Quick Edit</h3>
                    <p className="text-sm text-indigo-700">Quickly edit frequently used header content.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Company Name */}
                  <QuickEditCard
                    title="Company Name"
                    value={contentItems.find(item => item.section === 'header' && item.title === 'Company Name')?.content || 'Selpic'}
                    placeholder="Enter company name"
                    type="text"
                    description="Company name displayed in header"
                    section="header"
                    onSave={handleQuickEditSave}
                    existingContent={contentItems.find(item => item.section === 'header' && item.title === 'Company Name')}
                    showNotification={showNotificationToast}
                  />
                  
                  {/* Home Link URL */}
                  <QuickEditCard
                    title="Home Link URL"
                    value={contentItems.find(item => item.section === 'header' && item.title === 'Home Link')?.linkUrl || '/'}
                    placeholder="Enter home link URL (e.g., /)"
                    type="url"
                    description="URL when company name/logo is clicked"
                    section="header"
                    onSave={(data) => {
                      const homeLinkItem = contentItems.find(item => item.section === 'header' && item.title === 'Home Link')
                      if (homeLinkItem) {
                        updateContent(homeLinkItem.id, {
                          linkUrl: data.linkUrl || '/'
                        })
                        showNotificationToast('success', 'Home Link URL updated successfully')
                      } else {
                        addContent({
                          type: 'link',
                          section: 'header',
                          title: 'Home Link',
                          content: 'Home',
                          linkUrl: data.linkUrl || '/',
                          order: 2,
                          isActive: true
                        })
                        showNotificationToast('success', 'Home Link URL created successfully')
                      }
                    }}
                    existingContent={contentItems.find(item => item.section === 'header' && item.title === 'Home Link')}
                    showNotification={showNotificationToast}
                  />
                  
                  {/* Login Link URL */}
                  <QuickEditCard
                    title="Login Link URL"
                    value={contentItems.find(item => item.section === 'header' && item.title === 'Login Button')?.linkUrl || '/login'}
                    placeholder="Enter login link URL (e.g., /login)"
                    type="url"
                    description="URL when login icon is clicked"
                    section="header"
                    onSave={(data) => {
                      const loginButtonItem = contentItems.find(item => item.section === 'header' && item.title === 'Login Button')
                      if (loginButtonItem) {
                        updateContent(loginButtonItem.id, {
                          linkUrl: data.linkUrl || '/login'
                        })
                        showNotificationToast('success', 'Login Link URL updated successfully')
                      } else {
                        addContent({
                          type: 'button',
                          section: 'header',
                          title: 'Login Button',
                          content: 'Login',
                          buttonStyle: 'primary',
                          linkUrl: data.linkUrl || '/login',
                          order: 4,
                          isActive: true
                        })
                        showNotificationToast('success', 'Login Link URL created successfully')
                      }
                    }}
                    existingContent={contentItems.find(item => item.section === 'header' && item.title === 'Login Button')}
                    showNotification={showNotificationToast}
                  />
                  
                  {/* Cart Link URL */}
                  <QuickEditCard
                    title="Cart Link URL"
                    value={contentItems.find(item => item.section === 'header' && item.title === 'Cart Button')?.linkUrl || '/cart'}
                    placeholder="Enter cart link URL (e.g., /cart)"
                    type="url"
                    description="URL when cart icon is clicked"
                    section="header"
                    onSave={(data) => {
                      const cartButtonItem = contentItems.find(item => item.section === 'header' && item.title === 'Cart Button')
                      if (cartButtonItem) {
                        updateContent(cartButtonItem.id, {
                          linkUrl: data.linkUrl || '/cart'
                        })
                        showNotificationToast('success', 'Cart Link URL updated successfully')
                      } else {
                        addContent({
                          type: 'button',
                          section: 'header',
                          title: 'Cart Button',
                          content: 'Cart',
                          buttonStyle: 'secondary',
                          iconName: 'ShoppingCart',
                          linkUrl: data.linkUrl || '/cart',
                          order: 5,
                          isActive: true
                        })
                        showNotificationToast('success', 'Cart Link URL created successfully')
                      }
                    }}
                    existingContent={contentItems.find(item => item.section === 'header' && item.title === 'Cart Button')}
                    showNotification={showNotificationToast}
                  />
                </div>

                {/* Logo Image Management */}
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="text-md font-semibold text-blue-900 mb-4">🖼️ Logo Image Management</h4>
                  <div className="space-y-4">
                    {/* Logo Display Type Toggle */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">Use Logo Image</h5>
                        <p className="text-xs text-gray-500 mt-1">Display logo image instead of company name text</p>
                      </div>
                      <button
                        onClick={() => {
                          const logoItem = pickLogoImageItem(contentItems)
                          if (logoItem) {
                            updateContent(logoItem.id, {
                              isActive: !logoItem.isActive
                            })
                            showNotificationToast('success', `Logo Image ${!logoItem.isActive ? 'enabled' : 'disabled'}`)
                          } else {
                            addContent({
                              type: 'image',
                              section: 'header',
                              title: 'Logo Image',
                              content: '',
                              mediaUrl: '',
                              linkUrl: '/',
                              order: 0.5,
                              isActive: true
                            })
                            showNotificationToast('success', 'Logo Image enabled')
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          pickLogoImageItem(contentItems)?.isActive 
                            ? 'bg-blue-600' 
                            : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            pickLogoImageItem(contentItems)?.isActive 
                              ? 'translate-x-6' 
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Logo Image Upload */}
                    {pickLogoImageItem(contentItems)?.isActive && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-blue-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo Image URL
                          </label>
                          <div className="space-y-2">
                            <input
                              type="url"
                              value={pickLogoImageItem(contentItems)?.mediaUrl || ''}
                              onChange={(e) => {
                                const logoItem = pickLogoImageItem(contentItems)
                                if (logoItem) {
                                  updateContent(logoItem.id, {
                                    mediaUrl: e.target.value
                                  })
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter logo image URL or upload image"
                            />
                            <MediaUpload
                              type="image"
                              currentUrl={pickLogoImageItem(contentItems)?.mediaUrl}
                              usage="header-logo"
                              onUpload={(file, url) => {
                                const logoItem = pickLogoImageItem(contentItems)
                                if (logoItem) {
                                  updateContent(logoItem.id, {
                                    mediaUrl: url
                                  })
                                  showNotificationToast('success', 'Logo image uploaded successfully')
                                }
                              }}
                              onRemove={() => {
                                const logoItem = pickLogoImageItem(contentItems)
                                if (logoItem) {
                                  updateContent(logoItem.id, {
                                    mediaUrl: ''
                                  })
                                  showNotificationToast('success', 'Logo image removed')
                                }
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>

                        {/* Logo Click URL */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo Click URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={pickLogoImageItem(contentItems)?.linkUrl || ''}
                            onChange={(e) => {
                              const logoItem = pickLogoImageItem(contentItems)
                              if (logoItem) {
                                updateContent(logoItem.id, {
                                  linkUrl: e.target.value || ''
                                })
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Leave empty to use Home Link URL"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            If empty, uses "Home Link URL" above. If set, this URL takes priority when logo is clicked.
                          </p>
                        </div>

                        {/* Logo Preview */}
                        {pickLogoImageItem(contentItems)?.mediaUrl && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Preview
                            </label>
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[5rem]">
                              {/* indexeddb:// is not a valid raw img src; same resolver as site header */}
                              <HeaderLogoImage
                                key={pickLogoImageItem(contentItems)?.mediaUrl}
                                src={pickLogoImageItem(contentItems)?.mediaUrl || ''}
                                alt="Logo preview"
                                className="max-h-20 max-w-full object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Header Feature Toggles */}
                <div className="mt-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Header Features</h4>
                  <div className="space-y-4">
                    {/* Search Button Toggle */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">Search Button</h5>
                        <p className="text-xs text-gray-500 mt-1">Enable or disable the search button in the header</p>
                      </div>
                      <button
                        onClick={() => {
                          const searchButtonItem = contentItems.find(item => item.section === 'header' && item.title === 'Search Button Enabled')
                          const isEnabled = searchButtonItem?.content === 'true'
                          if (searchButtonItem) {
                            updateContent(searchButtonItem.id, {
                              content: isEnabled ? 'false' : 'true'
                            })
                            showNotificationToast(
                              'success',
                              `Search Button ${isEnabled ? 'disabled' : 'enabled'} (check the save status badge)`
                            )
                          } else {
                            addContent({
                              type: 'button',
                              section: 'header',
                              title: 'Search Button Enabled',
                              content: 'true',
                              order: 6,
                              isActive: true
                            })
                            showNotificationToast('success', 'Search Button enabled')
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          contentItems.find(item => item.section === 'header' && item.title === 'Search Button Enabled')?.content === 'true' 
                            ? 'bg-indigo-600' 
                            : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            contentItems.find(item => item.section === 'header' && item.title === 'Search Button Enabled')?.content === 'true' 
                              ? 'translate-x-6' 
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Language Selector Toggle */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">Language Selector</h5>
                        <p className="text-xs text-gray-500 mt-1">Enable or disable the language selector in the header</p>
                      </div>
                      <button
                        onClick={() => {
                          const languageSelectorItem = contentItems.find(item => item.section === 'header' && item.title === 'Language Selector Enabled')
                          const isEnabled = languageSelectorItem?.content === 'true'
                          if (languageSelectorItem) {
                            updateContent(languageSelectorItem.id, {
                              content: isEnabled ? 'false' : 'true'
                            })
                            showNotificationToast(
                              'success',
                              `Language Selector ${isEnabled ? 'disabled' : 'enabled'} (check the save status badge)`
                            )
                          } else {
                            addContent({
                              type: 'button',
                              section: 'header',
                              title: 'Language Selector Enabled',
                              content: 'true',
                              order: 7,
                              isActive: true
                            })
                            showNotificationToast('success', 'Language Selector enabled')
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          contentItems.find(item => item.section === 'header' && item.title === 'Language Selector Enabled')?.content === 'true' 
                            ? 'bg-indigo-600' 
                            : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            contentItems.find(item => item.section === 'header' && item.title === 'Language Selector Enabled')?.content === 'true' 
                              ? 'translate-x-6' 
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Menu Management */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-purple-800">Sidebar Menu Management</h3>
                  <button
                    onClick={() => {
                      updateDefaultSidebarMenu()
                      showNotificationToast('success', 'Sidebar menu defaults updated successfully!')
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Update Defaults
                  </button>
                </div>
                <SidebarMenuManager
                  sidebarMenuItems={sidebarMenuItems}
                  onAddMenuItem={(item) => {
                    addSidebarMenuItem(item)
                    // Update default value after adding icon
                    setTimeout(() => updateDefaultSidebarMenu(), 100)
                  }}
                  onUpdateMenuItem={(id, item) => {
                    updateSidebarMenuItem(id, item)
                    // Update default value after editing icon
                    setTimeout(() => updateDefaultSidebarMenu(), 100)
                  }}
                  onDeleteMenuItem={(id) => {
                    deleteSidebarMenuItem(id)
                    // Update default value after deleting icon
                    setTimeout(() => updateDefaultSidebarMenu(), 100)
                  }}
                  onReorderMenuItem={(fromIndex, toIndex) => {
                    reorderSidebarMenuItem(fromIndex, toIndex)
                    // Update default value after reordering
                    setTimeout(() => updateDefaultSidebarMenu(), 100)
                  }}
                  showNotification={showNotificationToast}
                />
              </div>
            </div>
          )}

        {/* Refund Policy Quick Edit */}
        {selectedSection === 'refund' && (
          <div className="space-y-6 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-orange-900">📄 Refund Policy Quick Edit</h3>
                  <p className="text-sm text-orange-700">Edit Refund Policy content by section. Changes are reflected immediately on the Refund Policy page.</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Header Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Header</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <QuickEditCard
                      title="Refund Policy Title"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Refund Policy Title')?.content || 'Refund Policy'}
                      placeholder="Enter refund policy title"
                      type="text"
                      description="Main title of Refund Policy page"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Refund Policy Title')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Refund Policy Intro"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Refund Policy Intro')?.content || ''}
                      placeholder="Enter introduction text"
                      type="text"
                      description="Introduction paragraph for Refund Policy page"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Refund Policy Intro')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 1: Change of Mind Returns (Non-Faulty Items) */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">1. Change of Mind Returns (Non-Faulty Items)</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Section 1 Title"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 1 Title')?.content || '1. Change of Mind Returns (Non-Faulty Items)'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 1 title"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 1 Title')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Section 1 내용"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 1 내용')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 1 description/content"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 1 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Section 1 목록"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 1 목록')?.content || ''}
                      placeholder="Enter list items (one per line, or separated by commas)"
                      type="textarea"
                      description="List of items for Section 1. Press Enter to create a new line for each item. You can also use commas to separate items. Items with commas or periods inside will be handled correctly."
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 1 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 2: Faulty, Damaged, or Incorrect Items (ACL Consumer Guarantee) */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">2. Faulty, Damaged, or Incorrect Items (ACL Consumer Guarantee)</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Section 2 Title"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 2 Title')?.content || '2. Faulty, Damaged, or Incorrect Items (ACL Consumer Guarantee)'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 2 title"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 2 Title')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Section 2 내용"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 2 내용')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 2 description/content"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 2 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Section 2 목록"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 2 목록')?.content || ''}
                      placeholder="Enter list items (one per line, or separated by commas)"
                      type="textarea"
                      description="List of items for Section 2. Press Enter to create a new line for each item. You can also use commas to separate items. Items with commas or periods inside will be handled correctly."
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 2 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 3: General Return Conditions & Process */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">3. General Return Conditions & Process</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Section 3 Title"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 3 Title')?.content || '3. General Return Conditions & Process'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 3 title"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 3 Title')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Section 3 내용"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 3 내용')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 3 description/content"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 3 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Section 3 목록"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Section 3 목록')?.content || ''}
                      placeholder="Enter list items (one per line, or separated by commas)"
                      type="textarea"
                      description="List of items for Section 3. Press Enter to create a new line for each item. You can also use commas to separate items. Items with commas or periods inside will be handled correctly."
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Section 3 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Contact Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Contact Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Contact Title"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Contact Title')?.content || 'Contact'}
                      placeholder="Enter contact section title"
                      type="text"
                      description="Contact section title"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Contact Title')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Contact Email"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Contact Email')?.content || 'support@selpic.com.au'}
                      placeholder="Enter contact email"
                      type="text"
                      description="Contact email for refund inquiries"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Contact Email')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Contact Hours"
                      value={contentItems.find(item => item.section === 'refund' && item.title === 'Contact Hours')?.content || 'Customer Service Hours: Mon–Fri 10am–5pm (Closed on weekends/public holidays)'}
                      placeholder="Enter contact hours"
                      type="text"
                      description="Customer service hours information"
                      section="refund"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'refund' && item.title === 'Contact Hours')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Policy 빠른 편집 */}
        {selectedSection === 'privacy' && (
          <div className="space-y-6 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">🔒 Privacy Policy Quick Edit</h3>
                  <p className="text-sm text-blue-700">Edit Privacy Policy content by section. Changes are reflected immediately on the Privacy Policy page.</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Header Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Header</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <QuickEditCard
                      title="Privacy Policy 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Privacy Policy 제목')?.content || 'Selpic Privacy Policy'}
                      placeholder="Enter Privacy Policy title"
                      type="text"
                      description="Main title of Privacy Policy page"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Privacy Policy 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Privacy Policy 부제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Privacy Policy 부제목')?.content || 'Effective Date: December 2025 (Last Updated: December 2025)'}
                      placeholder="Enter subtitle"
                      type="text"
                      description="Subtitle with effective date"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Privacy Policy 부제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 1: Introduction */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">1. Introduction and Commitment</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Introduction 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Introduction 제목')?.content || '1. Introduction and Commitment'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 1 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Introduction 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Introduction 내용"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Introduction 내용')?.content || ''}
                      placeholder="Enter section content"
                      type="text"
                      description="Section 1 content"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Introduction 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 2: Personal Information We Collect */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">2. Personal Information We Collect</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Information We Collect 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Information We Collect 제목')?.content || '2. Personal Information We Collect'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 2 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Information We Collect 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Information We Collect 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Information We Collect 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 2 description"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Information We Collect 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="FIRST LIST"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'FIRST LIST')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="First list of information items (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'FIRST LIST')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="SECOND LIST"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'SECOND LIST')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="Second list of information items (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'SECOND LIST')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="THIRD LIST"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'THIRD LIST')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="Third list of information items (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'THIRD LIST')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="FOURTH LIST"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'FOURTH LIST')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="Fourth list of information items (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'FOURTH LIST')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 3: How We Collect Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">3. How We Collect Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="How We Collect Information 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Collect Information 제목')?.content || '3. How We Collect Information'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 3 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Collect Information 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="How We Collect Information 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Collect Information 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 3 description"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Collect Information 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="How We Collect Information 설명2"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Collect Information 설명2')?.content || ''}
                      placeholder="Enter section description 2"
                      type="text"
                      description="Section 3 description 2"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Collect Information 설명2')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="How We Collect Information 목록"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Collect Information 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of how we collect information (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Collect Information 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 4: Purpose of Collection and Use */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">4. Purpose of Collection and Use</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Purpose of Collection and Use 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Purpose of Collection and Use 제목')?.content || '4. Purpose of Collection and Use (Why We Need Your Data)'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 4 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Purpose of Collection and Use 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Purpose of Collection and Use 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Purpose of Collection and Use 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 4 description"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Purpose of Collection and Use 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="How We Use Information 목록"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Use Information 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of how we use information (comma-separated) - Used in Section 4"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'How We Use Information 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 5: Direct Marketing */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">5. Direct Marketing (APP 7)</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Direct Marketing 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Direct Marketing 제목')?.content || '5. Direct Marketing (APP 7)'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 5 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Direct Marketing 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Direct Marketing 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Direct Marketing 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 5 description"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Direct Marketing 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Direct Marketing 목록"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Direct Marketing 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of direct marketing information (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Direct Marketing 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 6: Disclosure to Third Parties */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">6. Disclosure to Third Parties</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Disclosure to Third Parties 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Disclosure to Third Parties 제목')?.content || '6. Disclosure to Third Parties'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 6 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Disclosure to Third Parties 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Disclosure to Third Parties 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Disclosure to Third Parties 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 6 description"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Disclosure to Third Parties 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Disclosure to Third Parties 목록"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Disclosure to Third Parties 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of third party disclosures (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Disclosure to Third Parties 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Disclosure to Third Parties 설명2"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Disclosure to Third Parties 설명2')?.content || ''}
                      placeholder="Enter additional description"
                      type="text"
                      description="Section 6 additional description (after list)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Disclosure to Third Parties 설명2')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 7: Data Quality and Security */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">7. Data Quality and Security</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Data Security 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Data Security 제목')?.content || '7. Data Quality and Security (APPs 10 & 11)'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 7 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Data Security 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Data Security 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Data Security 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 7 description"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Data Security 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Data Security 목록"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Data Security 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of data security measures (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Data Security 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 8: Access and Correction */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">8. Access and Correction</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Access and Correction 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Access and Correction 제목')?.content || '8. Access and Correction (APPs 12 & 13)'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 9 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Access and Correction 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Your Rights 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Your Rights 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 8 description - Used in Access and Correction section"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Your Rights 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Your Rights 목록"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Your Rights 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of user rights (comma-separated) - Used in Access and Correction section"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Your Rights 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 9: Making a Complaint */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">9. Making a Complaint</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Making a Complaint 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Making a Complaint 제목')?.content || '9. Making a Complaint'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 9 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Making a Complaint 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Making a Complaint 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Making a Complaint 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 9 description"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Making a Complaint 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Making a Complaint 목록"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Making a Complaint 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of complaint procedures (comma-separated)"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Making a Complaint 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 10: Contact Us */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">10. Contact Us</h4>
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <QuickEditCard
                      title="Contact Information 제목"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Information 제목')?.content || '10. Contact Us'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 10 title"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Information 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Contact Information 설명"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Information 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 10 description"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Information 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickEditCard
                      title="Contact Email"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Email')?.content || 'info@selpic.com.au'}
                      placeholder="Enter contact email"
                      type="text"
                      description="Contact email address"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Email')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Contact Phone"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Phone')?.content || '+61 0466894279'}
                      placeholder="Enter contact phone"
                      type="text"
                      description="Contact phone number"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Phone')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Contact Address"
                      value={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Address')?.content || 'Harvest St, Mansfield QLD 4122'}
                      placeholder="Enter contact address"
                      type="text"
                      description="Contact physical address"
                      section="privacy"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'privacy' && item.title === 'Contact Address')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Terms of Service 빠른 편집 */}
        {selectedSection === 'terms' && (
          <div className="space-y-6 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">📜 Terms of Service Quick Edit</h3>
                  <p className="text-sm text-green-700">Edit Terms of Service content by section. Changes are reflected immediately on the Terms of Service page.</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Header Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Header</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <QuickEditCard
                      title="Terms and Conditions 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Terms and Conditions 제목')?.content || 'Terms and Conditions'}
                      placeholder="Enter Terms and Conditions title"
                      type="text"
                      description="Main title of Terms of Service page"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Terms and Conditions 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Terms and Conditions 부제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Terms and Conditions 부제목')?.content || 'Last updated: September 3, 2025'}
                      placeholder="Enter subtitle"
                      type="text"
                      description="Subtitle with last updated date"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Terms and Conditions 부제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 1: Agreement to Terms */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">1. Agreement to Terms</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Agreement to Terms 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Agreement to Terms 제목')?.content || 'Agreement to Terms'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 1 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Agreement to Terms 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Agreement to Terms 내용"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Agreement to Terms 내용')?.content || ''}
                      placeholder="Enter section content"
                      type="text"
                      description="Section 1 content"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Agreement to Terms 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 2: Use of Service */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">2. Use of Service</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Use of Service 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Use of Service 제목')?.content || 'Use of Service'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 2 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Use of Service 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Permitted Uses 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Permitted Uses 제목')?.content || 'Permitted Uses'}
                      placeholder="Enter subsection title"
                      type="text"
                      description="Permitted Uses subsection title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Permitted Uses 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Permitted Uses 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Permitted Uses 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of permitted uses (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Permitted Uses 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Prohibited Uses 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Prohibited Uses 제목')?.content || 'Prohibited Uses'}
                      placeholder="Enter subsection title"
                      type="text"
                      description="Prohibited Uses subsection title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Prohibited Uses 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Prohibited Uses 내용"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Prohibited Uses 내용')?.content || ''}
                      placeholder="Enter subsection description"
                      type="text"
                      description="Prohibited Uses subsection description"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Prohibited Uses 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Prohibited Uses 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Prohibited Uses 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of prohibited uses (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Prohibited Uses 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 3: Orders and Payment */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">3. Orders and Payment</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Orders and Payment 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Orders and Payment 제목')?.content || 'Orders and Payment'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 3 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Orders and Payment 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Order Processing 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Order Processing 제목')?.content || 'Order Processing'}
                      placeholder="Enter subsection title"
                      type="text"
                      description="Order Processing subsection title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Order Processing 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Order Processing 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Order Processing 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of order processing terms (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Order Processing 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Payment Terms 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Payment Terms 제목')?.content || 'Payment Terms'}
                      placeholder="Enter subsection title"
                      type="text"
                      description="Payment Terms subsection title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Payment Terms 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Payment Terms 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Payment Terms 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of payment terms (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Payment Terms 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 4: Intellectual Property */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">4. Intellectual Property</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Intellectual Property 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Intellectual Property 제목')?.content || 'Intellectual Property'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 4 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Intellectual Property 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Selpic Rights — title"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Selpic Rights Title')?.content || 'Selpic\'s Rights'}
                      placeholder="Enter subsection title"
                      type="text"
                      description="Selpic Rights subsection title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Selpic Rights Title')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Selpic Rights — body"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Selpic Rights Content')?.content || ''}
                      placeholder="Enter content"
                      type="text"
                      description="Selpic Rights subsection body"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Selpic Rights Content')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="User Content 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'User Content 제목')?.content || 'User Content'}
                      placeholder="Enter subsection title"
                      type="text"
                      description="User Content subsection title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'User Content 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="User Content 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'User Content 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of user content terms (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'User Content 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 5: Limitation of Liability */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">5. Limitation of Liability</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Limitation of Liability 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 제목')?.content || 'Limitation of Liability'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 5 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Limitation of Liability 내용"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 내용')?.content || ''}
                      placeholder="Enter section content"
                      type="text"
                      description="Section 5 content"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Limitation of Liability 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of limitation of liability terms (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Limitation of Liability 내용2"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 내용2')?.content || ''}
                      placeholder="Enter additional section content"
                      type="text"
                      description="Section 5 additional content"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 내용2')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Limitation of Liability 목록2"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 목록2')?.content || ''}
                      placeholder="Enter additional list items separated by commas"
                      type="text"
                      description="Additional list of limitation of liability terms (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Limitation of Liability 목록2')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 6: Returns and Refunds */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">6. Returns and Refunds</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Returns and Refunds 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Returns and Refunds 제목')?.content || 'Returns and Refunds'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 6 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Returns and Refunds 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Return Policy 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Return Policy 제목')?.content || 'Return Policy'}
                      placeholder="Enter subsection title"
                      type="text"
                      description="Return Policy subsection title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Return Policy 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Return Policy 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Return Policy 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of return policy terms (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Return Policy 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Refund Process 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Refund Process 제목')?.content || 'Refund Process'}
                      placeholder="Enter subsection title"
                      type="text"
                      description="Refund Process subsection title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Refund Process 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Refund Process 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Refund Process 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of refund process terms (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Refund Process 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 7: Changes to Terms */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">7. Changes to Terms</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Changes to Terms 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Changes to Terms 제목')?.content || 'Changes to Terms'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 7 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Changes to Terms 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Changes to Terms 내용"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Changes to Terms 내용')?.content || ''}
                      placeholder="Enter section content"
                      type="text"
                      description="Section 7 content"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Changes to Terms 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 8: Governing Law */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">8. Governing Law</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickEditCard
                      title="Governing Law 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Governing Law 제목')?.content || '8. Governing Law'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 9 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Governing Law 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Governing Law 내용"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Governing Law 내용')?.content || ''}
                      placeholder="Enter section content"
                      type="text"
                      description="Section 8 content"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Governing Law 내용')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Governing Law 목록"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Governing Law 목록')?.content || ''}
                      placeholder="Enter list items separated by commas"
                      type="text"
                      description="List of governing law terms (comma-separated)"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Governing Law 목록')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>

                {/* Section 9: Contact Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">9. Contact Information</h4>
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <QuickEditCard
                      title="Contact Information 제목"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Information 제목')?.content || 'Contact Us'}
                      placeholder="Enter section title"
                      type="text"
                      description="Section 9 title"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Information 제목')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Contact Information 설명"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Information 설명')?.content || ''}
                      placeholder="Enter section description"
                      type="text"
                      description="Section 9 description"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Information 설명')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickEditCard
                      title="Contact Email"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Email')?.content || 'legal@selpic.com'}
                      placeholder="Enter contact email"
                      type="text"
                      description="Contact email address"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Email')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Contact Phone"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Phone')?.content || '+1 (555) 123-4567'}
                      placeholder="Enter contact phone"
                      type="text"
                      description="Contact phone number"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Phone')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                    <QuickEditCard
                      title="Contact Address"
                      value={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Address')?.content || '123 Sticker Street, Design City, DC 12345'}
                      placeholder="Enter contact address"
                      type="text"
                      description="Contact physical address"
                      section="terms"
                      onSave={handleQuickEditSave}
                      existingContent={contentItems.find(item => item.section === 'terms' && item.title === 'Contact Address')}
                      showNotification={(type, message) => {
                        if (type === 'success') alert(message)
                        else if (type === 'error') alert(`Error: ${message}`)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About Us Quick Edit */}
        {selectedSection === 'about' && (
          <div className="space-y-6 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900">📄 About Us Quick Edit</h3>
                  <p className="text-sm text-emerald-700">Quickly edit frequently used About Us page content.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Hero Section */}
                <QuickEditCard
                  title="Hero Title"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Hero Title')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Hero 제목')?.content || 'About Us'}
                  placeholder="Enter hero title"
                  type="text"
                  description="Main title in hero section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Hero Title') || contentItems.find(item => item.section === 'about' && item.title === 'Hero 제목')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Hero Subtitle"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Hero Subtitle')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Hero 부제목')?.content || ''}
                  placeholder="Enter hero subtitle"
                  type="text"
                  description="Subtitle in hero section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Hero Subtitle') || contentItems.find(item => item.section === 'about' && item.title === 'Hero 부제목')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Hero Browse Button"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Hero Browse Button')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Hero Browse 버튼')?.content || 'Sticker Products'}
                  placeholder="Enter button text"
                  type="text"
                  description="Text for Browse Products button"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Hero Browse Button') || contentItems.find(item => item.section === 'about' && item.title === 'Hero Browse 버튼')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Hero Customize Button"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Hero Customize Button')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Hero Customize 버튼')?.content || 'Stamp Products'}
                  placeholder="Enter button text"
                  type="text"
                  description="Text for Customize button"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Hero Customize Button') || contentItems.find(item => item.section === 'about' && item.title === 'Hero Customize 버튼')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Hero Browse Button Link"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Hero Browse Button Link')?.linkUrl || contentItems.find(item => item.section === 'about' && item.title === 'Hero Browse 버튼 링크')?.linkUrl || '/stickers'}
                  placeholder="Enter link URL (e.g., /stickers)"
                  type="url"
                  description="Link URL for Sticker Products button"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Hero Browse Button Link') || contentItems.find(item => item.section === 'about' && item.title === 'Hero Browse 버튼 링크')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Hero Customize Button Link"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Hero Customize Button Link')?.linkUrl || contentItems.find(item => item.section === 'about' && item.title === 'Hero Customize 버튼 링크')?.linkUrl || '/stamp'}
                  placeholder="Enter link URL (e.g., /stamp)"
                  type="url"
                  description="Link URL for Stamp Products button"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Hero Customize Button Link') || contentItems.find(item => item.section === 'about' && item.title === 'Hero Customize 버튼 링크')}
                  showNotification={showNotificationToast}
                />

                {/* Mission Section */}
                <QuickEditCard
                  title="Mission Section Title"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Mission Section Title')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Mission 섹션 제목')?.content || 'Our Mission'}
                  placeholder="Enter mission title"
                  type="text"
                  description="Title for Mission section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Mission Section Title') || contentItems.find(item => item.section === 'about' && item.title === 'Mission 섹션 제목')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Mission Section Description"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Mission Section Description')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Mission 섹션 설명')?.content || ''}
                  placeholder="Enter mission description"
                  type="text"
                  description="Description for Mission section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Mission Section Description') || contentItems.find(item => item.section === 'about' && item.title === 'Mission 섹션 설명')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Global Reach Title"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Global Reach Title')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Global Reach 제목')?.content || 'Global Reach'}
                  placeholder="Enter Global Reach title"
                  type="text"
                  description="Title for Global Reach card"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Global Reach Title') || contentItems.find(item => item.section === 'about' && item.title === 'Global Reach 제목')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Global Reach Description"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Global Reach Description')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Global Reach 설명')?.content || ''}
                  placeholder="Enter Global Reach description"
                  type="text"
                  description="Description for Global Reach card"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Global Reach Description') || contentItems.find(item => item.section === 'about' && item.title === 'Global Reach 설명')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Mission Innovation Title"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Mission Innovation Title')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Mission Innovation 제목')?.content || 'Innovation'}
                  placeholder="Enter Innovation title"
                  type="text"
                  description="Title for Innovation card in Mission section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Mission Innovation Title') || contentItems.find(item => item.section === 'about' && item.title === 'Mission Innovation 제목')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Mission Innovation Description"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Mission Innovation Description')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Mission Innovation 설명')?.content || ''}
                  placeholder="Enter Innovation description"
                  type="text"
                  description="Description for Innovation card in Mission section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Mission Innovation Description') || contentItems.find(item => item.section === 'about' && item.title === 'Mission Innovation 설명')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Sustainability Title"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Sustainability Title')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Sustainability 제목')?.content || 'Sustainability'}
                  placeholder="Enter Sustainability title"
                  type="text"
                  description="Title for Sustainability card"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Sustainability Title') || contentItems.find(item => item.section === 'about' && item.title === 'Sustainability 제목')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="Sustainability Description"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'Sustainability Description')?.content || contentItems.find(item => item.section === 'about' && item.title === 'Sustainability 설명')?.content || ''}
                  placeholder="Enter Sustainability description"
                  type="text"
                  description="Description for Sustainability card"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'Sustainability Description') || contentItems.find(item => item.section === 'about' && item.title === 'Sustainability 설명')}
                  showNotification={showNotificationToast}
                />

                {/* CTA Section */}
                <QuickEditCard
                  title="CTA Section Title"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'CTA Section Title')?.content || contentItems.find(item => item.section === 'about' && item.title === 'CTA 섹션 제목')?.content || 'Ready to Create?'}
                  placeholder="Enter CTA title"
                  type="text"
                  description="Title for CTA section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'CTA Section Title') || contentItems.find(item => item.section === 'about' && item.title === 'CTA 섹션 제목')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="CTA Section Description"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'CTA Section Description')?.content || contentItems.find(item => item.section === 'about' && item.title === 'CTA 섹션 설명')?.content || ''}
                  placeholder="Enter CTA description"
                  type="text"
                  description="Description for CTA section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'CTA Section Description') || contentItems.find(item => item.section === 'about' && item.title === 'CTA 섹션 설명')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="CTA Start Creating Button"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'CTA Start Creating Button')?.content || contentItems.find(item => item.section === 'about' && item.title === 'CTA Start Creating 버튼')?.content || 'Start Creating'}
                  placeholder="Enter button text"
                  type="text"
                  description="Text for Start Creating button"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'CTA Start Creating Button') || contentItems.find(item => item.section === 'about' && item.title === 'CTA Start Creating 버튼')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="CTA Browse Products Button"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'CTA Browse Products Button')?.content || contentItems.find(item => item.section === 'about' && item.title === 'CTA Browse Products 버튼')?.content || 'Browse Products'}
                  placeholder="Enter button text"
                  type="text"
                  description="Text for Browse Products button in CTA section"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'CTA Browse Products Button') || contentItems.find(item => item.section === 'about' && item.title === 'CTA Browse Products 버튼')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="CTA Start Creating Button Link"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'CTA Start Creating Button Link')?.linkUrl || contentItems.find(item => item.section === 'about' && item.title === 'CTA Start Creating 버튼 링크')?.linkUrl || '/phone-cases'}
                  placeholder="Enter link URL (e.g., /phone-cases)"
                  type="url"
                  description="Link URL for Phone Case button"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'CTA Start Creating Button Link') || contentItems.find(item => item.section === 'about' && item.title === 'CTA Start Creating 버튼 링크')}
                  showNotification={showNotificationToast}
                />
                <QuickEditCard
                  title="CTA Browse Products Button Link"
                  value={contentItems.find(item => item.section === 'about' && item.title === 'CTA Browse Products Button Link')?.linkUrl || contentItems.find(item => item.section === 'about' && item.title === 'CTA Browse Products 버튼 링크')?.linkUrl || '/hot-goods'}
                  placeholder="Enter link URL (e.g., /hot-goods)"
                  type="url"
                  description="Link URL for Hot Products button"
                  section="about"
                  onSave={handleQuickEditSave}
                  existingContent={contentItems.find(item => item.section === 'about' && item.title === 'CTA Browse Products Button Link') || contentItems.find(item => item.section === 'about' && item.title === 'CTA Browse Products 버튼 링크')}
                  showNotification={showNotificationToast}
                />
              </div>
            </div>
          </div>
        )}

          {/* Search and add button - Exclude Hero section */}
          {selectedSection !== 'hero' && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setEditingContent(null)
                    setIsModalOpen(true)
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
                >
                  <Plus size={18} />
                  <span>Add New Content</span>
                </button>
              </div>
            </div>
          )}

        {/* Newsletter Subscribers management */}
        {selectedSection === 'newsletter' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Newsletter Subscribers</h3>
                <p className="text-sm text-gray-600">Manage subscribers, deactivate/activate, and export CSV.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search email..."
                    value={newsletterSearch}
                    onChange={(e) => setNewsletterSearch(e.target.value)}
                    className="w-64 pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {newsletterSearch && (
                    <button
                      onClick={() => setNewsletterSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <input
                    type="checkbox"
                    id="newsletter-active-only"
                    checked={newsletterShowActiveOnly}
                    onChange={(e) => setNewsletterShowActiveOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="newsletter-active-only" className="text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                    Active only
                  </label>
                </div>
                <button
                  onClick={handleNewsletterExport}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {filteredNewsletterSubscribers.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-500">
                <p className="text-sm">No subscribers found.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Subscribed At</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Unsubscribed At</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedNewsletterSubscribers.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{sub.email}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              sub.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {sub.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {sub.subscribedAt ? new Date(sub.subscribedAt).toISOString().split('T')[0] : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {sub.unsubscribedAt ? new Date(sub.unsubscribedAt).toISOString().split('T')[0] : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleNewsletterToggle(sub.email, sub.isActive)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                  sub.isActive
                                    ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                    : 'text-green-700 bg-green-50 hover:bg-green-100'
                                }`}
                              >
                                {sub.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleNewsletterDelete(sub.id)}
                                className="px-3 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Newsletter Subscribers 페이지네이션 */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* 왼쪽: 정보 및 Rows per page */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-sm text-gray-700 font-medium">
                      {filteredNewsletterSubscribers.length === 0 
                        ? 'No subscribers found'
                        : `Showing ${(newsletterCurrentPage - 1) * newsletterPageSize + 1}-${Math.min(filteredNewsletterSubscribers.length, newsletterCurrentPage * newsletterPageSize)} of ${filteredNewsletterSubscribers.length}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Rows per page:</span>
                      <select
                        value={newsletterPageSize}
                        onChange={(e) => {
                          setNewsletterPageSize(Number(e.target.value))
                          setNewsletterCurrentPage(1)
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
                  {newsletterTotalPages > 1 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setNewsletterCurrentPage(1)}
                        disabled={newsletterCurrentPage === 1}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                        title="First page"
                      >
                        <ChevronsLeft size={16} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() => setNewsletterCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={newsletterCurrentPage === 1}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} className="text-gray-600" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, newsletterTotalPages) }, (_, i) => {
                          let pageNum: number
                          if (newsletterTotalPages <= 5) {
                            pageNum = i + 1
                          } else if (newsletterCurrentPage <= 3) {
                            pageNum = i + 1
                          } else if (newsletterCurrentPage >= newsletterTotalPages - 2) {
                            pageNum = newsletterTotalPages - 4 + i
                          } else {
                            pageNum = newsletterCurrentPage - 2 + i
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setNewsletterCurrentPage(pageNum)}
                              className={`px-3 py-1.5 text-sm border rounded-lg transition-colors bg-white ${
                                newsletterCurrentPage === pageNum
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
                        onClick={() => setNewsletterCurrentPage(prev => Math.min(newsletterTotalPages, prev + 1))}
                        disabled={newsletterCurrentPage === newsletterTotalPages}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() => setNewsletterCurrentPage(newsletterTotalPages)}
                        disabled={newsletterCurrentPage === newsletterTotalPages}
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
              </>
            )}
          </div>
        )}

        {/* 콘텐츠 목록 - Hero 섹션 제외 */}
        {selectedSection !== 'hero' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {allSections.find(s => s.id === selectedSection)?.name || 'Content'} ({filteredContent.length} items)
              </h3>
            </div>
            
            {filteredContent.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">No content found</p>
                <p className="text-sm">Add new content to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredContent.map((content) => (
                  <div key={content.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-medium text-gray-900">{content.title}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            content.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {content.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {content.type}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {content.content}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Created: {new Date(content.createdAt).toISOString().split('T')[0]}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleStatus(content.id)}
                          className={`p-2 rounded-lg ${
                            content.isActive 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={content.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {content.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleEdit(content)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>

        {/* 콘텐츠 편집 모달 */}
        {isModalOpen && (
          <ContentModal
            isOpen={isModalOpen}
            content={editingContent}
            section={selectedSection}
            onClose={() => {
              setIsModalOpen(false)
              setEditingContent(null)
            }}
            onSave={(data) => {
              if (editingContent) {
                updateContent(editingContent.id, data)
                showNotificationToast('success', 'Content has been updated.')
              } else {
                addContent({
                  ...data,
                  order: contentItems.filter(item => item.section === selectedSection).length + 1,
                  isActive: true
                })
                showNotificationToast('success', 'New content has been added.')
              }
              setIsModalOpen(false)
              setEditingContent(null)
            }}
          />
        )}
      </div>
    </AdminRoute>
  )
}
