'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, AlertTriangle, CheckCircle, Clock, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { getUpcomingDeadlines, TaxDeadline, BusinessProfile } from '@/src/features/compliance/tax-deadlines'
import { formatDateAustralian } from '@/lib/utils/date-format'

export function TaxDeadlineTracker() {
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>([])
  // Collapsible state - default to collapsed, but auto-expand if there are urgent/overdue deadlines
  const [isExpanded, setIsExpanded] = useState(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taxDeadlineTracker_expanded')
      return saved === 'true'
    }
    return false
  })

  // Load business profile and calculate deadlines
  useEffect(() => {
    loadProfileAndDeadlines()
  }, [])

  // Reload when business profile might have changed (listen to storage events)
  useEffect(() => {
    const handleStorageChange = () => {
      loadProfileAndDeadlines()
    }

    // Listen to custom events for business profile updates
    window.addEventListener('businessProfileUpdated', handleStorageChange)
    
    // Also check periodically (every 30 seconds) in case of cross-tab updates
    const interval = setInterval(loadProfileAndDeadlines, 30000)

    return () => {
      window.removeEventListener('businessProfileUpdated', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const loadProfileAndDeadlines = async () => {
    try {
      setIsLoading(true)
      const profile = await indexedDBStorage.getBusinessProfile()
      setBusinessProfile(profile)

      if (profile) {
        const upcomingDeadlines = getUpcomingDeadlines(profile)
        setDeadlines(upcomingDeadlines)
      } else {
        setDeadlines([])
      }
    } catch (err) {
      console.error('Failed to load business profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Group deadlines by urgency
  const groupedDeadlines = useMemo(() => {
    const urgent: TaxDeadline[] = []
    const dueSoon: TaxDeadline[] = []
    const upcoming: TaxDeadline[] = []
    const overdue: TaxDeadline[] = []

    deadlines.forEach(deadline => {
      if (deadline.daysRemaining < 0) {
        overdue.push(deadline)
      } else if (deadline.daysRemaining <= 7) {
        urgent.push(deadline)
      } else if (deadline.daysRemaining <= 14) {
        dueSoon.push(deadline)
      } else {
        upcoming.push(deadline)
      }
    })

    return { urgent, dueSoon, upcoming, overdue }
  }, [deadlines])

  // Auto-expand if there are urgent or overdue deadlines
  useEffect(() => {
    if (deadlines.length > 0 && (groupedDeadlines.urgent.length > 0 || groupedDeadlines.overdue.length > 0)) {
      setIsExpanded(true)
    }
  }, [deadlines, groupedDeadlines.urgent.length, groupedDeadlines.overdue.length])

  // Save expanded state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taxDeadlineTracker_expanded', isExpanded.toString())
    }
  }, [isExpanded])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const getBadgeColor = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return 'bg-gray-100 text-gray-800 border-gray-300'
    } else if (daysRemaining <= 7) {
      return 'bg-red-100 text-red-800 border-red-300'
    } else if (daysRemaining <= 14) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    } else {
      return 'bg-green-100 text-green-800 border-green-300'
    }
  }

  const getBadgeText = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return 'OVERDUE'
    } else if (daysRemaining <= 7) {
      return 'URGENT'
    } else if (daysRemaining <= 14) {
      return 'DUE SOON'
    } else {
      return 'UPCOMING'
    }
  }

  const getBadgeIcon = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return <AlertTriangle className="w-4 h-4" />
    } else if (daysRemaining <= 7) {
      return <AlertTriangle className="w-4 h-4" />
    } else if (daysRemaining <= 14) {
      return <Clock className="w-4 h-4" />
    } else {
      return <CheckCircle className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="card mb-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Check if profile is incomplete
  const isProfileIncomplete = !businessProfile || 
    !businessProfile.companyName || 
    !businessProfile.abn || 
    !businessProfile.gstReportingCycle || 
    !businessProfile.paygReportingCycle

  if (!businessProfile || isProfileIncomplete) {
    return (
      <div className={`card mb-8 ${isProfileIncomplete ? 'bg-orange-50 border-orange-200' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Tax Deadline Tracker</h2>
        </div>
        <div className={`p-6 ${isProfileIncomplete ? 'bg-orange-100 border border-orange-300' : 'bg-blue-50 border border-blue-200'} rounded-lg text-center`}>
          <Calendar className={`w-12 h-12 mx-auto mb-3 ${isProfileIncomplete ? 'text-orange-400' : 'text-blue-400'}`} />
          <p className={`font-medium mb-2 ${isProfileIncomplete ? 'text-orange-800' : 'text-gray-700'}`}>
            {isProfileIncomplete 
              ? 'Business Profile Incomplete' 
              : 'Complete your Business Profile in Settings to track tax deadlines'}
          </p>
          <p className={`text-sm mb-4 ${isProfileIncomplete ? 'text-orange-700' : 'text-gray-600'}`}>
            {isProfileIncomplete
              ? 'Please complete your Business Profile to enable accurate tax deadline tracking.'
              : 'Go to Settings → Business Profile to enter your company details and reporting cycles'}
          </p>
          {isProfileIncomplete && (
            <button
              onClick={() => {
                // Trigger Settings modal open (dispatch custom event)
                window.dispatchEvent(new CustomEvent('openSettings'))
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <FileText className="w-4 h-4" />
              Complete Profile Now
            </button>
          )}
        </div>
      </div>
    )
  }

  if (deadlines.length === 0) {
    return (
      <div className="card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Tax Deadline Tracker</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>No upcoming deadlines found</p>
        </div>
      </div>
    )
  }

  // Count total deadlines for summary
  const totalDeadlines = deadlines.length
  const urgentCount = groupedDeadlines.urgent.length + groupedDeadlines.overdue.length

  return (
    <div className="card mb-8">
      {/* Header with Collapse Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Tax Deadline Tracker</h2>
          {totalDeadlines > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {totalDeadlines} {totalDeadlines === 1 ? 'deadline' : 'deadlines'}
            </span>
          )}
          {urgentCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {urgentCount} urgent
            </span>
          )}
        </div>
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <span className="text-xs font-medium">{isExpanded ? 'Hide' : 'Show'}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-4">

      {/* Overdue Deadlines */}
      {groupedDeadlines.overdue.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Overdue
          </h3>
          <div className="space-y-2">
            {groupedDeadlines.overdue.map((deadline, index) => (
              <DeadlineCard
                key={`${deadline.type}-${deadline.period}-${index}`}
                deadline={deadline}
                badgeColor={getBadgeColor(deadline.daysRemaining)}
                badgeText={getBadgeText(deadline.daysRemaining)}
                badgeIcon={getBadgeIcon(deadline.daysRemaining)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Urgent Deadlines */}
      {groupedDeadlines.urgent.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Urgent (≤ 7 days)
          </h3>
          <div className="space-y-2">
            {groupedDeadlines.urgent.map((deadline, index) => (
              <DeadlineCard
                key={`${deadline.type}-${deadline.period}-${index}`}
                deadline={deadline}
                badgeColor={getBadgeColor(deadline.daysRemaining)}
                badgeText={getBadgeText(deadline.daysRemaining)}
                badgeIcon={getBadgeIcon(deadline.daysRemaining)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Due Soon Deadlines */}
      {groupedDeadlines.dueSoon.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            Due Soon (8-14 days)
          </h3>
          <div className="space-y-2">
            {groupedDeadlines.dueSoon.map((deadline, index) => (
              <DeadlineCard
                key={`${deadline.type}-${deadline.period}-${index}`}
                deadline={deadline}
                badgeColor={getBadgeColor(deadline.daysRemaining)}
                badgeText={getBadgeText(deadline.daysRemaining)}
                badgeIcon={getBadgeIcon(deadline.daysRemaining)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {groupedDeadlines.upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Upcoming (&gt; 14 days)
          </h3>
          <div className="space-y-2">
            {groupedDeadlines.upcoming.map((deadline, index) => (
              <DeadlineCard
                key={`${deadline.type}-${deadline.period}-${index}`}
                deadline={deadline}
                badgeColor={getBadgeColor(deadline.daysRemaining)}
                badgeText={getBadgeText(deadline.daysRemaining)}
                badgeIcon={getBadgeIcon(deadline.daysRemaining)}
              />
            ))}
          </div>
        </div>
      )}
        </div>
      )}

      {/* Collapsed Summary View */}
      {!isExpanded && totalDeadlines > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {urgentCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-600">
                    {urgentCount} urgent deadline{urgentCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {groupedDeadlines.dueSoon.length > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">
                    {groupedDeadlines.dueSoon.length} due soon
                  </span>
                </div>
              )}
              {groupedDeadlines.upcoming.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    {groupedDeadlines.upcoming.length} upcoming
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={toggleExpanded}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface DeadlineCardProps {
  deadline: TaxDeadline
  badgeColor: string
  badgeText: string
  badgeIcon: React.ReactNode
}

function DeadlineCard({ deadline, badgeColor, badgeText, badgeIcon }: DeadlineCardProps) {
  // dueDate is already an ISO string, so we just need to extract the date part
  const dueDateStr = typeof deadline.dueDate === 'string' 
    ? deadline.dueDate.split('T')[0] 
    : new Date(deadline.dueDate).toISOString().split('T')[0]
  const dueDateFormatted = formatDateAustralian(dueDateStr)
  const daysText = deadline.daysRemaining < 0
    ? `${Math.abs(deadline.daysRemaining)} days overdue`
    : deadline.daysRemaining === 0
    ? 'Due today'
    : deadline.daysRemaining === 1
    ? '1 day remaining'
    : `${deadline.daysRemaining} days remaining`

  // Get display label for deadline type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'BAS':
        return 'BAS (GST)'
      case 'PAYG':
        return 'PAYG Withholding'
      case 'INCOME_TAX':
        return 'Income Tax Return'
      case 'FBT':
        return 'FBT Return'
      default:
        return type
    }
  }

  // Get icon for deadline type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BAS':
        return <FileText className="w-4 h-4" />
      case 'PAYG':
        return <FileText className="w-4 h-4" />
      case 'INCOME_TAX':
        return <FileText className="w-4 h-4" />
      case 'FBT':
        return <FileText className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${badgeColor}`}>
              {badgeIcon}
              {badgeText}
            </span>
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              {getTypeIcon(deadline.type)}
              {getTypeLabel(deadline.type)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Period: {deadline.period}
          </p>
          <p className="text-sm text-gray-500">
            Due: {dueDateFormatted}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${
            deadline.daysRemaining < 0
              ? 'text-red-600'
              : deadline.daysRemaining <= 7
              ? 'text-red-600'
              : deadline.daysRemaining <= 14
              ? 'text-yellow-600'
              : 'text-green-600'
          }`}>
            {daysText}
          </p>
        </div>
      </div>
    </div>
  )
}
