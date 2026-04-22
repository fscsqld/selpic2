/**
 * Invoice Validation Utilities
 * 
 * Validates invoice generation to prevent duplicate billing cycles
 * and ensure plan consistency for Selpic A
 */

export interface InvoiceValidationContext {
  customerEmail: string
  customerId?: string
  billingCycleStart: string // YYYY-MM-DD format
  billingCycleEnd: string // YYYY-MM-DD format
  invoiceType: 'fixed-rate' | 'usage-based'
  planType?: 'Pro' | 'Basic' | 'Enterprise' | string
  invoiceNumber?: string
  orderId?: string
}

export interface InvoiceValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  criticalWarnings: string[]
}

/**
 * Critical Warning Logger
 * Logs critical warnings that administrators should review
 */
class CriticalWarningLogger {
  private static warnings: Array<{
    timestamp: string
    type: 'duplicate-cycle' | 'plan-inconsistency' | 'billing-error'
    message: string
    context: InvoiceValidationContext
  }> = []

  static log(type: 'duplicate-cycle' | 'plan-inconsistency' | 'billing-error', message: string, context: InvoiceValidationContext) {
    const warning = {
      timestamp: new Date().toISOString(),
      type,
      message,
      context
    }
    
    this.warnings.push(warning)
    
    // Console log with critical warning prefix
    console.error('🚨 [CRITICAL WARNING]', {
      type,
      message,
      timestamp: warning.timestamp,
      context: {
        customerEmail: context.customerEmail,
        billingCycle: `${context.billingCycleStart} to ${context.billingCycleEnd}`,
        invoiceType: context.invoiceType,
        planType: context.planType
      }
    })
    
    // Store in localStorage for admin review (last 50 warnings)
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('selpic-critical-warnings')
        const existing = stored ? JSON.parse(stored) : []
        const updated = [warning, ...existing].slice(0, 50) // Keep last 50
        localStorage.setItem('selpic-critical-warnings', JSON.stringify(updated))
      } catch (err) {
        console.error('Failed to store critical warning:', err)
      }
    }
  }

  static getWarnings(limit: number = 50): typeof this.warnings {
    return this.warnings.slice(0, limit)
  }

  static clearWarnings() {
    this.warnings = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selpic-critical-warnings')
    }
  }
}

/**
 * Validate invoice period to prevent duplicates
 */
export function validateInvoicePeriod(
  context: InvoiceValidationContext,
  existingInvoices: Array<{
    customerEmail: string
    billingCycleStart?: string
    billingCycleEnd?: string
    invoiceType?: string
    invoiceNumber?: string
  }>
): InvoiceValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const criticalWarnings: string[] = []

  // Check for duplicate billing cycle
  const duplicateInvoice = existingInvoices.find(inv => {
    // Match by customer email and billing cycle dates
    const emailMatch = inv.customerEmail === context.customerEmail
    const cycleMatch = inv.billingCycleStart === context.billingCycleStart &&
                       inv.billingCycleEnd === context.billingCycleEnd
    
    // Exclude the current invoice if invoiceNumber is provided
    const isNotCurrent = !context.invoiceNumber || inv.invoiceNumber !== context.invoiceNumber
    
    return emailMatch && cycleMatch && isNotCurrent
  })

  if (duplicateInvoice) {
    const message = `Duplicate billing cycle detected: Invoice for period ${context.billingCycleStart} to ${context.billingCycleEnd} already exists for customer ${context.customerEmail}. Existing invoice: ${duplicateInvoice.invoiceNumber || 'N/A'}`
    
    criticalWarnings.push(message)
    CriticalWarningLogger.log('duplicate-cycle', message, context)
    
    errors.push('A duplicate invoice would be created for this billing period. Please review existing invoices.')
  }

  // Validate plan consistency
  if (context.planType === 'Pro' && context.invoiceType === 'usage-based') {
    const message = `Plan inconsistency detected: Customer ${context.customerEmail} is on a fixed-rate Pro plan but a usage-based invoice is being generated for period ${context.billingCycleStart} to ${context.billingCycleEnd}`
    
    criticalWarnings.push(message)
    CriticalWarningLogger.log('plan-inconsistency', message, context)
    
    errors.push('Fixed-rate plan customers should not receive usage-based invoices. Please verify the customer\'s plan type.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    criticalWarnings
  }
}

/**
 * Get critical warnings for admin review
 */
export function getCriticalWarnings(limit: number = 50) {
  return CriticalWarningLogger.getWarnings(limit)
}

/**
 * Clear critical warnings
 */
export function clearCriticalWarnings() {
  CriticalWarningLogger.clearWarnings()
}
