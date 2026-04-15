// Email tracking service for monitoring email delivery and engagement

export interface EmailTracking {
  emailId: string
  messageId: string
  customerEmail: string
  trackingPixelId: string
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
  sentAt: Date
  deliveredAt?: Date
  openedAt?: Date
  lastOpenedAt?: Date
  openCount: number
  clickCount: number
  userAgent?: string
  ipAddress?: string
  location?: string
  device?: string
  bounceReason?: string
  events: EmailEvent[]
}

export interface EmailEvent {
  id: string
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed'
  timestamp: Date
  data?: Record<string, any>
}

export interface EmailDeliveryStats {
  totalSent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  openRate: number
  clickRate: number
  bounceRate: number
}

// Email tracking service
export class EmailTrackingService {
  private static instance: EmailTrackingService
  private trackingData: Map<string, EmailTracking> = new Map()

  static getInstance(): EmailTrackingService {
    if (!EmailTrackingService.instance) {
      EmailTrackingService.instance = new EmailTrackingService()
    }
    return EmailTrackingService.instance
  }

  // Generate tracking pixel URL
  generateTrackingPixel(emailId: string): string {
    const trackingPixelId = `pixel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const baseUrl = this.getBaseUrl()
    return `${baseUrl}/api/email-tracking/pixel/${trackingPixelId}?emailId=${emailId}`
  }

  // Generate tracked link
  generateTrackedLink(emailId: string, originalUrl: string, linkName: string = 'default'): string {
    const baseUrl = this.getBaseUrl()
    const encodedUrl = encodeURIComponent(originalUrl)
    return `${baseUrl}/api/email-tracking/click/${emailId}?url=${encodedUrl}&link=${linkName}`
  }

  private getBaseUrl(): string {
    const envSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
    if (envSiteUrl) return envSiteUrl.replace(/\/$/, '')

    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      // In production, force https links for tracking assets.
      if (origin.startsWith('http://') && !origin.includes('localhost')) {
        return origin.replace('http://', 'https://')
      }
      return origin
    }

    return 'https://selpic2.vercel.app'
  }

  // Initialize tracking for new email
  initializeTracking(params: {
    emailId: string
    messageId: string
    customerEmail: string
  }): EmailTracking {
    const trackingPixelId = `pixel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const tracking: EmailTracking = {
      emailId: params.emailId,
      messageId: params.messageId,
      customerEmail: params.customerEmail,
      trackingPixelId,
      status: 'sent',
      sentAt: new Date(),
      openCount: 0,
      clickCount: 0,
      events: [{
        id: `event_${Date.now()}`,
        type: 'sent',
        timestamp: new Date()
      }]
    }

    this.trackingData.set(params.emailId, tracking)
    return tracking
  }

  // Record email delivery
  recordDelivery(emailId: string): void {
    const tracking = this.trackingData.get(emailId)
    if (tracking) {
      tracking.status = 'delivered'
      tracking.deliveredAt = new Date()
      tracking.events.push({
        id: `event_${Date.now()}`,
        type: 'delivered',
        timestamp: new Date()
      })
      this.trackingData.set(emailId, tracking)
    }
  }

  // Record email open
  recordOpen(emailId: string, userAgent?: string, ipAddress?: string): void {
    const tracking = this.trackingData.get(emailId)
    if (tracking) {
      const now = new Date()
      
      if (tracking.openCount === 0) {
        tracking.openedAt = now
        tracking.status = 'opened'
      }
      
      tracking.lastOpenedAt = now
      tracking.openCount += 1
      tracking.userAgent = userAgent
      tracking.ipAddress = ipAddress

      // Detect device type from user agent
      if (userAgent) {
        tracking.device = this.detectDevice(userAgent)
      }

      tracking.events.push({
        id: `event_${Date.now()}`,
        type: 'opened',
        timestamp: now,
        data: { userAgent, ipAddress, device: tracking.device }
      })
      
      this.trackingData.set(emailId, tracking)
    }
  }

  // Record link click
  recordClick(emailId: string, linkName: string, userAgent?: string): void {
    const tracking = this.trackingData.get(emailId)
    if (tracking) {
      tracking.clickCount += 1
      tracking.status = 'clicked'
      
      tracking.events.push({
        id: `event_${Date.now()}`,
        type: 'clicked',
        timestamp: new Date(),
        data: { linkName, userAgent }
      })
      
      this.trackingData.set(emailId, tracking)
    }
  }

  // Record bounce
  recordBounce(emailId: string, reason: string): void {
    const tracking = this.trackingData.get(emailId)
    if (tracking) {
      tracking.status = 'bounced'
      tracking.bounceReason = reason
      
      tracking.events.push({
        id: `event_${Date.now()}`,
        type: 'bounced',
        timestamp: new Date(),
        data: { reason }
      })
      
      this.trackingData.set(emailId, tracking)
    }
  }

  // Get tracking data for specific email
  getTracking(emailId: string): EmailTracking | undefined {
    return this.trackingData.get(emailId)
  }

  // Get tracking data for message
  getTrackingByMessage(messageId: string): EmailTracking[] {
    return Array.from(this.trackingData.values()).filter(
      tracking => tracking.messageId === messageId
    )
  }

  // Get delivery statistics
  getDeliveryStats(messageId?: string): EmailDeliveryStats {
    let trackingList: EmailTracking[]
    
    if (messageId) {
      trackingList = this.getTrackingByMessage(messageId)
    } else {
      trackingList = Array.from(this.trackingData.values())
    }

    const totalSent = trackingList.length
    const delivered = trackingList.filter(t => ['delivered', 'opened', 'clicked'].includes(t.status)).length
    const opened = trackingList.filter(t => t.openCount > 0).length
    const clicked = trackingList.filter(t => t.clickCount > 0).length
    const bounced = trackingList.filter(t => t.status === 'bounced').length

    return {
      totalSent,
      delivered,
      opened,
      clicked,
      bounced,
      openRate: totalSent > 0 ? (opened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (clicked / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0
    }
  }

  // Detect device from user agent
  private detectDevice(userAgent: string): string {
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet'
    } else {
      return 'Desktop'
    }
  }

  // Get all tracking data
  getAllTracking(): EmailTracking[] {
    return Array.from(this.trackingData.values())
  }

  // Clear tracking data (for cleanup)
  clearTracking(): void {
    this.trackingData.clear()
  }
}

// Email template with tracking
export class TrackedEmailTemplate {
  static addTrackingToContent(content: string, emailId: string): string {
    const trackingService = EmailTrackingService.getInstance()
    
    // Add tracking pixel at the end of content
    const trackingPixelUrl = trackingService.generateTrackingPixel(emailId)
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`
    
    // Add tracking to links
    let trackedContent = content.replace(
      /<a\s+href="([^"]+)"([^>]*)>/gi,
      (match, url, attributes) => {
        if (url.startsWith('http') || url.startsWith('mailto:')) {
          const trackedUrl = trackingService.generateTrackedLink(emailId, url)
          return `<a href="${trackedUrl}"${attributes}>`
        }
        return match
      }
    )

    // Add tracking pixel
    trackedContent += trackingPixel
    
    return trackedContent
  }
}

// Export singleton instance
export const emailTrackingService = EmailTrackingService.getInstance()

// Email status display helpers
export const getStatusColor = (status: EmailTracking['status']) => {
  switch (status) {
    case 'sent': return 'bg-blue-100 text-blue-800'
    case 'delivered': return 'bg-green-100 text-green-800'
    case 'opened': return 'bg-purple-100 text-purple-800'
    case 'clicked': return 'bg-indigo-100 text-indigo-800'
    case 'bounced': return 'bg-red-100 text-red-800'
    case 'failed': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export const getStatusText = (status: EmailTracking['status']) => {
  switch (status) {
    case 'sent': return 'Sent'
    case 'delivered': return 'Delivered'
    case 'opened': return 'Opened'
    case 'clicked': return 'Engaged'
    case 'bounced': return 'Bounced'
    case 'failed': return 'Failed'
    default: return 'Unknown'
  }
}
