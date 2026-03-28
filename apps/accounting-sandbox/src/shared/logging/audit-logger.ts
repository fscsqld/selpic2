/**
 * Audit Logger - 모든 주요 작업에 대한 로깅
 * 
 * 문제 발생 시 즉시 추적 가능하도록 로그 저장
 */

export interface AuditLog {
  id: string
  timestamp: string
  action: string
  userId?: string
  userRole?: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  success: boolean
  error?: string
  ipAddress?: string
  userAgent?: string
}

class AuditLogger {
  private logs: AuditLog[] = []
  private maxLogs = 1000 // 최대 로그 수

  /**
   * Log an action
   */
  log(
    action: string,
    data: {
      userId?: string
      userRole?: string
      resource: string
      resourceId?: string
      details?: Record<string, any>
      success?: boolean
      error?: string
      ipAddress?: string
      userAgent?: string
    }
  ): void {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      userId: data.userId,
      userRole: data.userRole,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details || {},
      success: data.success !== false,
      error: data.error,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }

    this.logs.push(log)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      const emoji = log.success ? '✅' : '❌'
      console.log(`${emoji} [Audit] ${action}`, {
        resource: log.resource,
        resourceId: log.resourceId,
        success: log.success,
        error: log.error,
      })
    }

    // TODO: Save to IndexedDB for persistence
    this.saveToStorage(log).catch(err => {
      console.error('[Audit Logger] Failed to save log:', err)
    })
  }

  /**
   * Save log to IndexedDB
   */
  private async saveToStorage(log: AuditLog): Promise<void> {
    try {
      // TODO: Implement IndexedDB storage
      // For now, just store in memory
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('audit_logs')
        const logs = stored ? JSON.parse(stored) : []
        logs.push(log)
        // Keep only last 100 logs in localStorage
        const recentLogs = logs.slice(-100)
        localStorage.setItem('audit_logs', JSON.stringify(recentLogs))
      }
    } catch (err) {
      console.error('[Audit Logger] Storage error:', err)
    }
  }

  /**
   * Get logs for a resource
   */
  getLogs(resource: string, resourceId?: string): AuditLog[] {
    return this.logs.filter(log => {
      if (log.resource !== resource) return false
      if (resourceId && log.resourceId !== resourceId) return false
      return true
    })
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 50): AuditLog[] {
    return this.logs.slice(-limit).reverse()
  }

  /**
   * Get error logs
   */
  getErrorLogs(): AuditLog[] {
    return this.logs.filter(log => !log.success)
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('audit_logs')
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger()
