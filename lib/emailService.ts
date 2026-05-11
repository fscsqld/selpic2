// Email service for sending responses to customers
// This is a client-side email service using EmailJS with tracking capabilities

import { emailTrackingService, TrackedEmailTemplate } from './emailTrackingService'
import {
  appendTransactionalEmailBrandingHtml,
  appendTransactionalEmailBrandingPlainText
} from './transactionalEmailBranding'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  category: 'general' | 'order' | 'technical' | 'business' | 'complaint'
}

export interface EmailResponse {
  success: boolean
  message: string
  messageId?: string
  emailId?: string
  trackingId?: string
}

export type EmailAttachment = {
  filename: string
  content: string
  contentType?: string
}

// Default email templates
export const emailTemplates: EmailTemplate[] = [
  {
    id: 'general_thanks',
    name: 'General Thank You',
    subject: 'Thank you for contacting Selpic',
    content: `Dear {{customerName}},

Thank you for reaching out to Selpic. We have received your message and appreciate you taking the time to contact us.

Your inquiry: {{originalSubject}}

We will review your message and get back to you within 24 hours. If you have any urgent concerns, please don't hesitate to contact us directly.

Best regards,
Selpic Customer Support Team

---
This is a response to your inquiry submitted on {{submissionDate}}.`,
    category: 'general'
  },
  {
    id: 'order_inquiry',
    name: 'Order Inquiry Response',
    subject: 'Re: Your Order Inquiry - Selpic',
    content: `Dear {{customerName}},

Thank you for your order-related inquiry. We understand how important it is to keep you informed about your order status.

Your inquiry: {{originalSubject}}

Our team is looking into your request and will provide you with detailed information about your order shortly. You can also track your order status on our website using your order number.

If you need immediate assistance, please contact us at info@selpic.com.au.

Best regards,
Selpic Order Management Team`,
    category: 'order'
  },
  {
    id: 'technical_support',
    name: 'Technical Support Response',
    subject: 'Technical Support - Selpic',
    content: `Dear {{customerName}},

Thank you for contacting Selpic technical support. We understand you're experiencing some technical difficulties.

Your inquiry: {{originalSubject}}

Our technical team has received your request and is working on a solution. We'll provide you with step-by-step instructions or arrange additional support if needed.

Expected response time: Within 4-6 hours during business hours.

Technical Support Team
Selpic`,
    category: 'technical'
  },
  {
    id: 'business_inquiry',
    name: 'Business Partnership Response',
    subject: 'Business Partnership Inquiry - Selpic',
    content: `Dear {{customerName}},

Thank you for your interest in partnering with Selpic. We're excited to learn about potential collaboration opportunities.

Your inquiry: {{originalSubject}}

Our business development team will review your proposal and contact you within 2-3 business days to discuss next steps.

Please feel free to reach out if you have any additional information to share in the meantime.

Best regards,
Selpic Business Development Team`,
    category: 'business'
  },
  {
    id: 'complaint_response',
    name: 'Complaint Resolution Response',
    subject: 'Your Concern - We\'re Here to Help - Selpic',
    content: `Dear {{customerName}},

Thank you for bringing your concern to our attention. We take all customer feedback seriously and are committed to resolving any issues you may have experienced.

Your concern: {{originalSubject}}

We sincerely apologize for any inconvenience this may have caused. Our customer care team is investigating this matter and will work diligently to find a satisfactory resolution.

You can expect to hear from us within 24 hours with an update on our progress.

Thank you for giving us the opportunity to make this right.

Sincerely,
Selpic Customer Care Team`,
    category: 'complaint'
  }
]

// Email service class
export class EmailService {
  private static instance: EmailService
  private isInitialized = false

  // EmailJS configuration (you'll need to set these up)
  private serviceId = 'your_service_id'
  private templateId = 'your_template_id'
  private publicKey = 'your_public_key'

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  // Initialize EmailJS (call this once in your app)
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // In a real implementation, you would initialize EmailJS here
      // emailjs.init(this.publicKey)
      this.isInitialized = true
      console.log('Email service initialized')
    } catch (error) {
      console.error('Failed to initialize email service:', error)
      throw new Error('Email service initialization failed')
    }
  }

  // Send email response to customer with tracking
  async sendResponse(params: {
    customerEmail: string
    customerName: string
    subject: string
    message: string
    /** When set, sent as HTML instead of escaping `message` (tracking pixel + link wrapping still applied). */
    html?: string
    /** For admin dashboard logging (optional). */
    templateUsed?: string
    originalSubject?: string
    submissionDate?: string
    adminName?: string
    messageId?: string
    attachments?: File[]
    /** When true, do not append shared signature / logo / confidentiality. */
    skipBranding?: boolean
  }): Promise<EmailResponse> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Generate unique email ID for tracking
      const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Initialize tracking
      const tracking = emailTrackingService.initializeTracking({
        emailId,
        messageId: params.messageId || 'unknown',
        customerEmail: params.customerEmail
      })

      const escapeHtml = (s: string) =>
        s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')

      const withBranding = !params.skipBranding
      let plainForSend = params.message || ''
      let htmlForSend = params.html && params.html.trim().length > 0 ? params.html : ''

      if (withBranding) {
        plainForSend = appendTransactionalEmailBrandingPlainText(plainForSend)
        if (htmlForSend) {
          htmlForSend = appendTransactionalEmailBrandingHtml(htmlForSend)
        }
      }

      // Full HTML or plaintext → HTML for Resend (shared transactional footer already applied when withBranding).
      const baseHtml =
        htmlForSend && htmlForSend.trim().length > 0
          ? htmlForSend
          : (() => {
              const escaped = escapeHtml(plainForSend)
              return `<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #111; white-space: pre-wrap;">${escaped}</div>`
            })()

      const trackedHtml = TrackedEmailTemplate.addTrackingToContent(baseHtml, emailId)

      const fileToBase64 = async (file: File): Promise<string> => {
        const buf = await file.arrayBuffer()
        let binary = ''
        const bytes = new Uint8Array(buf)
        const chunkSize = 0x8000
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
        }
        return btoa(binary)
      }

      let attachments: EmailAttachment[] | undefined = undefined
      if (params.attachments && params.attachments.length > 0) {
        const safe = params.attachments.filter((f) => f && f.size > 0)
        if (safe.length > 0) {
          attachments = await Promise.all(
            safe.map(async (f) => ({
              filename: f.name || 'attachment',
              contentType: f.type || undefined,
              content: await fileToBase64(f)
            }))
          )
        }
      }

      const { sendAdminComposeEmailAction } = await import('@/app/actions/emails')
      const sendResult = await sendAdminComposeEmailAction({
        to: params.customerEmail,
        subject: params.subject,
        html: trackedHtml,
        skipBranding: true,
        skipTracking: true,
        contactMessageId: params.messageId,
        contentText: params.message,
        templateUsed: params.templateUsed,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      })

      if (!sendResult.ok) {
        throw new Error(sendResult.error || 'Failed to send email')
      }

      // Mark delivery as done for in-app tracking UI.
      emailTrackingService.recordDelivery(emailId)

      return {
        success: true,
        message: 'Email sent successfully',
        messageId: `msg_${Date.now()}`,
        emailId,
        trackingId: tracking.trackingPixelId
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email'
      }
    }
  }

  // Send email using template
  async sendTemplateResponse(params: {
    customerEmail: string
    customerName: string
    templateId: string
    variables?: Record<string, string>
    adminName?: string
    messageId?: string
    attachments?: File[]
  }): Promise<EmailResponse> {
    const template = emailTemplates.find(t => t.id === params.templateId)
    if (!template) {
      return {
        success: false,
        message: 'Template not found'
      }
    }

    // Replace template variables
    let subject = template.subject
    let content = template.content
    
    const variables = {
      customerName: params.customerName,
      adminName: params.adminName || 'Selpic Support Team',
      submissionDate: new Date().toLocaleDateString(),
      ...params.variables
    }

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      content = content.replace(new RegExp(placeholder, 'g'), value)
    })

    return this.sendResponse({
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      subject,
      message: content,
      adminName: params.adminName,
      messageId: params.messageId,
      templateUsed: template.name,
      attachments: params.attachments
    })
  }

  // Get templates by category
  getTemplatesByCategory(category: string): EmailTemplate[] {
    return emailTemplates.filter(template => template.category === category)
  }

  // Get all templates
  getAllTemplates(): EmailTemplate[] {
    return emailTemplates
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance()

// Types for email history
export interface EmailHistory {
  id: string
  messageId: string
  customerEmail: string
  customerName: string
  subject: string
  content: string
  sentAt: Date
  sentBy: string
  templateUsed?: string
  attachments?: string
  status: 'sent' | 'failed' | 'pending'
  emailId?: string
  trackingId?: string
  deliveryStatus?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced'
  openCount?: number
  clickCount?: number
  lastOpenedAt?: Date
}

// Email history store (you might want to integrate this with your message store)
export class EmailHistoryService {
  private static instance: EmailHistoryService
  private history: EmailHistory[] = []

  static getInstance(): EmailHistoryService {
    if (!EmailHistoryService.instance) {
      EmailHistoryService.instance = new EmailHistoryService()
    }
    return EmailHistoryService.instance
  }

  addToHistory(entry: Omit<EmailHistory, 'id' | 'sentAt'>): void {
    const historyEntry: EmailHistory = {
      ...entry,
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentAt: new Date()
    }
    this.history.unshift(historyEntry)
  }

  getHistoryForMessage(messageId: string): EmailHistory[] {
    return this.history.filter(entry => entry.messageId === messageId)
  }

  getAllHistory(): EmailHistory[] {
    return this.history
  }
}

export const emailHistoryService = EmailHistoryService.getInstance()
