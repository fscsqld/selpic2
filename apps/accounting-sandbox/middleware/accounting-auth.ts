/**
 * Accounting API Authentication Middleware
 * 
 * 회계 프로그램 API에 대한 권한 검증 미들웨어
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, requireAdmin, checkPermission } from '@/src/shared/auth/role-checker'
import { auditLogger } from '@/src/shared/logging/audit-logger'

/**
 * Require Super Admin for payroll operations
 */
export function requireSuperAdminForPayroll(request: NextRequest): NextResponse | null {
  const { allowed, role } = requireSuperAdmin(request)
  
  if (!allowed) {
    auditLogger.log('unauthorized_access', {
      resource: 'payroll',
      details: { attemptedRole: role },
      success: false,
      error: 'Super Admin access required',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })
    
    return NextResponse.json(
      { error: 'Forbidden: Super Admin access required' },
      { status: 403 }
    )
  }
  
  return null // Allow request
}

/**
 * Require Admin or Super Admin for order approval
 */
export function requireAdminForOrderApproval(request: NextRequest): NextResponse | null {
  const { allowed, role } = requireAdmin(request)
  
  if (!allowed) {
    auditLogger.log('unauthorized_access', {
      resource: 'order_approval',
      details: { attemptedRole: role },
      success: false,
      error: 'Admin access required',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })
    
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    )
  }
  
  return null // Allow request
}

/**
 * Check permission for accounting operations
 */
export function requireAccountingPermission(
  request: NextRequest,
  permission: string
): NextResponse | null {
  const { allowed, role } = checkPermission(request, permission)
  
  if (!allowed) {
    auditLogger.log('unauthorized_access', {
      resource: 'accounting',
      details: { attemptedRole: role, requiredPermission: permission },
      success: false,
      error: `Permission required: ${permission}`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })
    
    return NextResponse.json(
      { error: `Forbidden: Permission '${permission}' required` },
      { status: 403 }
    )
  }
  
  return null // Allow request
}
